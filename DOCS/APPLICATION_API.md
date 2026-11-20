# APPLICATION `API` INTEGRATION

## PROCESS

| **CLIENT** |--*Request*->| **API** | --Request--> |**SERVER**|

| **CLIENT** |<--*Response*-| **API** | <--*Response*-- |**SERVER**|

|||
|---|---|
|The Client sends a request to the API: | The client sends a request to an API endpoint with information such as the HTTP method, parameters, headers, and request body.| 
| API processes the request:|   The API validates the request and determines the required operation based on the provided information.|
| API communicates with the backend:| The API interacts with application logic, databases, or other services to process the request and obtain the required data.|
|API sends a response to the client: | The API returns the result to the client, usually with an HTTP status code and response data in a format such as JSON or XML.|

----

## TABLE OF CONTENTS

1. [OVERVIEW](#1-overview)
- [1.1. ROUTERS](#11-routers)
2. [APPLICATION ENDPOINTS](#2-application-endpoints)
- [2.1 AUTH ROUTES](#21-auth-routes)
- [2.2. USER ROUTES](#22-user-routes)
- [2.3. NOTE ROUTES](#23-note-routes)
- [2.4. ARCHIVE ROUTES](#24-archive-routes)
- [2.5. NOTEBOOK ROUTES](#25-notebook-routes)
- [2.6 TAG ROUTES](#26-tag-routes)
- [2.7. API ROUTES](#27-api-routes)
- [2.8. TRANSLATION ROUTES](#28-translation-routes)
- [2.9. DOCUMENT ROUTES](#29-document-routes)
- [2.10. EXPORT ROUTES](#210-export-routes)
3. [HTTP STATUS CODES](#3-http-status-codes)
4. [REFERENCES](#4-references)

- *View [GLOSSARY.md](../GLOSSARY.md) for terminology*
---

## 1. OVERVIEW 

An API acts as an interface between a client and a server, allowing them to communicate and exchange data. API integration helps connect different systems, automate tasks, share data, and extend application functionality.
An `API` call is a request by a software application to access data or any other service from another application or any other server.
The term `API` can refer to many types of services, and developers have many choices for how their *`APIs`* are architected and what protocols and standards they use.

**REST API's**

`REST  APIs` use `JSON` (most common), `XML`, `HTML`, or plain text format. `REST APIs` are the most common APIs used across the web today. `HTTP` is an application-layer protocol for fetching resources such as `HTML` . REST is used for building APIs because it provides a simple, scalable, and standard way for applications to communicate over a network.
Uses standard HTTP operations such as GET, POST, PUT, PATCH, and DELETE to work with resources.

| **HTTP VERB** | **CRUD OPERATION** | **DESCRIPTION** |
|--------|-------|------|
| `POST` | *CREATE* | Used to submit data about a specific entity to the server |
| `GET` | *READ* | Used to fetch information from the database |
| `PUT` | *UPDATE* | Full replacement update of a resource on the database |
| `PATCH` | *UPDATE* | Partial update of a resource on the database |
| `DELETE` | *DELETE* | Deletes a specific resource |


## 1.1. ROUTERS

A *`router`* object is an instance of middleware and routes. The top-level express object has a Router() method that creates a new router object. 

```js
const express = require('express');//Express framework for building web applications
const router = express.Router();// Create Express router instance

module.exports = router;// Export the router to be used in other parts of the application
```

| Router file | Mounted at | Route document |
|-------------|-----------|--------|
| [authRoutes.js](../server/routes/authRoutes.js) | `/auth` | [AUTH_ROUTES.md](../routeDocs/AUTH_ROUTES.md) | 
| [userRoutes.js](../server/routes/userRoutes.js) | `/user` | [USER_ROUTES.md](../routeDocs/USER_ROUTES.md) | 
| [noteRoutes.js](../server/routes/noteRoutes.js) | `/notes` | [NOTE_ROUTES.md](../routeDocs/NOTE_ROUTES.md) | 
| [archiveRoutes.js](../server/routes/archiveRoutes.js) | `/archive` | [ARCHIVE_ROUTES.md](../routeDocs/ARCHIVE_ROUTES.md) | 
| [notebookRoutes.js](../server/routes/notebookRoutes.js) | `/notebooks` | [NOTEBOOK_ROUTES.md](../routeDocs/NOTEBOOK_ROUTES.md) |
| [tagRoutes.js](../server/routes/tagRoutes.js) | `/tag` | [TAG_ROUTES.md](../routeDocs/TAG_ROUTES.md)| 
| [apiRoutes.js](../server/routes/apiRoutes.js) | `/api` | [API_ROUTES.md](../routeDocs/API_ROUTES.md) | 
| [translationRoutes.js](../server/routes/translationRoutes.js) | `/translation` | [TRANSLATION_ROUTES.md](../routeDocs/TRANSLATION_ROUTES.md) | 
| [docTranslateRoutes.js](../server/routes/docTranslateRoutes.js) | `/document` | [DOCUMENT_ROUTES.md](../routeDocs/DOCUMENT_ROUTES.md) | 
| [exportRoutes.js](../server/routes/exportRoutes.js) | `/export` | [EXPORT_ROUTES.md](../routeDocs/EXPORT_ROUTES.md)|

## 2. APPLICATION ENDPOINTS 

Every endpoint below is shown with its **full path** (mount point + route path).

- **AUTH** `NONE` means anyone can call the endpoint. `JWT` means the request must carry a valid JWT cookie, checked by `checkJwtToken`. `JWT + Admin` also needs `checkAdmin`.
- Every user can only see and change **their own** notes, notebooks, tags, translations and document translations. Another user's resource returns `404`, so ids can't be probed.
- Any `:id` must be a valid MongoDB ObjectId, otherwise the route returns `400`.

**Summary: 61 endpoints**

| Router | Endpoints |
|--------|-----------|
| `/auth` | 5 |
| `/user` | 6 |
| `/notes` | 8 |
| `/archive` | 12 |
| `/notebooks` | 4 |
| `/tag` | 4 |
| `/api` | 3 |
| `/translation` | 6 |
| `/document` | 8 |
| `/export` | 1 |

### 2.1 AUTH ROUTES

The router is mounted at **`/auth`** by [`app.js`](../server/app.js). 

| METHOD | ENDPOINT | AUTH | MIDDLEWARE | DESCRIPTION/PURPOSE |
|--------|----------|------|------------|---|
| `POST` | `/auth/login` | NONE | `loginLimiter` | Check credentials and set the JWT cookie |
| `POST` | `/auth/register` | NONE | `registerLimiter`, `checkPassword`, `hashPassword` | Create a new user |
| `POST` | `/auth/logout` | NONE | — | Clear the JWT cookie |
| `PATCH` | `/auth/setAdmin` | JWT | `checkJwtToken` | Upgrade the logged-in user to admin (21+, minimum account age) |
| `PATCH` | `/auth/clearAdmin` | JWT | `checkJwtToken` | Remove admin status from the logged-in user |

### 2.2. USER ROUTES

The router is mounted at **`/user`** by [`app.js`](../server/app.js). 

| METHOD | ENDPOINT | AUTH | MIDDLEWARE | DESCRIPTION/PURPOSE |
|--------|----------|------|------------|---|
| `GET` | `/user/me` | JWT | `checkJwtToken` | Own profile (used by `App.js` for `currentUser`, and by Settings) |
| `GET` | `/user/fetchUsers` | JWT + Admin | `checkJwtToken`, `checkAdmin` | All users, for the Users table |
| `GET` | `/user/fetchUser/:id` | JWT + Admin | `checkJwtToken`, `checkAdmin` | One non-admin user, for the details panel |
| `PATCH` | `/user/editProfile` | JWT | `checkJwtToken` | Update own profile and default languages |
| `PATCH` | `/user/editPassword` | JWT | `checkJwtToken`, `checkPasswordChange`, `checkPassword`, `passwordUpdateRateLimiter`, `hashPassword` | Change own password (signs out other sessions) |
| `DELETE` | `/user/deleteUser/:id` | JWT + Admin | `checkJwtToken`, `checkAdmin` | Remove a non-admin user and **all** their data (notes, notebooks, tags, translations and document translations) |

### 2.3. NOTE ROUTES

The router is mounted at **`/notes`** by [`app.js`](../server/app.js). 

| METHOD | ENDPOINT | AUTH | MIDDLEWARE | DESCRIPTION/PURPOSE |
|--------|----------|------|------------|---|
| `GET` | `/notes/fetchNotes` | JWT | `checkJwtToken` | List the user's active notes (not archived, not trashed). Optional query: `language`, `notebook`, `tag`, `page`, `limit` |
| `GET` | `/notes/trash` | JWT | `checkJwtToken` | List the user's trashed notes (query: `page`, `limit`). Applies the 60-day archive rule first, so expired archived notes appear here |
| `GET` | `/notes/:id` | JWT | `checkJwtToken` | Fetch one of the user's notes |
| `POST` | `/notes/addNote` | JWT | `checkJwtToken` | Create a note (unknown tag names are created automatically) |
| `PATCH` | `/notes/:id` | JWT | `checkJwtToken` | Edit title, content, language, notebook, tags or pin of an **active** note. Only the fields sent are updated |
| `PATCH` | `/notes/:id/restore` | JWT | `checkJwtToken` | Restore a note from the trash |
| `DELETE` | `/notes/:id` | JWT | `checkJwtToken` | Move a note to the trash (soft delete) |
| `DELETE` | `/notes/:id/permanent` | JWT | `checkJwtToken` | Delete a **trashed** note for good, along with its translations |

### 2.4. ARCHIVE ROUTES

The router is mounted at **`/archive`** by [`app.js`](../server/app.js). 

Archive routes are used for notes, translations and document translations. Archived items that are older than 60 days are moved to the trash automatically.

**NOTES**

| METHOD | ENDPOINT | AUTH | MIDDLEWARE | DESCRIPTION/PURPOSE |
|--------|----------|------|------------|---|
| `GET` | `/archive/fetchNotes` | JWT | `checkJwtToken` | List the user's archived notes |
| `PATCH` | `/archive/:id` | JWT | `checkJwtToken` | Archive an **active** note (not archived, not trashed) |
| `PATCH` | `/archive/:id/restore` | JWT | `checkJwtToken` | Return an **archived** note to the main list |
| `DELETE` | `/archive/:id` | JWT | `checkJwtToken` | Move an **archived** note to the trash |

**TRANSLATIONS**

| METHOD | ENDPOINT | AUTH | MIDDLEWARE | DESCRIPTION/PURPOSE |
|--------|----------|------|------------|---|
| `GET` | `/archive/fetchTranslations` | JWT | `checkJwtToken` | List the user's archived translations |
| `PATCH` | `/archive/translation/:id` | JWT | `checkJwtToken` | Archive an **active** translation (not archived, not trashed) |
| `PATCH` | `/archive/translation/:id/restore` | JWT | `checkJwtToken` | Return an **archived** translation to the main list |
| `DELETE` | `/archive/translation/:id` | JWT | `checkJwtToken` | Move an **archived** translation to the trash |

**DOCUMENT TRANSLATIONS**

| METHOD | ENDPOINT | AUTH | MIDDLEWARE | DESCRIPTION/PURPOSE |
|--------|----------|------|------------|---|
| `GET` | `/archive/fetchDocuments` | JWT | `checkJwtToken` | List the user's archived document translations (text omitted) |
| `PATCH` | `/archive/document/:id` | JWT | `checkJwtToken` | Archive an **active** document translation (not archived, not trashed) |
| `PATCH` | `/archive/document/:id/restore` | JWT | `checkJwtToken` | Return an **archived** document translation to the main list |
| `DELETE` | `/archive/document/:id` | JWT | `checkJwtToken` | Move an **archived** document translation to the trash |

### 2.5. NOTEBOOK ROUTES

The router is mounted at **`/notebooks`** by [`app.js`](../server/app.js). 

| METHOD | ENDPOINT | AUTH | MIDDLEWARE | DESCRIPTION/PURPOSE |
|--------|----------|------|------------|---|
| `GET` | `/notebooks` | JWT | `checkJwtToken` | List the user's notebooks A–Z (ignoring case), each with a count of active notes |
| `POST` | `/notebooks` | JWT | `checkJwtToken` | Create a notebook |
| `PATCH` | `/notebooks/:id` | JWT | `checkJwtToken` | Rename and/or recolour a notebook |
| `DELETE` | `/notebooks/:id` | JWT | `checkJwtToken` | Delete a notebook; its notes move to "No notebook" |

### 2.6 TAG ROUTES

The router is mounted at **`/tag`** by [`app.js`](../server/app.js). 

| METHOD | ENDPOINT | AUTH | MIDDLEWARE | DESCRIPTION/PURPOSE |
|--------|----------|------|------------|---|
| `GET` | `/tag/fetchTags` | JWT | `checkJwtToken` | List the user's tags A–Z, each with a note count |
| `POST` | `/tag/addTag` | JWT | `checkJwtToken` | Create a tag |
| `PUT` | `/tag/:id` | JWT | `checkJwtToken` | Rename a tag |
| `DELETE` | `/tag/:id` | JWT | `checkJwtToken` | Delete a tag and remove it from every note |

### 2.7. API ROUTES

[`apiRoutes.js`](../server/routes/apiRoutes.js) is the Express router that sits between the React frontend and the **Langbly** translation API. 
Langbly provides a Google Translate v2 compatible endpoint you can call from your app to translate text (or HTML) into a target language. The browser never talks to Langbly directly. It calls this server, and this server adds the secret API key, validates the input, forwards the request, and turns Langbly's answer (or error) into a clean response.

```
React (TranslateForm)  ──►  /api/language/translate/v2/...  ──►  Langbly API
       ▲                        (this router)                       │
       └────────────── clean JSON / safe error message ◄────────────┘
```

The [document routes](#29-document-routes) also call Langbly, through the same shared helpers in [`langblyUtil.js`](../server/util/langblyUtil.js).

The router is mounted at **`/api`** by [`app.js`](../server/app.js), so every path below starts with `/api`.

| METHOD | ENDPOINT | AUTH | MIDDLEWARE | DESCRIPTION/PURPOSE |
|--------|----------|------|------------|---|
| `GET` | `/api/language/translate/v2/languages` | JWT | `checkJwtToken` | Supported languages for the dropdowns (cached 24h) |
| `POST` | `/api/language/translate/v2` | JWT | `translateLimiter`, `checkJwtToken` | Translate text (does **not** save) |
| `POST` | `/api/language/translate/v2/detect` | JWT | `detectLimiter`, `checkJwtToken` | Detect the language while the user types |

The rate limiters run **before** `checkJwtToken`, so floods are rejected before any JWT check or Langbly call.

#### Langbly connection settings:

Langbly uses API keys for authentication on the translate endpoint. 
The base URL and key are stored in `.env` as `LANGBLY_BASE_URL` and `LANGBLY_API_KEY`.

```js
require('dotenv').config();
```
````js
// util/langblyUtil.js (read from .env)
const LANGBLY_BASE_URL = (process.env.LANGBLY_BASE_URL || 'https://api.langbly.com').replace(/\/+$/, '');
const LANGBLY_API_KEY = process.env.LANGBLY_API_KEY;

````
| Setting | Value |
|---------|-------|
| Base URL | `LANGBLY_BASE_URL`, default `https://api.langbly.com` (EU data residency: `https://eu.langbly.com`) |
| Path prefix | `/language/translate/v2` |
| Auth headers | `X-API-Key: <LANGBLY_API_KEY>` and `Authorization: Bearer <LANGBLY_API_KEY>` (both are sent) |
| Content type | `application/json` (POST requests) |
| Format | `text` (so results aren't HTML-escaped) |
| Timeout | 15 seconds |
| Text per request | Up to 10 000 characters (`MAX_TRANSLATION_CHARS`); longer documents are sent in pieces |

### 2.8. TRANSLATION ROUTES

The router is mounted at **`/translation`** by [`app.js`](../server/app.js). 

These routes manage **saved** translations in the database. Translating text itself is done by the [API routes](#27-api-routes); the result is then saved here with `/translation/save`. Archiving translations is handled by the [archive routes](#24-archive-routes).

| METHOD | ENDPOINT | AUTH | MIDDLEWARE | DESCRIPTION/PURPOSE |
|--------|----------|------|------------|---|
| `GET` | `/translation/fetch` | JWT | `checkJwtToken` | List the user's active translations (not archived, not trashed). Optional query: `note`, `sourceLanguage`, `targetLanguage`, `page`, `limit` |
| `GET` | `/translation/trash` | JWT | `checkJwtToken` | List the user's trashed translations (query: `page`, `limit`). Applies the 60-day archive rule first |
| `POST` | `/translation/save` | JWT | `checkJwtToken` | Save a translation (`sourceText`, `translatedText`, `targetLanguage`, optional `sourceLanguage` and linked `note`) |
| `PATCH` | `/translation/:id/restore` | JWT | `checkJwtToken` | Restore a translation from the trash |
| `DELETE` | `/translation/:id` | JWT | `checkJwtToken` | Move an **active** translation to the trash (soft delete). Archived translations use `DELETE /archive/translation/:id` |
| `DELETE` | `/translation/:id/permanent` | JWT | `checkJwtToken` | Delete a **trashed** translation for good |

### 2.9. DOCUMENT ROUTES

The router is mounted at **`/document`** by [`app.js`](../server/app.js).

These routes translate an uploaded **PDF** and manage the user's **saved** document translations. Unlike the translation routes, this router does the translating itself: `pdf-parse` reads the text out of the PDF, and it's sent to Langbly through the shared helpers in [`langblyUtil.js`](../server/util/langblyUtil.js). Nothing is saved until the user presses SAVE (`/document/saveDoc`). Archiving document translations is handled by the [archive routes](#24-archive-routes).

```
React (DocTranslator)  ──►  POST /document/translateDoc  ──►  multer → pdf-parse → Langbly API
       │                                                                              │
       │ ◄───────────────── { fileName, sourceText, translatedText, ... } ◄───────────┘
       │
       └──►  POST /document/saveDoc  ──►  MongoDB (DocumentTranslation)
```

| METHOD | ENDPOINT | AUTH | MIDDLEWARE | DESCRIPTION/PURPOSE |
|--------|----------|------|------------|---|
| `GET` | `/document/fetchDocuments` | JWT | `checkJwtToken` | List the user's active document translations, newest first, text omitted (query: `page`, `limit`) |
| `GET` | `/document/trash` | JWT | `checkJwtToken` | List the user's trashed document translations, text omitted (query: `page`, `limit`). Applies the 60-day archive rule first |
| `GET` | `/document/fetchDoc/:id` | JWT | `checkJwtToken` | Fetch one document translation **in full**, including its text |
| `POST` | `/document/translateDoc` | JWT | `translateLimiter`, `checkJwtToken`, `uploadDocument` (multer) | Translate an uploaded PDF (does **not** save). `multipart/form-data`: `document`, `sourceLanguage` (`auto` allowed), `targetLanguage` |
| `POST` | `/document/saveDoc` | JWT | `checkJwtToken` | Save a document translation (`fileName`, `sourceText`, `translatedText`, `sourceLanguage`, `targetLanguage`, optional `pageCount`) |
| `PATCH` | `/document/:id/restore` | JWT | `checkJwtToken` | Restore a document translation from the trash |
| `DELETE` | `/document/:id` | JWT | `checkJwtToken` | Move an **active** document translation to the trash (soft delete). Archived ones use `DELETE /archive/document/:id` |
| `DELETE` | `/document/:id/permanent` | JWT | `checkJwtToken` | Delete a **trashed** document translation for good |

**Upload limits (`POST /document/translateDoc`)**

| Limit | Value | Over the limit |
|-------|-------|----------------|
| File type | PDF only (checked by name/MIME type **and** the `%PDF-` file signature) | `400` |
| File size | 5 MB, one file | `413` |
| Text length | 20 000 characters | `413` |
| Readable text | The PDF must have a text layer (scanned PDFs are images) | `422` |

`translateLimiter` is the same limiter instance as on `POST /api/language/translate/v2`, so text and document translations share one budget of 100 requests per 15 minutes per IP.

### 2.10. EXPORT ROUTES

The router is mounted at **`/export`** by [`app.js`](../server/app.js). There's a **single route**.

| METHOD | ENDPOINT | AUTH | MIDDLEWARE | DESCRIPTION/PURPOSE |
|--------|----------|------|------------|---|
| `GET` | `/export` | JWT | `exportLimiter`, `checkJwtToken` | Download notes or translations as `.csv` / `.xlsx` |

**Query parameters**

| Parameter | Values | Description |
|-----------|--------|-------------|
| `type` | `notes` \| `translations` | Which data to export |
| `format` | `csv` \| `xlsx` | File format |
| filters | same as `/notes/fetchNotes` or `/translation/fetch` | Optional. Export only the filtered list |

Files are built with `xlsx` (SheetJS) and `csv-stringify`, and sent with a `Content-Disposition: attachment` header, e.g. `note-nest-notes-2026-11-09.xlsx` or `note-nest-translations-filtered-2026-11-09.csv`.

## 3. HTTP STATUS CODES

`HTTP` response status codes indicate whether a specific `HTTP` request has been successfully completed.

Responses are grouped in five classes:

| RESPONSE TYPE | CODES |
|-----|-------------|
| Informational responses | (100 – 199) |
|Successful responses | (200 – 299)|
|Redirection messages | (300 – 399)|
|Client error responses |(400 – 499)|
|Server error responses | (500 – 599)|


| Code | RESPONSE | When it is returned |
|------|----|---------------------|
| 200  | OK | Successful read, update, delete or export |
| 201 | Created | Resource created (register, note, tag, translation or document translation) |
| 400 | Bad Request | Validation failed, invalid ObjectId, no changes sent, wrong current password, translating an archived note, Langbly rejected the text, or an uploaded file isn't a readable PDF |
| 401 | Unauthorized | Missing, invalid or expired JWT cookie, or wrong login credentials |
| 403 | Forbidden | Logged in but not allowed (non-admin on an admin route, not eligible for admin, or viewing an admin account through `/user/fetchUser/:id`) |
| 404 | Not Found | Resource doesn't exist or belongs to another user |
| 409 | Conflict | Duplicate username, contact number, notebook name or tag; already an admin (`setAdmin`) or not an admin (`clearAdmin`) |
| 413 | Content Too Large | An uploaded PDF is over 5 MB, or its text is over 20 000 characters (`/document/translateDoc`) |
| 422 | Unprocessable Content | An uploaded PDF has no readable text, e.g. a scanned document (`/document/translateDoc`) |
| 429 | Too Many Requests | A rate limiter was hit (`loginLimiter`, `registerLimiter`, `passwordUpdateRateLimiter`, `translateLimiter`, `detectLimiter`, `exportLimiter`), or Langbly quota or rate limit reached |
| 500 | Server Error | Unexpected error. Each route catches its own errors; there is no shared error-handler middleware yet |
| 502 | Bad Gateway | Langbly returned an error, timed out, couldn't be reached, or the API key is missing |

## 4. REFERENCES

- https://www.geeksforgeeks.org/software-testing/what-is-an-api/
- https://expressjs.com/en/5x/api/router/
- https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status
- https://blog.postman.com/different-types-of-apis/
- https://www.geeksforgeeks.org/blogs/application-programming-interfaces-api-and-its-types/
- https://langbly.com/docs/
- https://github.com/expressjs/multer
- https://www.npmjs.com/package/pdf-parse
- https://developer.mozilla.org/en-US/docs/Web/API/FormData/Using_FormData_Objects
