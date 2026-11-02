# Note-Nest — API Routes

All API routes from section 5 of the Note-Nest planning document. There are **32 routes** in **8 routers**, each mounted in `app.js`.

## Access levels

| Access | Meaning | Middleware |
|--------|---------|------------|
| Public | No login required | None |
| Protected | Valid JWT (jsonwebtoken) cookie required | `protect` |
| Admin | Logged in and admin flag set | `protect`, `adminOnly` |

## Routers

| Router file | Mounted at | Routes |
|-------------|-----------|--------|
| `authRoutes.js` | `/auth` | 5 |
| `userRoutes.js` | `/user` | 5 |
| `noteRoutes.js` | `/notes` | 8 |
| `notebookRoutes.js` | `/notebooks` | 4 |
| `tagRoutes.js` | `/tags` | 3 |
| `languageRoutes.js` | `/api` | 3 |
| `translationRoutes.js` | `/translation` | 3 |
| `exportRoutes.js` | `/export` | 1 |

---

## 1. Authentication — `/auth`

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/auth/register` | Create account, set JWT cookie | Public |
| POST | `/auth/login` | Authenticate, set JWT cookie | Public |
| POST | `/auth/logout` | Clear JWT cookie | Protected |
| PATCH | `/auth/setAdmin` | Upgrade the logged-in user to admin and re-sign the token (21+ and account age of 3 months; 1 day in development) | Protected |
| PATCH | `/auth/clearAdmin` | Remove admin status and re-sign the token | Protected |

Notes:
- Rate-limited to slow brute-force attempts.
- The admin flag is stored in the JWT, so `setAdmin` and `clearAdmin` re-issue the cookie for the change to take effect immediately.

## 2. User — `/user`

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/user/me` | Get the logged-in user's profile | Protected |
| PATCH | `/user/editProfile` | Edit profile details and default languages | Protected |
| PATCH | `/user/editPassword` | Change password (current password required) | Protected |
| GET | `/user/fetchUsers` | Fetch all users | Admin |
| DELETE | `/user/deleteUser/:id` | Delete a user and all their data | Admin |

Notes:
- Responses never include the password field.

## 3. Notes — `/notes`

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/notes` | List notes (query: `notebook`, `tag`, `search`, `language`, `archived`, `page`, `limit`) | Protected |
| GET | `/notes/trash` | List trashed notes | Protected |
| GET | `/notes/:id` | Get a single note | Protected |
| POST | `/notes` | Create a note | Protected |
| PATCH | `/notes/:id` | Update title, content, language, tags, pin or archive | Protected |
| PATCH | `/notes/:id/restore` | Restore from trash | Protected |
| DELETE | `/notes/:id` | Soft delete (move to trash) | Protected |
| DELETE | `/notes/:id/permanent` | Permanently delete the note and its translations | Protected |

Notes:
- Declare `/notes/trash` before `/notes/:id` so Express does not treat "trash" as an ID.

## 4. Notebooks — `/notebooks`

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/notebooks` | List notebooks with note counts | Protected |
| POST | `/notebooks` | Create a notebook | Protected |
| PATCH | `/notebooks/:id` | Rename or recolour a notebook | Protected |
| DELETE | `/notebooks/:id` | Delete a notebook; unassign its notes | Protected |

## 5. Tags — `/tags`

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/tags` | List tags with usage counts | Protected |
| POST | `/tags` | Create a tag | Protected |
| DELETE | `/tags/:id` | Delete a tag; `$pull` it from notes | Protected |

## 6. Language API (Langbly v2) — `/api`

| Method | Endpoint | Calls Langbly v2 | Description | Access |
|--------|----------|------------------|-------------|--------|
| GET | `/api/languages` | `GET /language/translate/v2/languages` | Supported languages for dropdowns (query: `target`) | Protected |
| POST | `/api/detect` | `POST /language/translate/v2/detect` | Detect the language of text (body: `q`) | Protected |
| POST | `/api/translate` | `POST /language/translate/v2` | Translate text without saving (body: `q`, `target`, `source`) | Protected |

Langbly connection settings:

| Setting | Value |
|---------|-------|
| Base URL | `https://api.langbly.com` (EU data residency: `https://eu.langbly.com`) |
| Path prefix | `/language/translate/v2` |
| Auth header | `Authorization: Bearer <LANGBLY_API_KEY>` |
| Content type | `application/json` (POST requests) |

Notes:
- The base URL and key are stored in `.env` as `LANGBLY_BASE_URL` and `LANGBLY_API_KEY`, so the key never reaches the browser.
- Cache the languages list in memory (e.g. 24 hours) to save calls.

## 7. Translations — `/translation`

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/translation/fetch` | List the user's saved translations (query: `note`, `targetLanguage`, `page`, `limit`) | Protected |
| POST | `/translation/save` | Save a translation (body: `note`, `sourceText`, `translatedText`, `sourceLanguage`, `targetLanguage`) | Protected |
| DELETE | `/translation/delete/:id` | Delete a saved translation | Protected |

Notes:
- Save returns 400 if the note is archived or does not belong to the user.
- Translate flow: pick a note on `/translate` → `POST /api/translate` → review result → `POST /translation/save`.

## 8. Export — `/export`

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/export` | Download data as a file (query: `type` = `notes` \| `archived` \| `translations`, `format` = `csv` \| `xlsx`) | Protected |

Notes:
- One endpoint backs the single export form.
- Files are built with `exceljs` and sent with a `Content-Disposition: attachment` header.
- Only the user's own data is exported; trashed notes are excluded.

---

## All routes at a glance

| # | Method | Endpoint | Access |
|---|--------|----------|--------|
| 1 | POST | `/auth/register` | Public |
| 2 | POST | `/auth/login` | Public |
| 3 | POST | `/auth/logout` | Protected |
| 4 | PATCH | `/auth/setAdmin` | Protected |
| 5 | PATCH | `/auth/clearAdmin` | Protected |
| 6 | GET | `/user/me` | Protected |
| 7 | PATCH | `/user/editProfile` | Protected |
| 8 | PATCH | `/user/editPassword` | Protected |
| 9 | GET | `/user/fetchUsers` | Admin |
| 10 | DELETE | `/user/deleteUser/:id` | Admin |
| 11 | GET | `/notes` | Protected |
| 12 | GET | `/notes/trash` | Protected |
| 13 | GET | `/notes/:id` | Protected |
| 14 | POST | `/notes` | Protected |
| 15 | PATCH | `/notes/:id` | Protected |
| 16 | PATCH | `/notes/:id/restore` | Protected |
| 17 | DELETE | `/notes/:id` | Protected |
| 18 | DELETE | `/notes/:id/permanent` | Protected |
| 19 | GET | `/notebooks` | Protected |
| 20 | POST | `/notebooks` | Protected |
| 21 | PATCH | `/notebooks/:id` | Protected |
| 22 | DELETE | `/notebooks/:id` | Protected |
| 23 | GET | `/tags` | Protected |
| 24 | POST | `/tags` | Protected |
| 25 | DELETE | `/tags/:id` | Protected |
| 26 | GET | `/api/languages` | Protected |
| 27 | POST | `/api/detect` | Protected |
| 28 | POST | `/api/translate` | Protected |
| 29 | GET | `/translation/fetch` | Protected |
| 30 | POST | `/translation/save` | Protected |
| 31 | DELETE | `/translation/delete/:id` | Protected |
| 32 | GET | `/export` | Protected |

**Totals:** 2 Public · 28 Protected · 2 Admin

---

## Status codes

| Code | When it is returned |
|------|---------------------|
| 200 OK | Successful read, update, delete or export |
| 201 Created | Resource created (register, note, notebook, tag or translation) |
| 400 Bad Request | Validation failed, or translating an archived note |
| 401 Unauthorized | Missing or invalid JWT |
| 403 Forbidden | Logged in but not allowed (e.g. non-admin on admin route, or not eligible for admin) |
| 404 Not Found | Resource does not exist or belongs to another user |
| 409 Conflict | Duplicate username, email, notebook name or tag |
| 429 Too Many Requests | Rate limit hit, or Langbly quota exceeded |
| 500 Server Error | Unexpected error, handled by errorHandler middleware |
| 502 Bad Gateway | Langbly returned an error or could not be reached |