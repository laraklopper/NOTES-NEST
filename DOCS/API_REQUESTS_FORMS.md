# API REQUESTS AND FORMS

Client-side requests and forms for the 32 routes in [API_ENDPOINT_PLAN.md](API_ENDPOINT_PLAN.md).

## TABLE OF CONTENTS
1. [REQUESTS SUMMARY](#1-requests-summary)
2. [FORMS](#2-forms)
3. [ERROR HANDLING](#3-error-handling)

## 1. REQUESTS SUMMARY

### 1.1. DEFAULT API'S

Requests that run by default after login, page load or npm start (no user action needed).

| # | METHOD | SERVER SIDE FILE | CLIENT SIDE FILE | ENDPOINT | ACCESS |
|---|--------|------------------|------------------|----------|--------|
| 1 | GET | [userRoutes.js](../server/routes/userRoutes.js) | [App.js](../client/src/App.js), [Home.js](../client/src/pages/Home.js) | `/user/me` | Protected |
| 2 | GET | [userRoutes.js](../server/routes/userRoutes.js) | [App.js](../client/src/App.js) → [Users.js](../client/src/pages/Users.js) | `/user/fetchUsers` | Admin |
| 3 | GET | [languageRoutes.js](../server/routes/languageRoutes.js) | [Register.js](../client/src/pages/Register.js), [Home.js](../client/src/pages/Home.js), [NotePad.js](../client/src/pages/NotePad.js), [Translate.js](../client/src/pages/Translate.js) | `/api/languages` | Protected |
| 4 | GET | [notesRoutes.js](../server/routes/notesRoutes.js) | [Notes.js](../client/src/pages/Notes.js), [Translate.js](../client/src/pages/Translate.js) | `/notes` | Protected |
| 5 | GET | [notesRoutes.js](../server/routes/notesRoutes.js) | [NotePad.js](../client/src/pages/NotePad.js) (editing an existing note) | `/notes/:id` | Protected |
| 6 | GET | [notesRoutes.js](../server/routes/notesRoutes.js) | [Trash.js](../client/src/pages/Trash.js) | `/notes/trash` | Protected |
| 7 | GET | [notebookRoutes.js](../server/routes/notebookRoutes.js) | [Notes.js](../client/src/pages/Notes.js), [NotePad.js](../client/src/pages/NotePad.js) | `/notebooks` | Protected |
| 8 | GET | [tagRoutes.js](../server/routes/tagRoutes.js) | [Notes.js](../client/src/pages/Notes.js), [NotePad.js](../client/src/pages/NotePad.js) | `/tags` | Protected |
| 9 | GET | [translateRoutes.js](../server/routes/translateRoutes.js) | [Translate.js](../client/src/pages/Translate.js) | `/translation/fetch` | Protected |

Notes:
- `/user/fetchUsers` only runs when `currentUser.admin` is `true`.
- `/api/languages` is Protected, so the Register page can't call it before login — use the local list in [languageData.js](../client/src/util/languageData.js) there instead.
- The `/translate` page lists notes with `GET /notes?archived=false` so archived notes are never shown.

### 1.2. FORM API REQUESTS

| # | Form | Page / Route | Endpoint | Method | Access |
|---|------|--------------|----------|--------|--------|
| 1 | Login | `/` (logged out) | `/auth/login` | POST | Public |
| 2 | Register | `/reg` | `/auth/register` | POST | Public |
| 3 | Edit Profile | `/` (Home) | `/user/editProfile` | PATCH | Protected |
| 4 | Edit Password | `/` (Home) | `/user/editPassword` | PATCH | Protected |
| 5 | Register as Admin | `/` (Home) | `/auth/setAdmin` | PATCH | Protected |
| 6 | Notepad | `/notepad` | `/notes` (create), `/notes/:id` (update) | POST / PATCH | Protected |
| 7 | Notes Filter / Search | `/notes` | `/notes?…` | GET | Protected |
| 8 | Notebook | `/notes` (sidebar / modal) | `/notebooks` (create), `/notebooks/:id` (update) | POST / PATCH | Protected |
| 9 | Tag | `/notepad` (tag picker) | `/tags` | POST | Protected |
| 10 | Translate | `/translate` | `/api/translate`, `/api/detect` | POST | Protected |
| 11 | Save Translation | `/translate` | `/translation/save` | POST | Protected |
| 12 | Translations Filter | `/translate` | `/translation/fetch?…` | GET | Protected |
| 13 | Export | `/notes`, `/translate` | `/export?…` | GET | Protected |

### 1.3. BUTTON API REQUESTS

| # | Action | Page | Endpoint | Method | Access |
|---|--------|------|----------|--------|--------|
| 1 | Log out | All logged-in pages (Header) | `/auth/logout` | POST | Protected |
| 2 | Clear admin (remove admin status) | `/` (Home) | `/auth/clearAdmin` | PATCH | Protected |
| 3 | Pin / unpin note | `/notes`, `/notepad` | `/notes/:id` (body: `isPinned`) | PATCH | Protected |
| 4 | Archive / unarchive note | `/notes`, `/notepad` | `/notes/:id` (body: `isArchived`) | PATCH | Protected |
| 5 | Move note to trash | `/notes`, `/notepad` | `/notes/:id` | DELETE | Protected |
| 6 | Restore note | `/trash` | `/notes/:id/restore` | PATCH | Protected |
| 7 | Permanently delete note | `/trash` | `/notes/:id/permanent` | DELETE | Protected |
| 8 | Delete notebook | `/notes` (sidebar) | `/notebooks/:id` | DELETE | Protected |
| 9 | Delete tag | `/notes` (tag list) | `/tags/:id` | DELETE | Protected |
| 10 | Detect language | `/translate` | `/api/detect` | POST | Protected |
| 11 | Delete translation | `/translate` | `/translation/delete/:id` | DELETE | Protected |
| 12 | Delete user | `/users` (Admin) | `/user/deleteUser/:id` | DELETE | Admin |

Notes:
- Ask for confirmation before every **DELETE** except *Move note to trash* (it can be undone from `/trash`).
- Permanently deleting a note also deletes its translations; deleting a user deletes all their data.

### 1.4. ROUTE COVERAGE

Every route in [API_ENDPOINT_PLAN.md](API_ENDPOINT_PLAN.md) and where the client uses it (D = default request, F = form, B = button).

| # | Method | Endpoint | Used by |
|---|--------|----------|---------|
| 1 | POST | `/auth/register` | F2 Register |
| 2 | POST | `/auth/login` | F1 Login |
| 3 | POST | `/auth/logout` | B1 Log out |
| 4 | PATCH | `/auth/setAdmin` | F5 Register as Admin |
| 5 | PATCH | `/auth/clearAdmin` | B2 Clear admin |
| 6 | GET | `/user/me` | D1 |
| 7 | PATCH | `/user/editProfile` | F3 Edit Profile |
| 8 | PATCH | `/user/editPassword` | F4 Edit Password |
| 9 | GET | `/user/fetchUsers` | D2 |
| 10 | DELETE | `/user/deleteUser/:id` | B12 Delete user |
| 11 | GET | `/notes` | D4, F7 Notes Filter |
| 12 | GET | `/notes/trash` | D6 |
| 13 | GET | `/notes/:id` | D5 |
| 14 | POST | `/notes` | F6 Notepad (new note) |
| 15 | PATCH | `/notes/:id` | F6 Notepad (edit), B3 Pin, B4 Archive |
| 16 | PATCH | `/notes/:id/restore` | B6 Restore note |
| 17 | DELETE | `/notes/:id` | B5 Move to trash |
| 18 | DELETE | `/notes/:id/permanent` | B7 Permanently delete |
| 19 | GET | `/notebooks` | D7 |
| 20 | POST | `/notebooks` | F8 Notebook (new) |
| 21 | PATCH | `/notebooks/:id` | F8 Notebook (rename / recolour) |
| 22 | DELETE | `/notebooks/:id` | B8 Delete notebook |
| 23 | GET | `/tags` | D8 |
| 24 | POST | `/tags` | F9 Tag |
| 25 | DELETE | `/tags/:id` | B9 Delete tag |
| 26 | GET | `/api/languages` | D3 |
| 27 | POST | `/api/detect` | F10 Translate, B10 Detect language |
| 28 | POST | `/api/translate` | F10 Translate |
| 29 | GET | `/translation/fetch` | D9, F12 Translations Filter |
| 30 | POST | `/translation/save` | F11 Save Translation |
| 31 | DELETE | `/translation/delete/:id` | B11 Delete translation |
| 32 | GET | `/export` | F13 Export |

## 2. FORMS

### 2.1. PUBLIC FORMS

#### LOGIN FORM

**Page:** [Login.js](../client/src/pages/Login.js) — `/` (logged out)
**Component:** [LoginForm.js](../client/src/components/LoginForm.js)
**Submits to:** `POST /auth/login` (Public)
**Purpose:** Authenticates the user and sets the JWT cookie.

| Field | Input type | Required | Validation |
|-------|-----------|----------|------------|
| `username` | text | Yes | Not empty; trimmed |
| `password` | password | Yes | Not empty |

**Behaviour**
- On success: store the user in `currentUser` (App.js), set `loggedIn` to `true`, redirect to `/` (Home).
- On failure: show a single generic message — *"Invalid username or password"* — so the form never reveals which field was wrong.
- `/auth` is rate-limited, so show a friendly message on **429**.

---

#### REGISTRATION FORM

**Page:** [Register.js](../client/src/pages/Register.js) — `/reg`
**Component:** [RegistrationForm.js](../client/src/components/RegistrationForm.js)
**Submits to:** `POST /auth/register` (Public)
**Purpose:** Creates a new account and logs the user in.

| Field | Input type | Required | Validation |
|-------|-----------|----------|------------|
| `username` | text | Yes | 3–30 characters; letters, numbers and underscores only; stored lowercase; unique (**409** if taken) |
| `fullName.firstName` | text | Yes | Trimmed; 2–50 characters |
| `fullName.lastName` | text | Yes | Trimmed; 3–50 characters |
| `dateOfBirth` | date | Yes | Valid date in the past; user must be at least 13 |
| `contactDetails.email` | email | Yes | Matches `emailRegex`; stored lowercase |
| `contactDetails.contactNumber` | tel | Yes | Matches `phoneRegex` (SA format, e.g. `0821234567` or `+27821234567`); unique (**409** if taken) |
| `defaultLanguages.defaultSourceLanguage` | select | No | Language code or `auto`; default `auto` |
| `defaultLanguages.defaultTargetLanguage` | select | No | Language code; default `fr`; should differ from source |
| `defaultLanguages.defaultNoteLanguage` | select | No | Language code; default `en` |
| `password` | password | Yes | Minimum 8 characters |
| `confirmPassword` | password | Yes | Must match `password` — **client-side only, never sent to the API** |
| `adminDataConsent` | checkbox | Yes | Must be checked (`true`) — consent for admins to see the user's details |

**Behaviour**
- Language dropdowns use [languageData.js](../client/src/util/languageData.js) (`/api/languages` needs a login).
- `admin` is **not** on this form — it can only be set later through `/auth/setAdmin`.
- Show field-level errors from the server's 400 response next to each input.
- On success: set `currentUser`, redirect to `/` (Home).

---

### 2.2. PROFILE FORMS

All profile forms are on [Home.js](../client/src/pages/Home.js) — `/`.

#### EDIT PROFILE

**Submits to:** `PATCH /user/editProfile` (Protected)

| Field | Input type | Required | Validation |
|-------|-----------|----------|------------|
| `username` | text | Yes | 3–30 characters; letters, numbers and underscores only; unique (**409**) |
| `fullName.firstName` | text | Yes | Trimmed; 2–50 characters |
| `fullName.lastName` | text | Yes | Trimmed; 3–50 characters |
| `contactDetails.email` | email | Yes | Matches `emailRegex` |
| `contactDetails.contactNumber` | tel | Yes | Matches `phoneRegex` (SA format); unique (**409**) |
| `defaultLanguages.defaultSourceLanguage` | select | No | Code from `GET /api/languages` or `auto` |
| `defaultLanguages.defaultTargetLanguage` | select | No | Code from `GET /api/languages`; should differ from source |
| `defaultLanguages.defaultNoteLanguage` | select | No | Code from `GET /api/languages`; default `en` |

**Behaviour**
- Pre-fill all fields from `GET /user/me`. Current details are used as placeholders (if a field has no data, e.g. it was optional at registration, use the same placeholder as the registration form).
- Only send fields that changed.
- `dateOfBirth`, `password`, `adminDataConsent` and `admin` are **not** editable here.

---

#### EDIT PASSWORD

**Submits to:** `PATCH /user/editPassword` (Protected)

| Field | Input type | Required | Validation |
|-------|-----------|----------|------------|
| `currentPassword` | password | Yes | Not empty; checked against the stored hash on the server |
| `newPassword` | password | Yes | Minimum 8 characters; must differ from current |
| `confirmNewPassword` | password | Yes | Must match `newPassword` — **client-side only** |

**Behaviour**
- Wrong current password → server returns **400**; show *"Current password is incorrect"* (a **401** here would trigger the session-expired redirect).
- Clear all three fields after success.

---

#### REGISTER AS ADMIN

**Submits to:** `PATCH /auth/setAdmin` (Protected)
**Purpose:** Upgrades the logged-in user to admin and re-signs the JWT cookie.

| Field | Input type | Required | Validation |
|-------|-----------|----------|------------|
| Confirm | checkbox | Yes | Must be checked — **client-side only**; the request has no body |

**Behaviour**
- Only shown to users who are 21+ and whose account is at least 3 months old (1 day in development). The server checks this too and returns **403** if not eligible.
- Shown only once: if the user closes the form they cannot register as admin again.
- On success: update `currentUser.admin` to `true` so admin-only links (e.g. `/users`) appear straight away.
- Removing admin status is a button (`PATCH /auth/clearAdmin`), not a form — see [1.3](#13-button-api-requests).

---

### 2.3. NOTE FORMS

#### NOTEPAD

**Page:** [NotePad.js](../client/src/pages/NotePad.js) — `/notepad`
**Submits to:** `POST /notes` (new note) or `PATCH /notes/:id` (existing note) — Protected

| Field | Input type | Required | Validation |
|-------|-----------|----------|------------|
| `title` | text | No | Trimmed; max 200 characters; default `Untitled` |
| `content` | TipTap rich-text editor | No | HTML; sanitised on the server (allowed tags only) |
| `language` | select | No | Code from `GET /api/languages`; pre-filled from `defaultLanguages.defaultNoteLanguage` |
| `notebook` | select | No | ID from `GET /notebooks`; empty = *No notebook* (`null`) |
| `tags` | multi-select | No | IDs from `GET /tags`; new tags created inline with the Tag form |
| `isPinned` | checkbox / toggle | No | Boolean; default `false` |

**Behaviour**
- Existing note: pre-fill from `GET /notes/:id` and only send fields that changed.
- `plainText` is generated by the server — never send it.
- **404** means the note was deleted or belongs to another user; redirect to `/notes`.

---

#### NOTES FILTER / SEARCH

**Page:** [Notes.js](../client/src/pages/Notes.js) — `/notes`
**Submits to:** `GET /notes?…` (Protected)

| Field | Input type | Query param | Notes |
|-------|-----------|-------------|-------|
| Notebook | select | `notebook` | ID from `GET /notebooks` |
| Tag | select | `tag` | ID from `GET /tags` |
| Search | search | `search` | Full-text search on title and note text |
| Language | select | `language` | Code from `GET /api/languages` |
| Show archived | checkbox | `archived` | `true` / `false` |
| Page | pagination | `page` | Starts at 1 |
| Per page | select | `limit` | e.g. 10, 20, 50 |

**Behaviour**
- Only send params that have a value.
- Debounce the search input (~300 ms) instead of a submit button.
- Pinned notes are listed first.

---

#### NOTEBOOK

**Page:** [Notes.js](../client/src/pages/Notes.js) — sidebar / modal
**Submits to:** `POST /notebooks` (new) or `PATCH /notebooks/:id` (rename / recolour) — Protected

| Field | Input type | Required | Validation |
|-------|-----------|----------|------------|
| `name` | text | Yes | Trimmed; max 80 characters; unique per user (**409**) |
| `colour` | color | No | Hex code (`#1F4E79` or `#fff`); default `#1F4E79` |

**Behaviour**
- Refresh the notebook list (`GET /notebooks`) after saving.
- Deleting a notebook is a button; its notes move to *No notebook*.

---

### 2.4. TAG FORMS

#### TAG

**Page:** [NotePad.js](../client/src/pages/NotePad.js) — inline in the tag picker
**Submits to:** `POST /tags` (Protected)

| Field | Input type | Required | Validation |
|-------|-----------|----------|------------|
| `name` | text | Yes | Trimmed; max 30 characters; stored lowercase; unique per user (**409**) |

**Behaviour**
- On success: add the new tag to the note's selected tags.
- On **409**: select the existing tag instead of showing an error.
- Deleting a tag is a button; the tag is removed from every note.

---

### 2.5. TRANSLATION FORMS

All translation forms are on [Translate.js](../client/src/pages/Translate.js) — `/translate`.

#### TRANSLATE FORM

**Submits to:** `POST /api/translate` (and optionally `POST /api/detect`) — Protected

| Field | Input type | Required | Sent as | Validation |
|-------|-----------|----------|---------|------------|
| Note | select from NotesList | Yes | `q` = the note's `plainText` | Note must not be archived (archived notes are hidden from the list) |
| Source language | select | No | `source` | Code from `GET /api/languages`; pre-filled from `defaultLanguages.defaultSourceLanguage`; leave blank or `auto` to auto-detect |
| Target language | select | Yes | `target` | Code from `GET /api/languages`; pre-filled from `defaultLanguages.defaultTargetLanguage`; must differ from source |

**Behaviour**
- **Detect** button calls `POST /api/detect` with `{ q }` and fills the source language.
- Show a character count — max **10,000** characters per request on Langbly's free tier.
- Result appears in a read-only preview. **Nothing is saved yet.**
- Errors: **400** (too long / invalid), **429** (quota or rate limit), **502** (Langbly unavailable).

---

#### SAVE TRANSLATION

**Submits to:** `POST /translation/save` (Protected)

Button displayed below the output after a successful Translate form submission. It has no inputs of its own — the body is built from the Translate form and its result:

| Body field | Source |
|------------|--------|
| `note` | ID of the selected note |
| `sourceText` | The `q` sent to `/api/translate` |
| `translatedText` | Text returned by `/api/translate` |
| `sourceLanguage` | Chosen source, or Langbly's `detectedSourceLanguage` if auto-detected |
| `targetLanguage` | Chosen target |

**Behaviour**
- **400** if the note is archived or doesn't belong to the user.
- On success: add the translation to the list (or re-run `GET /translation/fetch`) and hide the button.

---

#### TRANSLATIONS FILTER

**Submits to:** `GET /translation/fetch?…` (Protected)

| Field | Input type | Query param | Notes |
|-------|-----------|-------------|-------|
| Note | select | `note` | ID from the notes list |
| Target language | select | `targetLanguage` | Code from `GET /api/languages` |
| Page | pagination | `page` | Starts at 1 |
| Per page | select | `limit` | e.g. 10, 20, 50 |

**Behaviour**
- Only send params that have a value.
- Each translation in the list has a **Delete** button (`DELETE /translation/delete/:id`).

---

### 2.6. EXPORT FORMS

#### EXPORT

**Pages:** [Notes.js](../client/src/pages/Notes.js), [Translate.js](../client/src/pages/Translate.js)
**Submits to:** `GET /export?type=…&format=…` (Protected)

| Field | Input type | Query param | Options |
|-------|-----------|-------------|---------|
| Data | radio / select | `type` | `notes`, `archived`, `translations` |
| Format | radio / select | `format` | `csv`, `xlsx` |

**Behaviour**
- One (component) form handles every export.
- The response is a file, not JSON: read it with `res.blob()`, then trigger a download using the filename from the `Content-Disposition` header (e.g. `note-nest-notes-2026-11-02.xlsx`).
- Disable the button and show a spinner while the file is generated.
- Trashed notes are never included.

## 3. ERROR HANDLING

| Status | Show the user |
|--------|---------------|
| 400 | Field-level messages from the validator response |
| 401 | Redirect to `/` (login page — session expired) |
| 403 | *"You don't have permission to do that."* (or *"You are not eligible for admin yet."* on `/auth/setAdmin`) |
| 404 | *"That item no longer exists."* — then refresh the list |
| 409 | Message on the duplicate field (e.g. *"Username already taken"*, *"A notebook with that name already exists"*) |
| 429 | *"Too many requests — please wait and try again."* |
| 500 | *"Something went wrong. Please try again."* |
| 502 | *"The translation service is unavailable. Please try again later."* |

---
