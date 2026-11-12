# API_ROUTES.md — `apiRoutes.js` Breakdown

`apiRoutes.js` is the Express router that sits between the React frontend and the **Langbly** translation API. The browser never talks to Langbly directly. It calls this server, and this server adds the secret API key, validates the input, forwards the request, and turns Langbly's answer (or error) into a clean response.

```
React (TranslateForm)  ──►  /api/language/translate/v2/...  ──►  Langbly API
       ▲                        (this router)                       │
       └────────────── clean JSON / safe error message ◄────────────┘
```

---

## Table of Contents

1. [Route Summary](#1-route-summary)
2. [Imports & Setup](#2-imports--setup)
3. [Connection Settings (Constants)](#3-connection-settings-constants)
4. [LANGUAGE_NAMES Lookup](#4-language_names-lookup)
5. [In-Memory Languages Cache](#5-in-memory-languages-cache)
6. [LangblyError Class](#6-langblyerror-class)
7. [langblyRequest() — The Core Helper](#7-langblyrequest--the-core-helper)
8. [The Timeout (AbortSignal)](#8-the-timeout-abortsignal)
9. [sendError() Helper](#9-senderror-helper)
10. [checkSourceText() Validator](#10-checksourcetext-validator)
11. [GET /languages](#11-get-apilanguagetranslatev2languages)
12. [POST /translate](#12-post-apilanguagetranslatev2)
13. [POST /detect](#13-post-apilanguagetranslatev2detect)
14. [Middleware Order](#14-middleware-order)
15. [Error Handling Flow](#15-error-handling-flow)
16. [Known Gaps & Housekeeping](#16-known-gaps--housekeeping)

---

## 1. Route Summary

The router is mounted at `/api` in `app.js`, so every path below starts with `/api`.

| Method | Full Path | Middleware | Purpose |
|---|---|---|---|
| `GET` | `/api/language/translate/v2/languages` | `checkJwtToken` | Supported languages for the dropdowns (cached 24h) |
| `POST` | `/api/language/translate/v2` | `translateLimiter`, `checkJwtToken` | Translate text (does **not** save) |
| `POST` | `/api/language/translate/v2/detect` | `detectLimiter`, `checkJwtToken` | Detect the language while the user types |

Each route forwards to the Langbly endpoint with the **same path**, which keeps the mapping easy to follow.

---

## 2. Imports & Setup

```js
require('dotenv').config();
const express = require('express');
const { checkJwtToken } = require('../middleware/securityMiddleware');
const { translateLimiter, detectLimiter } = require('../middleware/rateLimitMiddleware');
const { languageData } = require('../util/langaugeData');
const { languageCodeRegex, MAX_TRANSLATION_CHARS } = require('../util/schemaUtil');
const router = express.Router();
```

| Import | From | Used For |
|---|---|---|
| `dotenv` | npm | Loads `.env` into `process.env`. It must run **before** the constants read `LANGBLY_API_KEY`. |
| `express` | npm | Creates the `router`. |
| `checkJwtToken` | `securityMiddleware` | Blocks requests from users who aren't logged in. |
| `translateLimiter`, `detectLimiter` | `rateLimitMiddleware` | Per-IP request limits, with a separate limit for each route. |
| `languageData` | `util/langaugeData` | Local `[{ code, name }]` list, used as a fallback for language names. |
| `languageCodeRegex` | `util/schemaUtil` | Validates codes like `en`, `zu`, `zh-CN`. |
| `MAX_TRANSLATION_CHARS` | `util/schemaUtil` | The maximum text length allowed per request. |

---

## 3. Connection Settings (Constants)

```js
const LANGBLY_BASE_URL = (process.env.LANGBLY_BASE_URL || 'https://api.langbly.com').replace(/\/+$/, '');
const LANGBLY_API_KEY = process.env.LANGBLY_API_KEY;
const LANGBLY_PATH = '/language/translate/v2';
const LANGBLY_TIMEOUT_MS = 15000;
const LANGUAGES_CACHE_MS = 1000 * 60 * 60 * 24;
```

| Constant | Value | Notes |
|---|---|---|
| `LANGBLY_BASE_URL` | `.env` value or `https://api.langbly.com` | `.replace(/\/+$/, '')` strips trailing slashes, so `https://x.com/` + `/language/...` doesn't become `https://x.com//language/...`. |
| `LANGBLY_API_KEY` | from `.env` | Secret. It only ever goes into outgoing request headers, never into a response. |
| `LANGBLY_PATH` | `/language/translate/v2` | Shared base path. Routes add a suffix (`''`, `/detect`, `/languages?target=en`). |
| `LANGBLY_TIMEOUT_MS` | `15000` (15s) | Used by `AbortSignal.timeout()`. See [section 8](#8-the-timeout-abortsignal). |
| `LANGUAGES_CACHE_MS` | `86 400 000` (24h) | ms × s × min × h. |

**How the full URL is built:**

```
LANGBLY_BASE_URL + LANGBLY_PATH + path
https://api.langbly.com + /language/translate/v2 + /detect
```

---

## 4. LANGUAGE_NAMES Lookup

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

---

## 5. In-Memory Languages Cache

```js
let languagesCache = { languages: null, expiresAt: 0 };
```

- `let`, not `const`, because the whole object is replaced after a successful fetch.
- `expiresAt: 0` means it's "already expired", so the first request always goes to Langbly.
- It lives in **server memory**:
  - It resets whenever the server restarts.
  - It isn't shared between multiple server instances (fine for a single deployment).
- Only a **non-empty** list is cached. A failed or empty response is never stored.

---

## 6. LangblyError Class

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

`sendError()` uses `instanceof LangblyError` to tell these **expected** errors apart from **unexpected** bugs, which become `500`.

---

## 7. langblyRequest() — The Core Helper

```js
const langblyRequest = async (path, { method = 'GET', body } = {}) => { ... }
```

Every route calls Langbly through this one function, so the authentication, timeout and error handling live in one place.

### Parameters

| Param | Default | Example |
|---|---|---|
| `path` | — | `''`, `'/detect'`, `'/languages?target=en'` |
| `method` | `'GET'` | `'POST'` |
| `body` | `undefined` | `{ q: 'Hallo', target: 'en' }` |

`= {}` on the options object means you can call `langblyRequest('/languages?target=en')` without passing a second argument.

### Step-by-step

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
    signal: AbortSignal.timeout(LANGBLY_TIMEOUT_MS),
});
```

| Piece | What It Does |
|---|---|
| `fetch` | Node 18+'s built-in fetch, so no axios or node-fetch is needed. |
| Both auth headers | The Langbly docs show both schemes, so both are sent. |
| Conditional spread `...(body ? {...} : {})` | Adds `Content-Type` only when there's a body (POST). GET requests stay clean. |
| `JSON.stringify(body)` | `fetch` needs a string body, not an object. |
| `signal` | The 15-second timeout. See [section 8](#8-the-timeout-abortsignal). |

`let response` is declared **outside** the `try` so it can still be used after the block.

**Step 3: Catch network failures**

```js
} catch (error) {
    throw new LangblyError(502, 'The translation service is unavailable. Please try again later.');
}
```
This `catch` only runs when **no HTTP response arrived at all**:
- the 15s timeout fired (`TimeoutError`)
- a DNS lookup failed
- the connection was refused or reset

An HTTP error status (400, 500, etc.) does **not** land here, because `fetch` only rejects on network-level failures.

**Step 4: Parse the body safely**

```js
const payload = await response.json().catch(() => ({}));
```
If Langbly sends HTML or an empty body (common with gateway errors), `.json()` would throw. The `.catch` turns that into `{}`, so the code can carry on.

**Step 5: Map error statuses**

```js
if (!response.ok) { ... }
```

| Langbly Status | This Server Sends | Message | Why |
|---|---|---|---|
| `400` | `400` | Langbly's own message, or a fallback | Bad text or language code. The user can fix it. |
| `429` | `429` | "Too many requests — please wait…" | Quota or rate limit. The user can retry. |
| `401` / `403` | `502` | "Service unavailable" | **A bad API key is a server configuration problem.** Passing on a 401 would make the frontend think *the user's* JWT expired and log them out. |
| `5xx` / anything else | `502` | "Service unavailable" | Langbly's problem, not the user's. |

**Step 6: Return the data**

```js
return payload.data || {};
```
Langbly wraps results in `{ data: { ... } }`. Returning `{}` as a fallback means callers can use optional chaining (`data.translations?.[0]`) without crashing.

---

## 8. The Timeout (AbortSignal)

```js
signal: AbortSignal.timeout(LANGBLY_TIMEOUT_MS),
```

### What it is

`AbortSignal.timeout(ms)` is a ready-made signal that **aborts itself** after the given time. No `AbortController` is needed because nothing else ever cancels the request. It's a timeout only.

### What happens when it fires

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
| `TimeoutError` | `AbortSignal.timeout()` running out (this file) |
| `AbortError` | A manual `controller.abort()` (not used here) |

### Why it matters

Node's `fetch` has **no overall time limit**. Without this signal, a hung Langbly server would keep the user's request (and the Express connection) open indefinitely.

### Requirements

- `AbortSignal.timeout` needs Node **17.3+**
- Global `fetch` needs Node **18+**, so the file already requires Node 18+

---

## 9. sendError() Helper

```js
const sendError = (res, route, error) => {
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
| `LangblyError` | No, it was already logged in `langblyRequest` | `error.status` + safe message |
| Anything else (a bug) | Yes | `500` + generic message |

---

## 10. checkSourceText() Validator

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

## 11. GET `/api/language/translate/v2/languages`

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

---

## 12. POST `/api/language/translate/v2`

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
| `sourceText` | Passes `checkSourceText` |
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

`sourceLanguage` always holds **the language that was actually translated from**, so the frontend can pass it straight to `/translation/save`.

**`502` if:** Langbly returns no `translatedText` string.

---

## 13. POST `/api/language/translate/v2/detect`

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

## 14. Middleware Order

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

| Route | Limiter | Why Separate |
|---|---|---|
| `/translate` | `translateLimiter` | Clicked on purpose, lower volume |
| `/detect` | `detectLimiter` | Fires while typing, so it needs a different (usually higher) limit |
| `/languages` | none | Cached for 24h; rarely hits Langbly |

---

## 15. Error Handling Flow

```
┌────────────────────────── Route handler ──────────────────────────┐
│  validation fails ─────────────────────────────► 400 { message }  │
│                                                                   │
│  langblyRequest()                                                 │
│    ├─ no API key ──────────► throw LangblyError(502)              │
│    ├─ timeout / network ───► throw LangblyError(502)              │
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

**Possible statuses the frontend must handle:** `200`, `400`, `401` (from JWT middleware), `429`, `500`, `502`.

**Logging convention:** `[ERROR: apiRoutes.js, <location>]` / `[SUCCESS: apiRoutes.js, <location>]`, so you can grep the logs by file and route.

---

## 16. Known Gaps & Housekeeping

### Gap 1: A timeout while reading the body is swallowed

```js
const payload = await response.json().catch(() => ({}));
```

The timeout signal stays attached after the headers arrive. If the 15s runs out **while the body is downloading**, `.json()` rejects with `TimeoutError`, the `.catch` turns it into `{}`, and `response.ok` is still `true`.

| Route | Result |
|---|---|
| `/languages` | 502 (correct), but logged as "no languages" |
| `/translate` | 502 (correct), but logged as "no translation" |
| `/detect` | **200 with `language: null`**, which looks like "undetermined" instead of an error |

This is rare with small payloads. **Fix:** only use the `{}` fallback for errors that aren't timeouts:

```js
let payload;
try {
    payload = await response.json();// Parse Langbly's JSON body
} catch (error) {
    if (error.name === 'TimeoutError' || error.name === 'AbortError') {
        throw new LangblyError(502, 'The translation service is unavailable. Please try again later.');// Timed out mid-body
    }
    payload = {};// Non-JSON body: fall back to an empty object
}
```

### Gap 2: Cancelled browser requests still reach Langbly

If the frontend aborts an earlier `/detect` call (for example, in `useEffect` cleanup while typing), Express doesn't know. The Langbly call still runs to completion and uses up quota. **Fix:** pass a client-disconnect signal through and combine it with the timeout:

```js
// In langblyRequest: accept { signal } and combine it with the timeout
signal: signal
    ? AbortSignal.any([signal, AbortSignal.timeout(LANGBLY_TIMEOUT_MS)])// Whichever comes first
    : AbortSignal.timeout(LANGBLY_TIMEOUT_MS),

// In the route
const controller = new AbortController();
res.on('close', () => {
    if (!res.writableFinished) controller.abort();// Client left before we answered
});
const data = await langblyRequest('/detect', { method: 'POST', body: { q: sourceText }, signal: controller.signal });
```

`AbortSignal.any` needs Node **20.3+**.

### Housekeeping

| Line(s) | Issue | Suggestion |
|---|---|---|
| 224–231 | The `/detect` doc comment appears **twice** | Delete one copy |
| 48–56 | Two descriptions of `langblyRequest` (a block comment plus two `//` lines) | Keep one |
| 58, 105, 174 | Comments say "Conditional rendering" | That's a React term for UI. Here these are **guard clauses** / conditional checks. |
| 18 | `'../util/langaugeData'` | Looks like a typo of `languageData`. Only rename it if you also rename the actual file. |
