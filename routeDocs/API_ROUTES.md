# API ROUTES - [`apiRoutes.js`](../server/routes/apiRoutes.js) BREAKDOWN

[`apiRoutes.js`](../server/routes/apiRoutes.js) is the Express router that sits between the React frontend and the **Langbly** translation API. The browser never talks to Langbly directly. It calls this server, and this server adds the secret API key, validates the input, forwards the request, and turns Langbly's answer (or error) into a clean response.

```
React (TranslateForm)  ──►  /api/language/translate/v2/...  ──►  Langbly API
       ▲                        (this router)                       │
       └────────────── clean JSON / safe error message ◄────────────┘
```

---

## TABLE OF CONTENTS
1. [ROUTE SUMMARY](#1-route-summary)
     - [1.1. GET `/language/translate/v2/languages`](#11-get-languagetranslatev2languages)
     - [1.2. POST `/language/translate/v2`](#12-post-languagetranslatev2)
     - [1.3. POST `/language/translate/v2/detect`](#13-post-languagetranslatev2detect)
2. [IMPORTS AND SETUP](#2-imports-and-setup)
3. [CONNECTION SETUP](#3-connection-setup)
     - [3.1. CONNECTION SETTINGS](#31-connection-settings)
     - [3.2. CONSTRAINTS](#32-constraints)
          - [3.2.1. TIMEOUT (ABORTSIGNAL)](#321-timeout-abortsignal)
          - [3.2.2. LANGUAGES CACHE](#322-languages-cache)
          - [3.2.3. NODE VERSION](#323-node-version)
     - [3.3. ERROR HANDLING](#33-error-handling)
          - [3.3.1. LANGBLYERROR CLASS](#331-langblyerror-class)
          - [3.3.2. LANGBLY STATUS MAPPING](#332-langbly-status-mapping)
          - [3.3.3. ERROR HANDLING FLOW](#333-error-handling-flow)
4. [UTILITY FUNCTIONS](#4-utility-functions)
     - [4.1. `LANGUAGE_NAMES`](#41-language_names)
     - [4.2. `langblyRequest()`](#42-langblyrequest)
     - [4.3. `clientAbortSignal()`](#43-clientabortsignal)
     - [4.4. `sendError()`](#44-senderror)
     - [4.5. `checkSourceText()`](#45-checksourcetext)
5. [SECURITY](#5-security)
     - [5.1. PACKAGES](#51-packages)
     - [5.2. MIDDLEWARE](#52-middleware)
     - [5.3. PROTECTING THE API KEY AND QUOTA](#53-protecting-the-api-key-and-quota)
6. [STATUS CODE REFERENCES](#6-status-code-references)
7. [KNOWN GAPS AND HOUSE KEEPING](#7-known-gaps-and-house-keeping)
     - [7.1. GAPS](#71-gaps)
     - [7.2. HOUSE KEEPING](#72-house-keeping)
8. [REFERENCES](#8-references)

- *View [GLOSSARY.md](../GLOSSARY.md) for terminology*

---

<!-- SECTION 1 -->
## 1. ROUTE SUMMARY

The router is mounted at **`/api`** by `app.js`, so every path below starts with `/api`.

| Method | Full Path | Middleware | Purpose |
|---|---|---|---|
| `GET` | `/api/language/translate/v2/languages` | `checkJwtToken` | Supported languages for the dropdowns (cached 24h) |
| `POST` | `/api/language/translate/v2` | `translateLimiter`, `checkJwtToken` | Translate text (does **not** save) |
| `POST` | `/api/language/translate/v2/detect` | `detectLimiter`, `checkJwtToken` | Detect the language while the user types |

Each route forwards to the Langbly endpoint with the **same path**, which keeps the mapping easy to follow.

**Client side usage:**

| Method | Full Path | Frontend/Client side files |
|---|---|---|
| `GET` | `/api/language/translate/v2/languages` | [TranslateForm.js](../client/src/components/TranslateForm.js) (on load, cancelled on unmount) |
| `POST` | `/api/language/translate/v2` | [TranslateForm.js](../client/src/components/TranslateForm.js) (Translate button) |
| `POST` | `/api/language/translate/v2/detect` | [TranslateForm.js](../client/src/components/TranslateForm.js) (while typing; older calls are cancelled) |

---

### 1.1. GET `/language/translate/v2/languages`

**Purpose:** Fill the source and target language dropdowns.

**Request:** No body. Needs a valid JWT.

**Flow:**

```
Cache fresh? ──yes──► 200 cached list (no Langbly call)
     │ no
     ▼
langblyRequest('/languages?target=en')     // target=en → names in English
     ▼
filter  → drop entries without a string `language` code
map     → { code, name }  (name fallback: Langbly → LANGUAGE_NAMES → code)
sort    → alphabetical by name (localeCompare)
     ▼
Empty? ──yes──► 502 (not cached)
     │ no
     ▼
Save to cache for 24h → 200 list
```

**Name fallback chain:**

```js
name: lang.name || LANGUAGE_NAMES[lang.language] || lang.language
//    Langbly's  →  local list                    →  the code itself
```

**Response (200):**

```json
[
  { "code": "af", "name": "Afrikaans" },
  { "code": "en", "name": "English" },
  { "code": "zu", "name": "Zulu" }
]
```

`localeCompare` sorts correctly with accented characters, unlike `<` / `>`.

This route doesn't pass `clientAbortSignal(res)`: the result is cached and shared by every user, so it's worth finishing even if one browser leaves. See [3.2.2. LANGUAGES CACHE](#322-languages-cache).

---

### 1.2. POST `/language/translate/v2`

**Purpose:** Translate text from the TranslateForm. **Nothing is saved.** The Save button sends the result to `/translation/save` separately.

**Request body:**

```json
{
  "sourceText": "Goeie môre",
  "sourceLanguage": "auto",
  "targetLanguage": "en"
}
```

| Field | Rules |
|---|---|
| `sourceText` | Passes [`checkSourceText`](#45-checksourcetext) |
| `targetLanguage` | A string that matches `languageCodeRegex` |
| `sourceLanguage` | `"auto"`, blank/missing (both mean auto-detect), **or** a valid code that differs from `targetLanguage` |

**Validation order** (each failure returns `400`):

1. Text is valid
2. Target is a valid code
3. If not auto-detecting: source is a valid code
4. If not auto-detecting: source ≠ target

All validation happens **before** the Langbly call, so bad input never uses up quota.

**Langbly request:**

```js
{
  q: sourceText,
  target: targetLanguage,
  ...(autoDetect ? {} : { source: sourceLanguage }),  // leave out 'source' to let Langbly detect it
  format: 'text',                                     // plain text, no HTML escaping (e.g. ' stays ')
}
```

**Response (200):**

```json
{
  "translatedText": "Good morning",
  "sourceLanguage": "af",
  "targetLanguage": "en",
  "detectedLanguage": "af",
  "detectedLanguageName": "Afrikaans"
}
```

| Field | Auto-detect | User chose a source |
|---|---|---|
| `sourceLanguage` | The detected code | The user's choice |
| `detectedLanguage` | The detected code (or `null`) | `null` |
| `detectedLanguageName` | Readable name | `null` |

`sourceLanguage` always holds **the language that was actually translated from**, so the frontend can pass it straight to `/translation/save` (see [Gap 3](#gap-3-sourcelanguage-can-be-null-after-auto-detect) for the one exception).

**`502` if:** Langbly returns no `translatedText` string.

---

### 1.3. POST `/language/translate/v2/detect`

**Purpose:** A live preview of the source language as the user types (e.g. "Detected: Afrikaans").

**Request body:**

```json
{ "sourceText": "Hoe gaan dit?" }
```

**Langbly's response shape:** one array of results **per `q` item**, hence the double index:

```js
data.detections?.[0]?.[0]
//              │     └── first result for that text
//              └── first (only) q item
```

**`'und'` handling:** Langbly answers `'und'` (undetermined) for text that's too short. The route turns that into `null`, so the frontend can just check `if (language)`.

**Response (200):**

```json
{
  "language": "af",
  "name": "Afrikaans",
  "confidence": 0.97,
  "isReliable": true
}
```

When the language can't be determined:

```json
{ "language": null, "name": null, "confidence": null, "isReliable": false }
```

`isReliable: Boolean(language && detection?.isReliable)` is always `false` when there's no language.

---

<!-- SECTION 2 IMPORTS AND SETUP -->
## 2. IMPORTS AND SETUP

```js
require('dotenv').config();
const express = require('express');
const { checkJwtToken } = require('../middleware/securityMiddleware');
const { translateLimiter, detectLimiter } = require('../middleware/rateLimitMiddleware');
const { languageData } = require('../util/languageData');
const { languageCodeRegex, MAX_TRANSLATION_CHARS } = require('../util/schemaUtil');
const { LANGBLY_TIMEOUT_MS, LANGUAGES_CACHE_MS, LANGBLY_PATH } = require('../util/apiUtil');
const router = express.Router();
```

| Import | From | Used For |
|---|---|---|
| `dotenv` | npm | Loads `.env` into `process.env`. It must run **before** the constants read `LANGBLY_API_KEY`. |
| `express` | npm | Creates the `router`. |
| `checkJwtToken` | `securityMiddleware` | Blocks requests from users who aren't logged in. |
| `translateLimiter`, `detectLimiter` | `rateLimitMiddleware` | Per-IP request limits, with a separate limit for each route. |
| `languageData` | `util/languageData` | Local `[{ code, name }]` list, used to build [`LANGUAGE_NAMES`](#41-language_names). |
| `languageCodeRegex` | `util/schemaUtil` | Validates codes like `en`, `zu`, `zh-CN`. |
| `MAX_TRANSLATION_CHARS` | `util/schemaUtil` | The maximum text length allowed per request (`10000`). |
| `LANGBLY_TIMEOUT_MS`, `LANGUAGES_CACHE_MS`, `LANGBLY_PATH` | `util/apiUtil` | Langbly connection settings ([3.1. CONNECTION SETTINGS](#31-connection-settings)). |

---

<!-- SECTION 3: CONNECTION SETUP -->
## 3. CONNECTION SETUP

### 3.1. CONNECTION SETTINGS

```js
// apiRoutes.js (read from .env)
const LANGBLY_BASE_URL = (process.env.LANGBLY_BASE_URL || 'https://api.langbly.com').replace(/\/+$/, '');
const LANGBLY_API_KEY = process.env.LANGBLY_API_KEY;

// util/apiUtil.js (fixed values)
const LANGBLY_PATH = '/language/translate/v2';
const LANGBLY_TIMEOUT_MS = 15000;
const LANGUAGES_CACHE_MS = 1000 * 60 * 60 * 24;
```

The two `.env` values stay in `apiRoutes.js`. The fixed values live in `util/apiUtil.js`.

| Constant | Value | Notes |
|---|---|---|
| `LANGBLY_BASE_URL` | `.env` value or `https://api.langbly.com` | `.replace(/\/+$/, '')` strips trailing slashes, so `https://x.com/` + `/language/...` doesn't become `https://x.com//language/...`. |
| `LANGBLY_API_KEY` | from `.env` | Secret. It only ever goes into outgoing request headers, never into a response. |
| `LANGBLY_PATH` | `/language/translate/v2` | Shared base path. Routes add a suffix (`''`, `/detect`, `/languages?target=en`). |
| `LANGBLY_TIMEOUT_MS` | `15000` (15s) | Used by `AbortSignal.timeout()`. See [3.2.1. TIMEOUT](#321-timeout-abortsignal). |
| `LANGUAGES_CACHE_MS` | `86 400 000` (24h) | ms × s × min × h. |

**How the full URL is built:**

```
LANGBLY_BASE_URL + LANGBLY_PATH + path
https://api.langbly.com + /language/translate/v2 + /detect
```

### 3.2. CONSTRAINTS

| Constraint | Value | Where | Effect |
|---|---|---|---|
| Request timeout | 15s | `LANGBLY_TIMEOUT_MS` | A hung Langbly call becomes a `502` |
| Text length | 10 000 characters | `MAX_TRANSLATION_CHARS` | Longer text is a `400` before Langbly is called |
| Language codes | `/^[a-z]{2,3}(-[A-Za-z]{2,4})?$/` | `languageCodeRegex` | Invalid codes are a `400` before Langbly is called |
| `/translate` rate limit | 100 requests / 15 min per IP | `translateLimiter` | `429` |
| `/detect` rate limit | 60 requests / 15 min per IP | `detectLimiter` | `429` |
| Languages cache | 24h | `LANGUAGES_CACHE_MS` | At most one Langbly `/languages` call per day while the list is good |
| Node version | 20.3+ | `AbortSignal.any` | See [3.2.3. NODE VERSION](#323-node-version) |

#### 3.2.1. TIMEOUT (ABORTSIGNAL)

```js
signal: signal
    ? AbortSignal.any([signal, AbortSignal.timeout(LANGBLY_TIMEOUT_MS)])
    : AbortSignal.timeout(LANGBLY_TIMEOUT_MS),
```

`AbortSignal.timeout(ms)` is a ready-made signal that **aborts itself** after the given time, so it needs no `AbortController`. When a route also passes a browser-disconnect `signal` (from [`clientAbortSignal()`](#43-clientabortsignal)), `AbortSignal.any([...])` combines the two: whichever fires first cancels the request.

**What happens when it fires:**

```
0s ──── fetch starts ──────────────────── 15s ──► signal aborts
                                                   │
                     Node drops the connection ◄───┘
                     fetch rejects: DOMException { name: 'TimeoutError' }
                     │
                     ▼
              catch (step 3) → LangblyError(502)
                     │
                     ▼
              route's catch → sendError → 502 to the browser
```

| Error Name | Caused By |
|---|---|
| `TimeoutError` | `AbortSignal.timeout()` running out |
| `AbortError` | `clientAbortSignal` firing because the browser disconnected |

Both end up as a `LangblyError(502)`, whether they happen before the headers arrive (Step 3 of [`langblyRequest()`](#42-langblyrequest)) or while the body is downloading (Step 4).

**Why it matters:** Node's `fetch` has **no overall time limit**. Without this signal, a hung Langbly server would keep the user's request (and the Express connection) open indefinitely.

#### 3.2.2. LANGUAGES CACHE

```js
let languagesCache = { languages: null, expiresAt: 0 };
```

- `let`, not `const`, because the whole object is replaced after a successful fetch.
- `expiresAt: 0` means it's "already expired", so the first request always goes to Langbly.
- It lives in **server memory**:
  - It resets whenever the server restarts.
  - It isn't shared between multiple server instances (fine for a single deployment).
- Only a **non-empty** list is cached. A failed or empty response is never stored.

#### 3.2.3. NODE VERSION

| Feature | Needs |
|---|---|
| `AbortSignal.timeout` | Node **17.3+** |
| Global `fetch` | Node **18+** |
| `AbortSignal.any` | Node **20.3+** |

So the file requires Node 20.3+ overall (the project runs on Node 24).

### 3.3. ERROR HANDLING

#### 3.3.1. LANGBLYERROR CLASS

```js
class LangblyError extends Error {
    constructor(status, message) {
        super(message);
        this.name = 'LangblyError';
        this.status = status;
    }
}
```

This is a custom error that carries two things:

| Property | Purpose |
|---|---|
| `status` | The HTTP status **this server** should send (`400`, `429`, or `502`). |
| `message` | A message that is **safe to show the user**, with no stack traces or provider internals. |

[`sendError()`](#44-senderror) uses `instanceof LangblyError` to tell these **expected** errors apart from **unexpected** bugs, which become `500`.

#### 3.3.2. LANGBLY STATUS MAPPING

When Langbly answers with an error status, [`langblyRequest()`](#42-langblyrequest) maps it before it reaches the browser:

| Langbly Status | This Server Sends | Message | Why |
|---|---|---|---|
| `400` | `400` | Langbly's own message, or a fallback | Bad text or language code. The user can fix it. |
| `429` | `429` | "Too many requests — please wait…" | Quota or rate limit. The user can retry. |
| `401` / `403` | `502` | "Service unavailable" | **A bad API key is a server configuration problem.** Passing on a 401 would make the frontend think *the user's* JWT expired and log them out. |
| `5xx` / anything else | `502` | "Service unavailable" | Langbly's problem, not the user's. |

#### 3.3.3. ERROR HANDLING FLOW

```
┌────────────────────────── Route handler ──────────────────────────┐
│  validation fails ─────────────────────────────► 400 { message }  │
│                                                                   │
│  langblyRequest()                                                 │
│    ├─ no API key ──────────► throw LangblyError(502)              │
│    ├─ timeout / network ───► throw LangblyError(502)              │
│    ├─ browser left ────────► throw LangblyError(502) (not sent)   │
│    ├─ Langbly 400 ─────────► throw LangblyError(400)              │
│    ├─ Langbly 429 ─────────► throw LangblyError(429)              │
│    ├─ Langbly other ───────► throw LangblyError(502)              │
│    └─ success ─────────────► return data                          │
│                                                                   │
│  data unusable ────────────────────────────────► 502 { message }  │
│  success ──────────────────────────────────────► 200 { ... }      │
│                                                                   │
│  catch (error) → sendError()                                      │
│    ├─ LangblyError ──► error.status { message }                   │
│    └─ other ─────────► 500 { message: 'Internal Server Error' }   │
└───────────────────────────────────────────────────────────────────┘
```

**Logging convention:** `[ERROR: apiRoutes.js, <location>]` / `[SUCCESS: apiRoutes.js, <location>]`, so you can grep the logs by file and route.

---

<!-- SECTION 4: UTILITY FUNCTIONS -->
## 4. UTILITY FUNCTIONS

All of these are defined inside `apiRoutes.js`.

| Helper | Used By | Purpose |
|---|---|---|
| `LANGUAGE_NAMES` | All three routes | Language code → readable name |
| `langblyRequest()` | All three routes | The single place that calls Langbly |
| `clientAbortSignal()` | `/translate`, `/detect` | Cancels the Langbly call if the browser disconnects |
| `sendError()` | All three routes | Turns any caught error into a `{ message }` response |
| `checkSourceText()` | `/translate`, `/detect` | Validates the text before it's sent |

### 4.1. `LANGUAGE_NAMES`

```js
const LANGUAGE_NAMES = languageData.reduce((names, lang) => {
    names[lang.code] = lang.name;
    return names;
}, {});
```

This converts an **array** into an **object**, so looking up a name doesn't mean searching the array:

```js
// Before (array)                          // After (object)
[{ code: 'af', name: 'Afrikaans' },        { af: 'Afrikaans',
 { code: 'zu', name: 'Zulu' }]               zu: 'Zulu' }
```

`LANGUAGE_NAMES['zu']` → `'Zulu'`, a constant-time lookup. It's built **once**, when the file loads.

Used in three places:
- `/languages`, when Langbly returns a code without a name
- `/translate`, for `detectedLanguageName`
- `/detect`, for `name`

### 4.2. `langblyRequest()`

```js
const langblyRequest = async (path, { method = 'GET', body, signal } = {}) => { ... }
```

Every route calls Langbly through this one function, so the authentication, timeout and error handling live in one place.

#### Parameters

| Param | Default | Example |
|---|---|---|
| `path` | — | `''`, `'/detect'`, `'/languages?target=en'` |
| `method` | `'GET'` | `'POST'` |
| `body` | `undefined` | `{ q: 'Hallo', target: 'en' }` |
| `signal` | `undefined` | `clientAbortSignal(res)`, which cancels the call if the browser disconnects ([4.3](#43-clientabortsignal)) |

`= {}` on the options object means you can call `langblyRequest('/languages?target=en')` without passing a second argument.

#### Step-by-step

**Step 1: Guard against a missing key**

```js
if (!LANGBLY_API_KEY) {
    throw new LangblyError(502, 'The translation service is not configured.');
}
```
This fails fast without making a pointless network call. It returns `502` rather than `500` because the problem is the upstream service's configuration.

**Step 2: Send the request**

```js
response = await fetch(`${LANGBLY_BASE_URL}${LANGBLY_PATH}${path}`, {
    method,
    headers: {
        'X-API-Key': LANGBLY_API_KEY,
        'Authorization': `Bearer ${LANGBLY_API_KEY}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(LANGBLY_TIMEOUT_MS)])
        : AbortSignal.timeout(LANGBLY_TIMEOUT_MS),
});
```

| Piece | What It Does |
|---|---|
| `fetch` | Node 18+'s built-in fetch, so no axios or node-fetch is needed. |
| Both auth headers | The Langbly docs show both schemes, so both are sent. |
| Conditional spread `...(body ? {...} : {})` | Adds `Content-Type` only when there's a body (POST). GET requests stay clean. |
| `JSON.stringify(body)` | `fetch` needs a string body, not an object. |
| `signal` | The 15-second timeout, combined with the browser-disconnect signal when one is passed in. See [3.2.1. TIMEOUT](#321-timeout-abortsignal). |

`let response` is declared **outside** the `try` so it can still be used after the block.

**Step 3: Catch network failures**

```js
} catch (error) {
    throw new LangblyError(502, 'The translation service is unavailable. Please try again later.');
}
```
This `catch` only runs when **no HTTP response arrived at all**:
- the 15s timeout fired (`TimeoutError`)
- the browser disconnected and the request was cancelled (`AbortError`)
- a DNS lookup failed
- the connection was refused or reset

An HTTP error status (400, 500, etc.) does **not** land here, because `fetch` only rejects on network-level failures.

**Step 4: Parse the body safely**

```js
let payload;
try {
    payload = await response.json();
} catch (error) {
    if (error.name === 'TimeoutError' || error.name === 'AbortError') {
        throw new LangblyError(502, 'The translation service is unavailable. Please try again later.');
    }
    payload = {};
}
```
If Langbly sends HTML or an empty body (common with gateway errors), `.json()` throws. The `catch` turns that into `{}`, so the code can carry on.

A **timeout or cancellation while the body is still downloading** is different: the signal stays attached after the headers arrive, so `.json()` can also reject with `TimeoutError` / `AbortError`. That's a real failure, so it becomes a `502` instead of an empty `{}`, which would otherwise look like "no data" (or "undetermined" on `/detect`). See [Gap 1](#gap-1-a-timeout-while-reading-the-body-was-swallowed-fixed).

**Step 5: Map error statuses**

```js
if (!response.ok) { ... }
```

See [3.3.2. LANGBLY STATUS MAPPING](#332-langbly-status-mapping).

**Step 6: Return the data**

```js
return payload.data || {};
```
Langbly wraps results in `{ data: { ... } }`. Returning `{}` as a fallback means callers can use optional chaining (`data.translations?.[0]`) without crashing.

### 4.3. `clientAbortSignal()`

```js
const clientAbortSignal = (res) => {
    const controller = new AbortController();
    res.on('close', () => {
        if (!res.writableFinished) controller.abort();// Closed before the response finished = the client left
    });
    return controller.signal;
};
```

`TranslateForm` cancels older `/detect` calls while the user types. Without this, Express wouldn't notice, and the Langbly call would still run to the end and use up quota for a result nobody sees. `res` emits `close` when the connection ends. If that happens **before** the response has finished being sent (`!res.writableFinished`), the client left early, so the Langbly call is cancelled.

`/translate` and `/detect` both pass `signal: clientAbortSignal(res)`. `/languages` doesn't (see [1.1](#11-get-languagetranslatev2languages)).

### 4.4. `sendError()`

```js
const sendError = (res, route, error) => {
    if (res.writableEnded || res.destroyed) return;
    if (error instanceof LangblyError) {
        return res.status(error.status).json({ message: error.message });
    }
    console.error(`[ERROR: apiRoutes.js, ${route}]`, error.message);
    return res.status(500).json({ message: 'Internal Server Error' });
};
```

Every route's `catch` calls this, so all error responses have the same shape: `{ message }`.

| Error Type | Logged Here? | Response |
|---|---|---|
| Browser already disconnected | No | Nothing. There's no one to answer, so it returns early. |
| `LangblyError` | No, it was already logged in `langblyRequest` | `error.status` + safe message |
| Anything else (a bug) | Yes | `500` + generic message |

### 4.5. `checkSourceText()`

```js
const checkSourceText = (sourceText) => {
    if (typeof sourceText !== 'string' || !sourceText.trim()) return 'Text to translate is required';
    if (sourceText.length > MAX_TRANSLATION_CHARS) return `Text cannot exceed ${MAX_TRANSLATION_CHARS} characters`;
    return null;
};
```

Shared by `/translate` and `/detect`. It returns an **error message string** or `null` (valid). Returning instead of throwing keeps the route code simple:

```js
const textError = checkSourceText(sourceText);
if (textError) return res.status(400).json({ message: textError });
```

| Check | Rejects |
|---|---|
| `typeof !== 'string'` | Numbers, objects, arrays, `undefined`. This blocks anything other than plain text from reaching Langbly. |
| `!sourceText.trim()` | `''`, `'   '`, `'\n'` |
| `length > MAX_TRANSLATION_CHARS` | Oversized text. This limits cost per request and keeps response times well inside the 15s timeout. |

---

<!-- SECTION 5: ROUTER SECURITY -->
## 5. SECURITY

### 5.1. PACKAGES

| Package | Where | Security role |
|---|---|---|
| `dotenv` | `apiRoutes.js` | Keeps `LANGBLY_API_KEY` in `.env`, out of the source code and the client bundle |
| `jsonwebtoken` | `securityMiddleware.js` | Verifies the session JWT in `checkJwtToken` |
| `express-rate-limit` | `rateLimitMiddleware.js` | `translateLimiter` and `detectLimiter`: limits how fast one IP can spend Langbly quota |

### 5.2. MIDDLEWARE

| Middleware | File | Routes | What it does |
|---|---|---|---|
| `translateLimiter` | [rateLimitMiddleware.js](../server/middleware/rateLimitMiddleware.js) | `/translate` | **429** after 100 requests per 15 minutes per IP ("Too many translation requests...") |
| `detectLimiter` | [rateLimitMiddleware.js](../server/middleware/rateLimitMiddleware.js) | `/detect` | **429** after 60 requests per 15 minutes per IP ("Too many language detection requests...") |
| `checkJwtToken` | [securityMiddleware.js](../server/middleware/securityMiddleware.js) | All | **401** if the user isn't logged in, the token is invalid or expired, or the session was signed out. A database failure during the lookup returns **500**. |

**Order:**

```js
router.post('/language/translate/v2', translateLimiter, checkJwtToken, async (req, res) => { ... });
```

Express runs middleware **left to right**:

```
Request → translateLimiter → checkJwtToken → route handler
              │                  │
              └─ 429 if too many └─ 401 if not logged in
```

The **rate limiter goes first**, so a flood of requests is rejected cheaply, before JWT verification or a Langbly call.

| Route | Limiter | Why |
|---|---|---|
| `/translate` | `translateLimiter` (100 / 15 min) | Clicked on purpose; sends the most text |
| `/detect` | `detectLimiter` (60 / 15 min) | Fires while typing, so it has its own budget and can't use up the translate limit |
| `/languages` | none | Cached for 24h; rarely hits Langbly |

### 5.3. PROTECTING THE API KEY AND QUOTA

| Rule | Where | Why |
|---|---|---|
| The browser never calls Langbly directly | All routes | The API key stays on the server |
| The API key only goes into outgoing headers | `langblyRequest()` | It's never logged or sent in a response |
| Langbly `401` / `403` become `502` | `langblyRequest()` | A bad server key mustn't look like the user's session expired (which would log them out) |
| Errors return safe messages only | `LangblyError`, `sendError()` | No stack traces or provider internals reach the browser |
| Input is validated before Langbly is called | `checkSourceText()`, language checks in `/translate` | Bad input never spends quota; non-strings can't be forwarded |
| Text length is capped | `MAX_TRANSLATION_CHARS` | Limits the cost of one request |
| Cancelled requests are cancelled upstream too | `clientAbortSignal()` | Abandoned `/detect` calls don't spend quota |
| Every route needs a logged-in user | `checkJwtToken` | Anonymous visitors can't use the quota |

---

<!-- SECTION 6 -->
## 6. STATUS CODE REFERENCES

| Code | Route(s) | When |
|---|---|---|
| `200` | all | Success (including `/detect` with `language: null` when undetermined) |
| `400` | translate, detect | Text missing, blank, not a string, or over `MAX_TRANSLATION_CHARS` |
| `400` | translate | Invalid target or source language; source = target |
| `400` | translate, detect | Langbly rejected the text or a language code (Langbly's message is passed on) |
| `401` | all | (From `checkJwtToken`) Not logged in, or the token is invalid, expired or signed out |
| `429` | translate | (From `translateLimiter`) More than 100 requests in 15 minutes |
| `429` | detect | (From `detectLimiter`) More than 60 requests in 15 minutes |
| `429` | all | Langbly quota or rate limit reached |
| `500` | all | Unexpected error (a bug), or a failed user lookup in `checkJwtToken` |
| `502` | all | API key missing or rejected, Langbly unreachable, timed out, or returned `5xx` |
| `502` | languages | Langbly returned no languages |
| `502` | translate | Langbly returned no `translatedText` |

---

<!-- SECTION 7 -->
## 7. KNOWN GAPS AND HOUSE KEEPING

### 7.1. GAPS

#### Gap 1: A timeout while reading the body was swallowed (fixed)

The timeout signal stays attached after the headers arrive. `langblyRequest` used to parse the body with `response.json().catch(() => ({}))`, so if the 15s ran out **while the body was downloading**, the `TimeoutError` became `{}` and `response.ok` was still `true`. `/languages` and `/translate` returned 502 but logged it as "no data", and `/detect` returned **200 with `language: null`**, which looked like "undetermined" instead of an error.

**Fixed:** a `TimeoutError` or `AbortError` while reading the body now throws `LangblyError(502)`. Only non-JSON bodies still fall back to `{}`. See [4.2, Step 4](#step-by-step).

#### Gap 2: Cancelled browser requests still reached Langbly (fixed)

`TranslateForm` cancels older `/detect` calls while the user types, but Express didn't know, so each Langbly call still ran to the end and used up quota.

**Fixed:** a new `clientAbortSignal(res)` helper aborts when the browser disconnects before the response is finished. `/detect` and `/translate` pass it to `langblyRequest`, which combines it with the timeout using `AbortSignal.any`. `sendError` skips responding when the browser has already gone. See [4.3. `clientAbortSignal()`](#43-clientabortsignal).

#### Gap 3: `sourceLanguage` can be `null` after auto-detect

When auto-detecting, `/translate` returns `sourceLanguage: detectedLanguage`, and `detectedLanguage` is `null` if Langbly leaves out `detectedSourceLanguage`. The translation itself still succeeds (`200`), but passing that `null` to `/translation/save` would fail validation.

**Fix:** either return `502` when auto-detect gives no source language, or have the frontend disable Save when `sourceLanguage` is `null`.

#### Gap 4: Simultaneous requests can all refill the languages cache

When the cache has expired, every `/languages` request that arrives before the first Langbly call finishes makes its own Langbly call. This is harmless at the current scale (it happens at most once a day), but storing the in-flight promise in the cache would make them share one call.

### 7.2. HOUSE KEEPING

**Done:**

| Issue | What changed |
|---|---|
| The `/detect` doc comment appeared **twice** | Removed the duplicate |
| Two descriptions of `langblyRequest` (a block comment plus two `//` lines) | Merged into one block comment, which now also covers the `signal` option |
| Comments said "Conditional rendering" | Changed to "Guard clause" (in `langblyRequest` and `/translate`), or removed where the comment beside it already explained the check (`sendError`) |
| `'../util/langaugeData'` typo | Renamed the file to `server/util/languageData.js` and updated every `require` (`apiRoutes.js`, `exportRoutes.js`, `userSchema.js`), plus the references in `EXPORT_ROUTES.md`, `GLOSSARY.md` and the client's `languageData.js` comment |

**Still to do:**

| Issue | Where | Change |
|---|---|---|
| Leftover commented-out `LANGBLY_PATH` | `apiRoutes.js` line 26 | Delete it; the value now comes from `util/apiUtil.js` |
| Missing semicolon and spacing | `apiRoutes.js`: `const {LANGBLY_TIMEOUT_MS, ...} = require('../util/apiUtil')` | `const { ... } = require('../util/apiUtil');` to match the other imports |
| "userTranslatoons" typo | `rateLimitMiddleware.js` comment above `translateLimiter` | "translations" |

---

<!-- SECTION 8: REFERENCES -->
## 8. REFERENCES

**Project files**

- [apiRoutes.js](../server/routes/apiRoutes.js)
- [apiUtil.js](../server/util/apiUtil.js), [schemaUtil.js](../server/util/schemaUtil.js), [languageData.js](../server/util/languageData.js)
- [securityMiddleware.js](../server/middleware/securityMiddleware.js), [rateLimitMiddleware.js](../server/middleware/rateLimitMiddleware.js)
- [TranslateForm.js](../client/src/components/TranslateForm.js)
- [TRANSLATION_ROUTES.md](TRANSLATION_ROUTES.md), [GLOSSARY.md](../GLOSSARY.md)

**External documentation**

- [Langbly API documentation](https://langbly.com/docs)
- [Express: Routing](https://expressjs.com/en/guide/routing.html)
- [MDN: `fetch()`](https://developer.mozilla.org/en-US/docs/Web/API/Window/fetch)
- [MDN: `AbortSignal.timeout()`](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/timeout_static)
- [MDN: `AbortSignal.any()`](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/any_static)
- [Node.js: `http.ServerResponse` `'close'` event](https://nodejs.org/api/http.html#event-close_2)
- [express-rate-limit](https://github.com/express-rate-limit/express-rate-limit)
- [dotenv](https://github.com/motdotla/dotenv)
- [MDN: HTTP response status codes](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status)
