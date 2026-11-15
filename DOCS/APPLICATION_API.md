# APPLICATION PROGRAMMING INTERFACE `(API)` INTEGRATION


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
 - [2.9. EXPORT ROUTES](#29-export-routes)
3. [REFERENCES](#3-references)

- *View [GLOSSARY.md](../GLOSSARY.md) for terminology*
---

## 1. OVERVIEW 

An `API` call is a request by a software application to access data or any other service from another application or any other server.
The term `API` can refer to many types of services, and developers have many choices for how their *`APIs`* are architected and what protocols and standards they use.
`REST  APIs` use `JSON` (most common), `XML`, `HTML`, or plain text format. `REST APIs` are the most common APIs used across the web today. `HTTP` is an application-layer protocol for fetching resources such as `HTML` .

**REST API's**

| **HTTP Verb** | **CRUD Operation** | **Description** |
|--------|-------|------|
| POST | CREATE | Used to submit data about a specific entity to the server |
| GET | READ | Used to fetch information from the database |
| PUT | UPDATE | Full replacement update of a resource on the database |
| PATCH | UPDATE | Partial update of a resource on the database |
| DELETE | DELETE | Deletes a specific resource |


## 1.1. ROUTERS

A *`router`* object is an instance of middleware and routes.
The top-level express object has a Router() method that creates a new router object. 

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
| [exportRoutes.js](../server/routes/exportRoutes.js) | `/export` | [EXPORT_ROUTES.md](../routeDocs/EXPORT_ROUTES.md)|

## 2. APPLICATION ENDPOINTS 

<!-- list all requests -->
### 2.1 AUTH ROUTES

The router is mounted at **`/auth`** by [`app.js`](../server/app.js). 


| METHOD | ENDPOINT | AUTH | MIDDLEWARE | DESCRIPTION/PURPOSE |
|--------|----------|------|------------|---|
|`POST`| `/auth/login` | NONE |`loginLimiter` | Check credentials and set the JWT cookie |
|`POST`| `/auth/register` | NONE |`registerLimiter`, `checkPassword`, `hashPassword` | Create a new user |
 `POST` | `/logout` | | none | Clear the JWT cookie |
|`PATCH`| `/auth/setAdmin` | JWT|`checkJwtToken` | Upgrade the logged-in user to admin (21+, minimum account age) |
|`PATCH`|`auth/clearAdmin` | JWT | |Remove admin status from the logged-in user|


### 2.2. USER ROUTES

The router is mounted at **`/user`** by [`app.js`](../server/app.js). 

| METHOD | ENDPOINT | AUTH | MIDDLEWARE | DESCRIPTION/PURPOSE |
|--------|----------|------|------------|---|
| `GET` | `/me` | JWT |`checkJwtToken`, | Own profile (used by `App.js` for `currentUser`, and by Settings) |
| `GET` | `/fetchUsers` | JWT| `checkJwtToken`, `checkAdmin` | **Admin** | All users, for the Users table |
| `GET` | `/fetchUser/:id` |JWT| `checkJwtToken`, `checkAdmin` | **Admin** | One non-admin user, for the details panel |
| `PATCH` | `/editProfile` | JWT |`checkJwtToken` | Any user | Update own profile and default languages |
| `PATCH` | `/editPassword` | JWT |`checkJwtToken`, `checkPasswordChange`, `checkPassword`, `passwordUpdateRateLimiter`, `hashPassword` | Any user | Change own password (signs out other sessions) |
| `DELETE` | `/deleteUser/:id` | JWT |`checkJwtToken`, `checkAdmin` | **Admin** | Remove a non-admin user and **all** their data |

### 2.3. NOTE ROUTES


| METHOD | ENDPOINT | AUTH | MIDDLEWARE | DESCRIPTION/PURPOSE |
|--------|----------|------|------------|---|
| `GET` | `/fetchNotes`| JWT | `checkJwtToken` | |
| `GET` | `/trash` | JWT |`checkJwtToken` | |
| `GET` | `/:id` |JWT |`checkJwtToken` | |
| `POST` | `/addNote` | JWT |`checkJwtToken` | Creates a note |
| `PATCH` | `/:id` | JWT |`checkJwtToken` | Edit title, content, language, notebook, tags or pin | 
| `PATCH` | `/:id/restore`| JWT | `checkJwtToken` | Restore from the trash | trashed |
| `DELETE` | `/:id` | JWT | `checkJwtToken` |  Move to the trash (soft delete) | 
| `DELETE` | `/:id/permanent` | JWT | `checkJwtToken` | Delete for good, along with its translations | 

### 2.4. ARCHIVE ROUTES

The router is mounted at **`/archive`** in [`app.js`](../server/app.js). 

Archive routes are used for notes and translations.  

**NOTES**

| METHOD | ENDPOINT | AUTH | MIDDLEWARE | DESCRIPTION/PURPOSE |
|--------|----------|------|------------|---|
| `GET` | `/archive/fetchNotes` | JWT |`checkJwtToken` | List the user's archived notes | 
| `PATCH` | `/archive/:id` | JWT | `checkJwtToken` | Archive an active note | **active** (not archived, not trashed) | 
| `PATCH` | `/archive/:id/restore` | `checkJwtToken` | Return a note to the main list | **archived**, not trashed |
| `DELETE` | `/archive/:id` | `checkJwtToken` | Move an archived note to the trash | **archived**, not trashed |

**Translations**

| METHOD | ENDPOINT | AUTH | MIDDLEWARE | DESCRIPTION/PURPOSE |
|--------|----------|------|------------|---|
| `GET` | `/archive/fetchTranslations` | JWT |`checkJwtToken` | List the user's archived translations | archived, not trashed |
| `PATCH` | `/archive/translation/:id` | JWT |`checkJwtToken` | Archive an active translation **active** (not archived, not trashed) |
| `PATCH` | `/archive/translation/:id/restore`| JWT | `checkJwtToken` | Return a translation to the main list, **archived**, not trashed |
| `DELETE` | `/archive/translation/:id` | JWT |`checkJwtToken` | Move an archived translation to the trash, **archived**, not trashed |


### 2.5. NOTEBOOK ROUTES

| METHOD | ENDPOINT | AUTH | MIDDLEWARE | DESCRIPTION/PURPOSE |
|--------|----------|------|------------|---|
| `GET` | `/notebooks` | JWT |`checkJwtToken` | List the user's notebooks A–Z (ignoring case), each with a count of active notes |
| `POST` | `/notebooks` | JWT | `checkJwtToken` | Create a notebook |
| `PATCH` | `/notebooks/:id` | JWT | `checkJwtToken` | Rename and/or recolour a notebook |
| `DELETE` | `/notebooks/:id` |JWT | `checkJwtToken` | Delete a notebook; its notes move to "No notebook" |

### 2.6 TAG ROUTES

| METHOD | ENDPOINT | AUTH | MIDDLEWARE | DESCRIPTION/PURPOSE |
|--------|----------|------|------------|---|
| `GET` | `/tag/fetchTags` |JWT | `checkJwtToken` | List the user's tags A–Z, each with a note count |
| `POST` | `/tag/addTag` |JWT | `checkJwtToken` | Create a tag |
| `PUT` | `/tag/:id` |JWT | `checkJwtToken` | Rename a tag |
| `DELETE` | `/tag/:id` |JWT | `checkJwtToken` | Delete a tag and remove it from every note |

### 2.7. API ROUTES

[`apiRoutes.js`](../server/routes/apiRoutes.js) is the Express router that sits between the React frontend and the **Langbly** translation API. 
Langbly provides a Google Translate v2 compatible endpoint you can call from your app to translate text (or HTML) into a target language. The browser never talks to Langbly directly. It calls this server, and this server adds the secret API key, validates the input, forwards the request, and turns Langbly's answer (or error) into a clean response.

```
React (TranslateForm)  ──►  /api/language/translate/v2/...  ──►  Langbly API
       ▲                        (this router)                       │
       └────────────── clean JSON / safe error message ◄────────────┘
```

The router is mounted at **`/api`** by `app.js`, so every path below starts with `/api`.

| METHOD | ENDPOINT | AUTH | MIDDLEWARE | DESCRIPTION/PURPOSE |
|--------|----------|------|------------|---|
| `GET` | `/api/language/translate/v2/languages` | `checkJwtToken` | Supported languages for the dropdowns (cached 24h) |
| `POST` | `/api/language/translate/v2` | `translateLimiter`, `checkJwtToken` | Translate text (does **not** save) |
| `POST` | `/api/language/translate/v2/detect` | `detectLimiter`, `checkJwtToken` | Detect the language while the user types |

#### Langbly connection settings:

Langbly uses API keys for the translate endpoint. for authentication. 
The base URL and key are stored in `.env` as `LANGBLY_BASE_URL` and `LANGBLY_API_KEY`.

```js
require('dotenv').config();
```
````js
// apiRoutes.js (read from .env)
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

### 2.8. TRANSLATION ROUTES

| Method | Full Path | Middleware | Purpose | Translation Must Be | Sets |
|---|---|---|---|---|---|
| `GET` | `/archive/fetchTranslations` | `checkJwtToken` | List the user's archived translations | archived, not trashed | — |
| `PATCH` | `/archive/translation/:id` | `checkJwtToken` | Archive an active translation | **active** (not archived, not trashed) | `isArchived: true`, `archivedAt: now` |
| `PATCH` | `/archive/translation/:id/restore` | `checkJwtToken` | Return a translation to the main list | **archived**, not trashed | `isArchived: false`, `archivedAt: null` |
| `DELETE` | `/archive/translation/:id` | `checkJwtToken` | Move an archived translation to the trash | **archived**, not trashed | `deletedAt: now`, `isArchived: false`, `archivedAt: null` |

### 2.9. EXPORT ROUTES

The router is mounted at **`/export`** by [`app.js`](../server/app.js). There's a **single route**.

| METHOD | ENDPOINT | AUTH | MIDDLEWARE | DESCRIPTION/PURPOSE |
|--------|----------|------|------------|---|
| `GET` | `/export` | JWT  |`exportLimiter`, `checkJwtToken` | Download notes or translations as `.csv` / `.xlsx` |

 - Download data as a file (query: type = notes \| translations, format = csv \| xlsx, + filters) 
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
| 201 | Created | Resource created (register, note, tag or translation) |
| 400 | Bad Request | Validation failed, invalid ObjectId, no changes sent, wrong current password, translating an archived note, or Langbly rejected the text |
| 401 | Unauthorized | Missing, invalid or expired JWT cookie, or wrong login credentials |
| 403 | Forbidden | Logged in but not allowed (non-admin on an admin route, not eligible for admin, or viewing an admin account through `/user/fetchUser/:id`) |
| 404 | Not Found | Resource doesn't exist or belongs to another user |
| 409 | Conflict | Duplicate username, contact number, notebook name or tag; already an admin (`setAdmin`) or not an admin (`clearAdmin`) |
| 429 | Too Many Requests | `/auth/login` or `/auth/register` rate limit hit, or Langbly quota or rate limit reached |
| 500 | Server Error | Unexpected error. Each route catches its own errors; there is no shared error-handler middleware yet |
| 502 | Bad Gateway | Langbly returned an error, timed out, couldn't be reached, or the API key is missing |

## 4. REFERENCES

- https://expressjs.com/en/5x/api/router/
- https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status
- https://blog.postman.com/different-types-of-apis/
- https://www.geeksforgeeks.org/blogs/application-programming-interfaces-api-and-its-types/
- https://langbly.com/docs/