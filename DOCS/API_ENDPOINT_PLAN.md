# Note-Nest — API Routes

All API routes for Note-Nest, as built in `server/routes` plus the ones still planned. There are **37 routes** across **9 routers**. Seven routers are mounted in [app.js](../server/app.js); `notebookRoutes.js` and `exportRoutes.js` are still empty and not mounted.

_Last updated: 2026-11-07_

## Status key

| Status | Meaning |
|--------|---------|
| ✅ Done | Implemented and working |
| ⚠️ Fix | Implemented but has a known bug (see the router's notes) |
| 🚧 Stub | Route is declared with its auth check, but the handler is empty (no response yet) |
| 📝 Planned | Not in the code yet |

## Access levels

| Access | Meaning | Middleware ([middleware.js](../server/routes/middleware.js)) |
|--------|---------|------------|
| Public | No login required | None |
| Protected | Valid JWT in the HTTP-only `token` cookie | `checkJwtToken` |
| Admin | Logged in and the account's `admin` flag is `true` (checked against the database, not the token) | `checkJwtToken`, `checkAdmin` |

Notes:
- `checkJwtToken` reads the token from `req.cookies.token` (set by `/auth/login`) and puts the decoded payload on `req.user`. The payload is `{ id, isAdmin }`, so handlers read the user ID as `req.user.id`.
- Other middleware: `hashPassword` (skipped in development, so passwords are stored as plaintext), `checkPassword` (min 8 characters and one special character), plus `checkConsent` and `checkAge`, which are exported but not used by any route yet.
- The client reaches the server through the CRA proxy (`"proxy": "http://localhost:3001"` in `client/package.json`), so requests use relative paths such as `/notes/fetchNotes`.

## Routers

| Router file | Mounted at | Routes | Status |
|-------------|-----------|--------|--------|
| [authRoutes.js](../server/routes/authRoutes.js) | `/auth` | 5 | All done |
| [userRoutes.js](../server/routes/userRoutes.js) | `/user` | 6 | 5 done, 1 planned |
| [noteRoutes.js](../server/routes/noteRoutes.js) | `/notes` | 8 | 4 done, 3 stubs, 1 planned |
| [archiveRoutes.js](../server/routes/archiveRoutes.js) | `/archive` | 4 | All done |
| [notebookRoutes.js](../server/routes/notebookRoutes.js) | `/notebooks` (not mounted) | 4 | File is empty; all planned |
| [tagRoutes.js](../server/routes/tagRoutes.js) | `/tag` | 3 | 2 done, 1 planned |
| [apiRoutes.js](../server/routes/apiRoutes.js) | `/api` | 3 | All done |
| [translationRoutes.js](../server/routes/translationRoutes.js) | `/translation` | 3 | 3 done |
| [exportRoutes.js](../server/routes/exportRoutes.js) | `/export` (not mounted) | 1 | File is empty; planned |

---

## 1. Authentication — `/auth`

| Method | Endpoint | Description | Access | Status |
|--------|----------|-------------|--------|--------|
| POST | `/auth/register` | Create an account. Does **not** log the user in; returns `201 { message, userId }` | Public | ✅ |
| POST | `/auth/login` | Check username and password, set the `token` cookie; returns `{ userId, fullName, isAdmin }` | Public | ✅ |
| POST | `/auth/logout` | Clear the `token` cookie | Protected | ✅ |
| PATCH | `/auth/setAdmin` | Make the logged-in user an admin (21+ and account age of 3 months; 1 day in development) and re-set the `token` cookie | Protected | ✅ |
| PATCH | `/auth/clearAdmin` | Remove admin status from the logged-in user and re-set the `token` cookie | Protected | ✅ |

Notes:
- **Register body:** `username`, `fullName.{firstName,lastName}`, `contactDetails.{email,contactNumber}`, `dateOfBirth`, `password`, `adminDataConsent` (must be `true`), and optional flat `defaultSourceLang`, `defaultTargetLang`, `defaultNoteLang`. The user is built from named fields only, so `admin` can't be set here.
- Login uses the same `401 "Invalid credentials"` for an unknown username and a wrong password, so usernames can't be guessed.
- Cookie settings: `httpOnly`, `sameSite: 'strict'`, `secure` outside development, and it expires with the token (`JWT_EXPIRATION`, default `12h`).
- Duplicate username or contact number on register returns **409**.
- `/login`, `/setAdmin` and `/clearAdmin` all sign the token with the shared `setTokenCookie` helper (payload `{ id, isAdmin }`) and return the same user shape (`sessionUser`). `setAdmin` and `clearAdmin` respond `200 { message, user: { userId, fullName, isAdmin } }`; the token is never sent in the body.
- `setAdmin` returns **403** if the user is under 21 or the account is too new, and **409** if they're already an admin. `clearAdmin` returns **409** if they're not an admin.
- `/login` and `/register` are rate-limited (`authLimiter`, `express-rate-limit`): 10 requests per IP per 15 minutes, then **429** *"Too many attempts — please wait a few minutes and try again."*

## 2. User — `/user`

| Method | Endpoint | Description | Access | Status |
|--------|----------|-------------|--------|--------|
| GET | `/user/me` | Get the logged-in user's profile | Protected | ✅ |
| GET | `/user/fetchUsers` | Get every user, newest first | Admin | ✅ |
| GET | `/user/fetchUser/:id` | Get one user for the Users page details panel. Returns 403 for admin accounts | Admin | ✅ |
| PATCH | `/user/editProfile` | Edit profile details and default languages (only fields sent are changed) | Protected | ✅ |
| PATCH | `/user/editPassword` | Change password (current password required) | Protected | ✅ |
| DELETE | `/user/deleteUser/:id` | Delete a user and all their data | Admin | 📝 |

Notes:
- Responses never include the password field.
- **editProfile body:** `username`, `fullName.{firstName,lastName}`, `contactDetails.{email,contactNumber}`, `defaultSourceLang`, `defaultTargetLang`, `defaultNoteLang`. Blank or non-string values are ignored. Returns 400 if nothing changed, or if the source and target languages would match. Duplicate username or contact number returns **409**. Responds `{ message, user }`.
- **editPassword body:** `currentPassword`, `newPassword`. Returns 400 if the new password matches the current one, fails `checkPassword`, or the current password is wrong (400, not 401, so the client doesn't treat it as an expired session).

## 3. Notes — `/notes`

| Method | Endpoint | Description | Access | Status |
|--------|----------|-------------|--------|--------|
| GET | `/notes/fetchNotes` | List active notes (not archived or trashed), pinned first and then most recently updated. Notebook (`name`, `colour`) and tags (`name`) are populated | Protected | ✅ |
| GET | `/notes/trash` | List trashed notes | Protected | 🚧 |
| GET | `/notes/:id` | Get a single note | Protected | 📝 |
| POST | `/notes/addNote` | Create a note | Protected | ✅ |
| PATCH | `/notes/:id` | Update title, content, language, notebook, tags or pin (archiving uses `/archive/:id`) | Protected | ✅ |
| PATCH | `/notes/:id/restore` | Restore a note from the trash | Protected | 🚧 |
| DELETE | `/notes/delete/:id` | Soft delete: set `deletedAt` and unpin the note | Protected | ✅ |
| DELETE | `/notes/:id/permanent` | Permanently delete a note and its translations | Protected | 🚧 |

Notes:
- **Body for `addNote` and `PATCH /:id`:** `title`, `content` (HTML, required and not blank), `language`, `notebook` (ID, or `null`/`''` for no notebook), `tags` (array of tag **names**), `isPinned`. Tag names are lowercased and de-duplicated, and any tag the user doesn't have yet is created. A tag name over 30 characters returns 400.
- On create, a blank title becomes `Untitled`, and a missing `language` falls back to the user's `defaultNoteLanguage` (or `en`). `plainText` is generated from `content` by the schema; never send it.
- `PATCH /:id` only edits active notes, so archived or trashed notes return 404. Sending no fields returns 400 `"No changes were sent"`.
- A notebook ID that isn't valid returns 400; one that doesn't belong to the user returns 404.
- Trashed notes are purged automatically 30 days after `deletedAt` (TTL index in `noteSchema`).
- `/notes/fetchNotes` takes no query parameters yet. Planned filters: `notebook`, `tag`, `search` (text index on `title` and `plainText`), `language`, `page`, `limit`.
- Declare `/notes/trash` before any `GET /notes/:id` route so Express doesn't treat "trash" as an ID.
- The stub routes already use `checkJwtToken`, so they return 401 without a login.

## 4. Archive — `/archive`

| Method | Endpoint | Description | Access | Status |
|--------|----------|-------------|--------|--------|
| GET | `/archive/fetchNotes` | List archived notes | Protected | ✅ |
| PATCH | `/archive/:id` | Archive an active note (also unpins it) | Protected | ✅ |
| PATCH | `/archive/:id/restore` | Unarchive: move the note back to the main notes list | Protected | ✅ |
| DELETE | `/archive/:id` | Move an archived note to the trash | Protected | ✅ |

Notes:
- `PATCH /archive/:id` returns 404 if the note doesn't exist, is in the trash, or is already archived.
- Archived notes can't be edited (`PATCH /notes/:id`) or translated (`POST /translation/save`).
- The stub routes already use `checkJwtToken`, so they return 401 without a login.

## 5. Notebooks — `/notebooks` (planned)

`notebookRoutes.js` is empty and isn't mounted in `app.js` yet. The model ([notebookSchema.js](../server/models/notebookSchema.js)) already exists.

| Method | Endpoint | Description | Access | Status |
|--------|----------|-------------|--------|--------|
| GET | `/notebooks` | List notebooks with note counts | Protected | 📝 |
| POST | `/notebooks` | Create a notebook (`name` max 80 characters, `colour` hex, default `#1F4E79`) | Protected | 📝 |
| PATCH | `/notebooks/:id` | Rename or recolour a notebook | Protected | 📝 |
| DELETE | `/notebooks/:id` | Delete a notebook; set its notes' `notebook` to `null` | Protected | 📝 |

Notes:
- Notebook names are unique per user (`{ user, name }` index), so a duplicate returns **409**.
- The other routers use action names (`/fetchNotes`, `/addTag`). Pick one style for these routes (e.g. `/notebooks/fetchNotebooks`, `/notebooks/addNotebook`) and update this table to match.

## 6. Tags — `/tag`

| Method | Endpoint | Description | Access | Status |
|--------|----------|-------------|--------|--------|
| GET | `/tag/fetchTags` | List tags A–Z, each with `noteCount` (active notes using it) | Protected | ✅ |
| POST | `/tag/addTag` | Create a tag (body: `name`) | Protected | ✅ |
| DELETE | `/tag/:id` | Delete a tag and `$pull` it from every note | Protected | 📝 |

Notes:
- Tag names are trimmed, stored lowercase, max 30 characters, and unique per user, so a duplicate returns **409**.
- Tags are also created automatically when a note is saved with a tag name the user doesn't have yet (see [Notes](#3-notes--notes)).

## 7. Language API (Langbly v2) — `/api`

Each route forwards to the Langbly endpoint with the same path, so the API key never reaches the browser.

| Method | Endpoint | Calls Langbly v2 | Description | Access | Status |
|--------|----------|------------------|-------------|--------|--------|
| GET | `/api/language/translate/v2/languages` | `GET /language/translate/v2/languages?target=en` | Supported languages for dropdowns, as `[{ code, name }]` sorted by name | Protected | ✅ |
| POST | `/api/language/translate/v2/detect` | `POST /language/translate/v2/detect` | Detect the language of text. Body: `{ sourceText }`. Returns `{ language, name, confidence, isReliable }`; `language` is `null` if undetermined | Protected | ✅ |
| POST | `/api/language/translate/v2` | `POST /language/translate/v2` | Translate text without saving. Body: `{ sourceText, sourceLanguage, targetLanguage }` | Protected | ✅ |

Translate response: `{ translatedText, sourceLanguage, targetLanguage, detectedLanguage, detectedLanguageName }`. When `sourceLanguage` is blank or `auto`, Langbly detects it and the detected code is returned as `sourceLanguage`, ready to save.

Langbly connection settings:

| Setting | Value |
|---------|-------|
| Base URL | `LANGBLY_BASE_URL`, default `https://api.langbly.com` (EU data residency: `https://eu.langbly.com`) |
| Path prefix | `/language/translate/v2` |
| Auth headers | `X-API-Key: <LANGBLY_API_KEY>` and `Authorization: Bearer <LANGBLY_API_KEY>` (both are sent) |
| Content type | `application/json` (POST requests) |
| Format | `text` (so results aren't HTML-escaped) |
| Timeout | 15 seconds |

Notes:
- The base URL and key are stored in `.env` as `LANGBLY_BASE_URL` and `LANGBLY_API_KEY`.
- The languages list is cached in memory for 24 hours. If Langbly returns a code without a name, the name comes from [langaugeData.js](../server/util/langaugeData.js).
- Text is limited to **10,000** characters per request (`MAX_TRANSLATION_CHARS`, Langbly's free-tier limit).
- Language codes must match `languageCodeRegex` (e.g. `en`, `zu`, `zh-CN`). The source and target languages must differ.
- Langbly errors are mapped to 400 (rejected text or code), 429 (quota or rate limit) and 502 (unreachable, timed out, missing or rejected key). A rejected key is never passed on as a 401, which would log the user out.

## 8. Translations — `/translation`

| Method | Endpoint | Description | Access | Status |
|--------|----------|-------------|--------|--------|
| GET | `/translation/fetch` | List saved translations (query: `note`, `targetLanguage`, `page`, `limit`) | Protected | ✅ |
| POST | `/translation/save` | Save a translation | Protected | ✅ |
| DELETE | `/translation/delete/:id` | Delete a saved translation | Protected | ✅ |

Notes:
- **Save body:** `sourceText`, `translatedText`, `sourceLanguage`, `targetLanguage` (all required), and optional `note` (ID). Responds `201 { message, created: true, translation }`.
- `note` is optional, so free text typed into the Translate form can be saved too. If it is sent, it must be a note the user owns that isn't trashed or archived, otherwise 400.
- `characterCount` is set by the schema.
- Translate flow: type or paste text on `/translate` → `POST /api/language/translate/v2` → review result → `POST /translation/save`.

## 9. Export — `/export` (planned)

`exportRoutes.js` is empty and isn't mounted in `app.js` yet.

| Method | Endpoint | Description | Access | Status |
|--------|----------|-------------|--------|--------|
| GET | `/export` | Download data as a file (query: `type` = `notes` \| `archived` \| `translations`, `format` = `csv` \| `xlsx`) | Protected | 📝 |

Notes:
- One endpoint backs the single export form.
- Build files with `exceljs` and send them with a `Content-Disposition: attachment` header.
- Only export the user's own data; never include trashed notes.

---

## All routes at a glance

| # | Method | Endpoint | Access | Status |
|---|--------|----------|--------|--------|
| 1 | POST | `/auth/register` | Public | ✅ |
| 2 | POST | `/auth/login` | Public | ✅ |
| 3 | POST | `/auth/logout` | Protected | ✅ |
| 4 | PATCH | `/auth/setAdmin` | Protected | ✅ |
| 5 | PATCH | `/auth/clearAdmin` | Protected | ✅ |
| 6 | GET | `/user/me` | Protected | ✅ |
| 7 | GET | `/user/fetchUsers` | Admin | ✅ |
| 8 | GET | `/user/fetchUser/:id` | Admin | ✅ |
| 9 | PATCH | `/user/editProfile` | Protected | ✅ |
| 10 | PATCH | `/user/editPassword` | Protected | ✅ |
| 11 | DELETE | `/user/deleteUser/:id` | Admin | 📝 |
| 12 | GET | `/notes/fetchNotes` | Protected | ✅ |
| 13 | GET | `/notes/trash` | Protected | 🚧 |
| 14 | GET | `/notes/:id` | Protected | 📝 |
| 15 | POST | `/notes/addNote` | Protected | ✅ |
| 16 | PATCH | `/notes/:id` | Protected | ✅ |
| 17 | PATCH | `/notes/:id/restore` | Protected | 🚧 |
| 18 | DELETE | `/notes/delete/:id` | Protected | ✅ |
| 19 | DELETE | `/notes/:id/permanent` | Protected | 🚧 |
| 20 | GET | `/archive/fetchNotes` | Protected | ✅ |
| 21 | PATCH | `/archive/:id` | Protected | ✅ |
| 22 | PATCH | `/archive/:id/restore` | Protected | ✅ |
| 23 | DELETE | `/archive/:id` | Protected | ✅ |
| 24 | GET | `/notebooks` | Protected | 📝 |
| 25 | POST | `/notebooks` | Protected | 📝 |
| 26 | PATCH | `/notebooks/:id` | Protected | 📝 |
| 27 | DELETE | `/notebooks/:id` | Protected | 📝 |
| 28 | GET | `/tag/fetchTags` | Protected | ✅ |
| 29 | POST | `/tag/addTag` | Protected | ✅ |
| 30 | DELETE | `/tag/:id` | Protected | 📝 |
| 31 | GET | `/api/language/translate/v2/languages` | Protected | ✅ |
| 32 | POST | `/api/language/translate/v2/detect` | Protected | ✅ |
| 33 | POST | `/api/language/translate/v2` | Protected | ✅ |
| 34 | GET | `/translation/fetch` | Protected | ✅ |
| 35 | POST | `/translation/save` | Protected | ✅ |
| 36 | DELETE | `/translation/delete/:id` | Protected | ✅ |
| 37 | GET | `/export` | Protected | 📝 |

**Totals by access:** 2 Public · 32 Protected · 3 Admin
**Totals by status:** 21 Done · 6 Stub · 10 Planned

---

## Status codes

| Code | When it is returned |
|------|---------------------|
| 200 OK | Successful read, update, delete or export |
| 201 Created | Resource created (register, note, tag or translation) |
| 400 Bad Request | Validation failed, invalid ObjectId, no changes sent, wrong current password, translating an archived note, or Langbly rejected the text |
| 401 Unauthorized | Missing, invalid or expired JWT cookie, or wrong login credentials |
| 403 Forbidden | Logged in but not allowed (non-admin on an admin route, not eligible for admin, or viewing an admin account through `/user/fetchUser/:id`) |
| 404 Not Found | Resource doesn't exist or belongs to another user |
| 409 Conflict | Duplicate username, contact number, notebook name or tag; already an admin (`setAdmin`) or not an admin (`clearAdmin`) |
| 429 Too Many Requests | `/auth/login` or `/auth/register` rate limit hit, or Langbly quota or rate limit reached |
| 500 Server Error | Unexpected error. Each route catches its own errors; there is no shared error-handler middleware yet |
| 502 Bad Gateway | Langbly returned an error, timed out, couldn't be reached, or the API key is missing |
