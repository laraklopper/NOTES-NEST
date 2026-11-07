# API REQUESTS AND FORMS

_Last updated: 2026-11-07_

## TABLE OF CONTENTS
1. [REQUESTS SUMMARY](#1-requests-summary)
    - [1.1. DEFAULT API'S](#11-default-apis)
    - [1.2. FORM API REQUESTS](#12-form-api-requests)
    - [1.3. BUTTON API REQUESTS](#13-button-api-requests)
    - [1.4. ROUTE COVERAGE](#14-route-coverage)
    - [1.5. CLIENT FIXES NEEDED](#15-client-fixes-needed)
2. [FORMS](#2-forms)
    - [2.1. PUBLIC FORMS](#21-public-forms)
    - [2.2. PROFILE FORMS](#22-profile-forms)
    - [2.3. NOTE FORMS](#23-note-forms)
    - [2.4. TAG FORMS](#24-tag-forms)
    - [2.5. TRANSLATION FORMS](#25-translation-forms)
    - [2.6. EXPORT FORMS](#26-export-forms)
3. [ERROR HANDLING](#3-error-handling)

## 1. REQUESTS SUMMARY

Client-side requests and forms for the 37 routes in [API_ENDPOINT_PLAN.md](API_ENDPOINT_PLAN.md).

**Status key:** ✅ Done (client and server both work) · ⚠️ Fix (wired up but broken, see [1.5](#15-client-fixes-needed)) · 🖼️ UI only (form or button exists, no request yet) · 📝 Planned (not in the client yet)

**How requests are sent:** the JWT is in an HTTP-only `token` cookie, so the client never reads or sends it. Requests use relative paths (e.g. `fetch('/notes/fetchNotes')`), which the CRA proxy (`"proxy": "http://localhost:3001"`) forwards to the server, and the browser attaches the cookie. Don't use `localStorage.getItem('token')`, `Authorization: Bearer` headers or `http://localhost:3001/...` URLs.

### 1.1. DEFAULT API'S

Requests that run by default after login or page load (no user action needed).

| # | METHOD | SERVER SIDE FILE | CLIENT SIDE FILE | ENDPOINT | ACCESS | STATUS |
|---|--------|------------------|------------------|----------|--------|--------|
| 1 | GET | [userRoutes.js](../server/routes/userRoutes.js) | [App.js](../client/src/App.js) (session check), [Home.js](../client/src/pages/Home.js), [NotePad.js](../client/src/pages/NotePad.js) | `/user/me` | Protected | ✅ |
| 2 | GET | [userRoutes.js](../server/routes/userRoutes.js) | [App.js](../client/src/App.js) → [Users.js](../client/src/pages/Users.js) | `/user/fetchUsers` | Admin | ✅ (Users.js doesn't display the list yet) |
| 3 | GET | [apiRoutes.js](../server/routes/apiRoutes.js) | [TranslateForm.js](../client/src/components/TranslateForm.js) | `/api/language/translate/v2/languages` | Protected | ✅ |
| 4 | GET | [noteRoutes.js](../server/routes/noteRoutes.js) | [Notes.js](../client/src/pages/Notes.js) (called from [NotesList.js](../client/src/components/NotesList.js) on mount) | `/notes/fetchNotes` | Protected | ✅ |
| 5 | GET | [tagRoutes.js](../server/routes/tagRoutes.js) | [Notes.js](../client/src/pages/Notes.js), [NotePad.js](../client/src/pages/NotePad.js) | `/tag/fetchTags` | Protected | ✅ |
| 6 | GET | [noteRoutes.js](../server/routes/noteRoutes.js) | [Trash.js](../client/src/pages/Trash.js) | `/notes/trash` | Protected | 📝 (server stub) |
| 7 | GET | [archiveRoutes.js](../server/routes/archiveRoutes.js) | [Notes.js](../client/src/pages/Notes.js) (ARCHIVE tab) | `/archive/fetchNotes` | Protected | 📝 (server stub) |
| 8 | GET | [notebookRoutes.js](../server/routes/notebookRoutes.js) | [Notes.js](../client/src/pages/Notes.js), [NotePad.js](../client/src/pages/NotePad.js) | `/notebooks` | Protected | 📝 |
| 9 | GET | [translationRoutes.js](../server/routes/translationRoutes.js) | [Translate.js](../client/src/pages/Translate.js) (TRANSLATIONS tab) | `/translation/fetch` | Protected | 📝 |
| 10 | GET | [userRoutes.js](../server/routes/userRoutes.js) | [Users.js](../client/src/pages/Users.js) (details panel, when a user is selected) | `/user/fetchUser/:id` | Protected | 📝 (server done) |

Notes:
- `App.js` restores `currentUser` from `localStorage` on refresh, then calls `/user/me` to check the cookie is still valid. If it fails, the session is cleared.
- `/user/fetchUsers` only runs when `currentUser.admin` is `true`.
- `currentUser` only holds `{ userId, fullName, admin }`, so pages that need the username or default languages fetch `/user/me` themselves.
- `/api/language/translate/v2/languages` is Protected, so the Register page can't call it before login. The Register, Edit Profile, NotePad and Edit Note forms use the local list in [languageData.js](../client/src/util/languageData.js). TranslateForm also starts with that list and swaps in the fetched one when it arrives.
- `GET /notes/:id` isn't needed by the client right now: the Edit Note form uses the note already loaded by `/notes/fetchNotes`.
- `/notes/fetchNotes` only returns active notes, so archived and trashed notes never show in the main list or the translate flow.

### 1.2. FORM API REQUESTS

| # | Form | Page / Route | Component | Endpoint | Method | Access | Status |
|---|------|--------------|-----------|----------|--------|--------|--------|
| 1 | Login | `/` (logged out) | [LoginForm.js](../client/src/components/LoginForm.js) | `/auth/login` | POST | Public | ✅ |
| 2 | Register | `/reg` | [RegistrationForm.js](../client/src/components/RegistrationForm.js) | `/auth/register` | POST | Public | ✅ |
| 3 | Edit Profile | `/` (Home) | [EditProfile.js](../client/src/components/EditProfile.js) | `/user/editProfile` | PATCH | Protected | ✅ |
| 4 | Edit Password | `/` (Home) | [EditPassword.js](../client/src/components/EditPassword.js) | `/user/editPassword` | PATCH | Protected | ✅ |
| 5 | Register as Admin | `/` (Home) | [AdminRegisForm.js](../client/src/components/AdminRegisForm.js) | `/auth/setAdmin` | PATCH | Protected | ⚠️ |
| 6 | Create Note | `/notepad` (NOTE PAD tab) | [NotePadForm.js](../client/src/components/NotePadForm.js) | `/notes/addNote` | POST | Protected | ✅ |
| 7 | Edit Note | `/notes` (below the details panel) | [EditNoteForm.js](../client/src/components/EditNoteForm.js) | `/notes/:id` | PATCH | Protected | ✅ |
| 8 | Create Tag | `/notepad` (TAGS tab) | [AddTag.js](../client/src/components/AddTag.js) | `/tag/addTag` | POST | Protected | ✅ |
| 9 | Create Notebook | `/notepad` (NOTEBOOK tab) | [AddNoteBook.js](../client/src/components/AddNoteBook.js) | `/notebooks` | POST | Protected | 🖼️ |
| 10 | Edit Notebook | `/notes` (NOTEBOOKS tab) | — | `/notebooks/:id` | PATCH | Protected | 📝 |
| 11 | Translate | `/translate` (translate tab) | [TranslateForm.js](../client/src/components/TranslateForm.js) | `/api/language/translate/v2` (+ `/detect` while typing) | POST | Protected | ✅ |
| 12 | Save Translation | `/translate` (translate tab) | [TranslateForm.js](../client/src/components/TranslateForm.js) | `/translation/save` | POST | Protected | ✅ |
| 13 | Notes Filter / Search | `/notes` (NOTES tab) | — | `/notes/fetchNotes?…` | GET | Protected | 📝 |
| 14 | Translations Filter | `/translate` (translations tab) | — | `/translation/fetch?…` | GET | Protected | 📝 |
| 15 | Export | `/notes`, `/translate` | — | `/export?…` | GET | Protected | 📝 |

### 1.3. BUTTON API REQUESTS

| # | Action | Page | Component | Endpoint | Method | Access | Status |
|---|--------|------|-----------|----------|--------|--------|--------|
| 1 | Log out | All logged-in pages | [Footer.js](../client/src/components/Footer.js) (`logout` from App.js) | `/auth/logout` | POST | Protected | ✅ |
| 2 | Clear admin (remove admin status) | `/` (Home) | [Profile.js](../client/src/components/Profile.js) | `/auth/clearAdmin` | PATCH | Protected | ⚠️ |
| 3 | Archive note | `/notes` | [NotesList.js](../client/src/components/NotesList.js) | `/archive/:id` | PATCH | Protected | ✅ |
| 4 | Move note to trash | `/notes` | [NotesList.js](../client/src/components/NotesList.js) | `/notes/delete/:id` | DELETE | Protected | ✅ |
| 5 | Restore note from trash | `/trash` | [Trash.js](../client/src/pages/Trash.js) | `/notes/:id/restore` | PATCH | Protected | ⚠️ (server stub) |
| 6 | Permanently delete note | `/trash` | [Trash.js](../client/src/pages/Trash.js) | `/notes/:id/permanent` | DELETE | Protected | ⚠️ (server stub) |
| 7 | Unarchive note | `/notes` (ARCHIVE tab) | — | `/archive/:id/restore` | PATCH | Protected | 📝 (server stub) |
| 8 | Move archived note to trash | `/notes` (ARCHIVE tab) | — | `/archive/:id` | DELETE | Protected | 📝 (server stub) |
| 9 | Detect note language | `/notepad`, `/notes` | [NotePadForm.js](../client/src/components/NotePadForm.js), [EditNoteForm.js](../client/src/components/EditNoteForm.js) (DETECT button) | `/api/language/translate/v2/detect` | POST | Protected | 🖼️ |
| 10 | Delete notebook | `/notes` (NOTEBOOKS tab) | — | `/notebooks/:id` | DELETE | Protected | 📝 |
| 11 | Delete tag | `/notes` (NOTEBOOKS tab) | — | `/tag/:id` | DELETE | Protected | 📝 |
| 12 | Delete translation | `/translate` (translations tab) | — | `/translation/delete/:id` | DELETE | Protected | 📝 |
| 13 | Delete user | `/users` (Admin) | [Users.js](../client/src/pages/Users.js) | `/user/deleteUser/:id` | DELETE | Admin | 📝 |

Notes:
- Pinning and unpinning isn't a separate button: it's the `isPinned` checkbox on the Create Note and Edit Note forms (`PATCH /notes/:id` with `{ isPinned }`).
- The COPY button in the NotesList details panel copies the note text to the clipboard; it makes no request.
- Archive and Move to trash both ask for confirmation and unpin the note. After either, NotesList closes the details panel and re-fetches the list.
- Ask for confirmation before every **DELETE**, including *Move note to trash* (the current NotesList behaviour).
- Permanently deleting a note also deletes its translations; deleting a user deletes all their data.

### 1.4. ROUTE COVERAGE

Every route in [API_ENDPOINT_PLAN.md](API_ENDPOINT_PLAN.md) and where the client uses it:
- D = default request
- F = form
- B = button
- — = not used by the client

| # | Method | Endpoint | Used by |
|---|--------|----------|---------|
| 1 | POST | `/auth/register` | F2 Register |
| 2 | POST | `/auth/login` | F1 Login |
| 3 | POST | `/auth/logout` | B1 Log out |
| 4 | PATCH | `/auth/setAdmin` | F5 Register as Admin |
| 5 | PATCH | `/auth/clearAdmin` | B2 Clear admin |
| 6 | GET | `/user/me` | D1 |
| 7 | GET | `/user/fetchUsers` | D2 |
| 8 | GET | `/user/fetchUser/:id` | D10 |
| 9 | PATCH | `/user/editProfile` | F3 Edit Profile |
| 10 | PATCH | `/user/editPassword` | F4 Edit Password |
| 11 | DELETE | `/user/deleteUser/:id` | B13 Delete user |
| 12 | GET | `/notes/fetchNotes` | D4, F13 Notes Filter |
| 13 | GET | `/notes/trash` | D6 |
| 14 | GET | `/notes/:id` | — (Edit Note uses the list data) |
| 15 | POST | `/notes/addNote` | F6 Create Note |
| 16 | PATCH | `/notes/:id` | F7 Edit Note (including pin) |
| 17 | PATCH | `/notes/:id/restore` | B5 Restore note |
| 18 | DELETE | `/notes/delete/:id` | B4 Move to trash |
| 19 | DELETE | `/notes/:id/permanent` | B6 Permanently delete |
| 20 | GET | `/archive/fetchNotes` | D7 |
| 21 | PATCH | `/archive/:id` | B3 Archive note |
| 22 | PATCH | `/archive/:id/restore` | B7 Unarchive note |
| 23 | DELETE | `/archive/:id` | B8 Move archived note to trash |
| 24 | GET | `/notebooks` | D8 |
| 25 | POST | `/notebooks` | F9 Create Notebook |
| 26 | PATCH | `/notebooks/:id` | F10 Edit Notebook |
| 27 | DELETE | `/notebooks/:id` | B10 Delete notebook |
| 28 | GET | `/tag/fetchTags` | D5 |
| 29 | POST | `/tag/addTag` | F8 Create Tag |
| 30 | DELETE | `/tag/:id` | B11 Delete tag |
| 31 | GET | `/api/language/translate/v2/languages` | D3 |
| 32 | POST | `/api/language/translate/v2/detect` | F11 Translate (auto-detect), B9 Detect note language |
| 33 | POST | `/api/language/translate/v2` | F11 Translate |
| 34 | GET | `/translation/fetch` | D9, F14 Translations Filter |
| 35 | POST | `/translation/save` | F12 Save Translation |
| 36 | DELETE | `/translation/delete/:id` | B12 Delete translation |
| 37 | GET | `/export` | F15 Export |

### 1.5. CLIENT FIXES NEEDED

These components still use the old token-in-`localStorage` approach. Since login now only sets an HTTP-only cookie, `localStorage.getItem('token')` is always `null` and the request never runs.

| Component | Request | Problem | Fix |
|-----------|---------|---------|-----|
| [AdminRegisForm.js](../client/src/components/AdminRegisForm.js) | `PATCH /auth/setAdmin` | Returns early with no token; uses `http://localhost:3001` and a Bearer header; saves `data.token` to `localStorage` | Use `fetch('/auth/setAdmin', { method: 'PATCH' })`, then update `currentUser` (and the `currentUser` entry in `localStorage`) to `{ userId, fullName, admin: true }` |
| [Profile.js](../client/src/components/Profile.js) | `PATCH /auth/clearAdmin` | Same as above | Same as above, with `admin: false` |
| [Trash.js](../client/src/pages/Trash.js) | `PATCH /notes/:id/restore`, `DELETE /notes/:id/permanent` | Same as above, and the URL contains a literal `:id`. The table rows are hard-coded placeholders | Load rows from `GET /notes/trash` and pass each note's `_id` into the URL (e.g. `` `/notes/${id}/restore` ``) |

Also:
- `AdminRegisForm.js` starts `submitting` as the string `'false'` instead of the boolean `false`.
- The `/auth/setAdmin` and `/auth/clearAdmin` server routes need fixing too (see the Authentication notes in [API_ENDPOINT_PLAN.md](API_ENDPOINT_PLAN.md#1-authentication--auth)).
- `Home.js` checks `currentUser.dateOfBirth` and `currentUser.createdAt` to decide whether to show the admin form, but `currentUser` only holds `{ userId, fullName, admin }`. Use the `profile` from `/user/me` instead, otherwise the form never shows.

## 2. FORMS

### 2.1. PUBLIC FORMS

#### LOGIN FORM

**Page:** [Login.js](../client/src/pages/Login.js) — `/` (logged out)
**Component:** [LoginForm.js](../client/src/components/LoginForm.js)
**Submits to:** `POST /auth/login` (Public)
**Purpose:** Checks the username and password and sets the JWT cookie.

| Field | Input type | Required | Validation |
|-------|-----------|----------|------------|
| `username` | text | Yes | Not empty; the server trims and lowercases it |
| `password` | password | Yes | Not empty |

**Behaviour**
- On success the server returns `{ userId, fullName, isAdmin }`. Login.js saves `{ userId, fullName, admin: isAdmin }` as `currentUser` (state and `localStorage`), sets `loggedIn` to `true`, clears the password from state and redirects to `/` (Home).
- On failure the server returns **401** *"Invalid credentials"* for both a wrong username and a wrong password, so the form never reveals which was wrong.
- Repeat submits are ignored while a request is running.
- Once a rate limit is added to `/auth`, show a friendly message on **429**.

---

#### REGISTRATION FORM

**Page:** [Register.js](../client/src/pages/Register.js) — `/reg`
**Component:** [RegistrationForm.js](../client/src/components/RegistrationForm.js)
**Submits to:** `POST /auth/register` (Public)
**Purpose:** Creates a new account.

| Field | Input type | Required | Validation |
|-------|-----------|----------|------------|
| `username` | text | Yes | 3–30 characters; letters, numbers and underscores only; stored lowercase; unique (**409** if taken) |
| `fullName.firstName` | text | Yes | Trimmed; 2–50 characters |
| `fullName.lastName` | text | Yes | Trimmed; 3–50 characters |
| `dateOfBirth` | date | Yes | Valid date in the past; user must be at least 13 |
| `contactDetails.email` | email | Yes | Matches `emailRegex`; stored lowercase |
| `contactDetails.contactNumber` | tel | Yes | Matches `phoneRegex` (SA format, e.g. `0821234567` or `+27821234567`); stored as `+27…`; unique (**409** if taken) |
| `defaultSourceLang` | select | No | Language code or `auto`; default `auto` |
| `defaultTargetLang` | select | No | Language code; default `fr`; should differ from source |
| `defaultNoteLang` | select | No | Language code; default `en` |
| `password` | password | Yes | Minimum 8 characters |
| `confirmPassword` | password | Yes | Must match `password`. **Client-side only, never sent to the API** |
| `adminDataConsent` | checkbox | Yes | Must be `true` (consent for admins to see the user's details); the server returns **400** otherwise |

**Behaviour**
- Language dropdowns use [languageData.js](../client/src/util/languageData.js), because `/api/language/translate/v2/languages` needs a login.
- The language fields are sent flat (`defaultSourceLang`, `defaultTargetLang`, `defaultNoteLang`); the server stores them as `defaultLanguages.defaultSourceLanguage`, `defaultTargetLanguage` and `defaultNoteLanguage`. Blank selects are left out so the schema defaults apply.
- `admin` is **not** on this form. It can only be set later through `/auth/setAdmin`.
- The server returns the first validation message as `{ message }` with **400**; show it in the global error bar.
- On success (**201**): clear the form and redirect to `/` (the login page). Registering does not log the user in.

---

### 2.2. PROFILE FORMS

All profile forms are on [Home.js](../client/src/pages/Home.js) — `/` (Profile tab).

#### EDIT PROFILE

**Component:** [EditProfile.js](../client/src/components/EditProfile.js)
**Submits to:** `PATCH /user/editProfile` (Protected)

| Field | Input type | Required | Validation |
|-------|-----------|----------|------------|
| `username` | text | No | 3–30 characters; letters, numbers and underscores only; unique (**409**) |
| `fullName.firstName` | text | No | Trimmed; 2–50 characters |
| `fullName.lastName` | text | No | Trimmed; 3–50 characters |
| `contactDetails.email` | email | No | Matches `emailRegex` |
| `contactDetails.contactNumber` | tel | No | Matches `phoneRegex` (SA format); unique (**409**) |
| `defaultSourceLang` | select | No | Language code or `auto` |
| `defaultTargetLang` | select | No | Language code; must differ from source (**400**) |
| `defaultNoteLang` | select | No | Language code |

**Behaviour**
- Current details from `GET /user/me` are shown as placeholders. If a field has no data, the registration form's placeholder is used.
- Only changed fields are sent. Names and contact details are sent nested (`fullName`, `contactDetails`); language fields are sent flat. Blank fields keep their current value.
- Sending no changes returns **400** *"Please change at least one field before updating your profile"*.
- On success the server returns `{ message, user }`; Home.js shows the updated `user` in the profile panel and closes the form.
- `dateOfBirth`, `password`, `adminDataConsent` and `admin` can't be edited here; the server ignores them.

---

#### EDIT PASSWORD

**Component:** [EditPassword.js](../client/src/components/EditPassword.js)
**Submits to:** `PATCH /user/editPassword` (Protected)

| Field | Input type | Required | Validation |
|-------|-----------|----------|------------|
| `currentPassword` | password | Yes | Not empty; checked against the stored password on the server |
| `newPassword` | password | Yes | Minimum 8 characters and at least one special character (`checkPassword`); must differ from current |
| `confirmNewPassword` | password | Yes | Must match `newPassword`. **Client-side only** |

**Behaviour**
- Wrong current password → server returns **400** *"Current password is incorrect"* (a **401** here would trigger the session-expired redirect).
- Clear all three fields after success.

---

#### REGISTER AS ADMIN

**Component:** [AdminRegisForm.js](../client/src/components/AdminRegisForm.js)
**Submits to:** `PATCH /auth/setAdmin` (Protected) — ⚠️ see [1.5](#15-client-fixes-needed)
**Purpose:** Upgrades the logged-in user to admin.

| Field | Input type | Required | Validation |
|-------|-----------|----------|------------|
| Admin status | YES / NO choice | Yes | **Client-side only**; the request has no body. YES sends the request, NO closes the form |

**Behaviour**
- Only shown to users who aren't admins, are 21+ and whose account is at least 3 months old (1 day in development). The server checks this too and returns **403** if they aren't eligible, or **409** if they're already an admin.
- Shown only once: closing it saves `adminFormDismissed_<userId>` in `localStorage`, so it doesn't appear again.
- On success: set `currentUser.admin` to `true` so admin-only links (e.g. `/users`) appear straight away.
- Removing admin status is a button (`PATCH /auth/clearAdmin`) in [Profile.js](../client/src/components/Profile.js), not a form. See [1.3](#13-button-api-requests).

---

### 2.3. NOTE FORMS

#### CREATE NOTE (NOTEPAD)

**Page:** [NotePad.js](../client/src/pages/NotePad.js) — `/notepad`, NOTE PAD tab
**Component:** [NotePadForm.js](../client/src/components/NotePadForm.js)
**Submits to:** `POST /notes/addNote` (Protected)

| Field | Input type | Required | Sent as | Validation |
|-------|-----------|----------|---------|------------|
| `title` | text | Yes (client) | `title` | Trimmed; max 200 characters; the server uses `Untitled` if blank |
| `content` | textarea | Yes | `content` | Not blank. Plain text converted to HTML with `textToHtml` ([notesUtil.js](../client/src/util/notesUtil.js)); sanitised on the server |
| `language` | select | Yes | `language` | Code from [languageData.js](../client/src/util/languageData.js); pre-filled from `defaultLanguages.defaultNoteLanguage` |
| `notebook` | select | No | `notebook` | Notebook ID, or `null` for *No notebook*. The list is empty until `GET /notebooks` exists |
| `tags` | text (comma-separated) + ADD TAG select | No | `tags` (array of names) | Each name max 30 characters. The select adds an existing tag from `GET /tag/fetchTags`; new names are created by the server |
| `isPinned` | checkbox | No | `isPinned` | Boolean; default `false` |
| Date | date (read-only) | — | Not sent | Shows today's date; the server sets `createdAt` |

**Behaviour**
- `plainText` is generated by the server; never send it.
- On success: show *"Note saved successfully."* and reset the form.
- RESET asks for confirmation before clearing the form.
- The DETECT button has no handler yet (see B9).

---

#### EDIT NOTE

**Page:** [Notes.js](../client/src/pages/Notes.js) — `/notes`, NOTES tab (opens from the EDIT button in the NotesList details panel)
**Component:** [EditNoteForm.js](../client/src/components/EditNoteForm.js)
**Submits to:** `PATCH /notes/:id` (Protected)

| Field | Input type | Required | Validation |
|-------|-----------|----------|------------|
| `title` | text | No | Trimmed; max 200 characters; a cleared title becomes `Untitled` |
| `content` | textarea | Yes | Not blank; converted with `textToHtml` |
| `language` | select | Yes | Code from [languageData.js](../client/src/util/languageData.js) |
| `notebook` | select | No | Notebook ID, or `null` for *No notebook*. Only the note's current notebook is listed until `GET /notebooks` exists |
| `tags` | text (comma-separated) + ADD TAG select | No | Sent as an array of lowercase names |
| `isPinned` | checkbox | No | Boolean |
| Date | date (read-only) | — | The note's `createdAt`; not sent |

**Behaviour**
- Pre-filled from the selected note in the `/notes/fetchNotes` list (`noteToForm` in [notesUtil.js](../client/src/util/notesUtil.js)).
- Only changed fields are sent. `content` is only sent if the text changed, so untouched notes keep any rich formatting. If nothing changed, the form shows *"No changes to save."* without sending a request.
- On success: Notes.js swaps the updated note into the list, re-fetches the notes (and the tags, if tags changed) and shows *"Note successfully updated"*.
- **404** means the note was archived, trashed or belongs to another user; refresh the list.
- RESET asks for confirmation, then restores the saved values.

---

#### NOTES FILTER / SEARCH (planned)

**Page:** [Notes.js](../client/src/pages/Notes.js) — `/notes` (placeholder row above the list)
**Submits to:** `GET /notes/fetchNotes?…` (Protected). The server doesn't read query parameters yet.

| Field | Input type | Query param | Notes |
|-------|-----------|-------------|-------|
| Notebook | select | `notebook` | ID from `GET /notebooks` |
| Tag | select | `tag` | ID from `GET /tag/fetchTags` |
| Search | search | `search` | Full-text search on title and note text |
| Language | select | `language` | Language code |
| Page | pagination | `page` | Starts at 1 |
| Per page | select | `limit` | e.g. 10, 20, 50 |

**Behaviour**
- Only send params that have a value.
- Debounce the search input (~300 ms) instead of using a submit button.
- Pinned notes are listed first.
- Archived notes have their own tab (`GET /archive/fetchNotes`), so there's no "show archived" filter.

---

#### NOTEBOOK

**Page:** [NotePad.js](../client/src/pages/NotePad.js) — `/notepad`, NOTEBOOK tab (create); [Notes.js](../client/src/pages/Notes.js) — NOTEBOOKS tab (edit, planned)
**Component:** [AddNoteBook.js](../client/src/components/AddNoteBook.js) — 🖼️ UI only: inputs have no `name`, state or submit handler yet
**Submits to:** `POST /notebooks` (new) or `PATCH /notebooks/:id` (rename / recolour) — Protected, planned

| Field | Input type | Required | Validation |
|-------|-----------|----------|------------|
| `name` | text | Yes | Trimmed; max 80 characters; unique per user (**409**) |
| `colour` | color | No | Hex code (`#1F4E79` or `#fff`); default `#1F4E79` |

**Behaviour**
- Refresh the notebook list (`GET /notebooks`) after saving.
- Deleting a notebook is a button; its notes move to *No notebook*.

---

### 2.4. TAG FORMS

#### CREATE TAG

**Page:** [NotePad.js](../client/src/pages/NotePad.js) — `/notepad`, TAGS tab
**Component:** [AddTag.js](../client/src/components/AddTag.js)
**Submits to:** `POST /tag/addTag` (Protected)

| Field | Input type | Required | Validation |
|-------|-----------|----------|------------|
| `name` | text | Yes | Trimmed; not blank; max 30 characters; stored lowercase; unique per user (**409** *"You already have a tag with that name"*) |

**Behaviour**
- On success: show *"Tag "<name>" saved successfully."*, clear the input and re-fetch `GET /tag/fetchTags`.
- RESET asks for confirmation before clearing the input.
- Tags can also be created without this form by typing a new name into a note's TAG field.
- Deleting a tag is a button (planned); the tag is removed from every note.

---

### 2.5. TRANSLATION FORMS

All translation forms are on [Translate.js](../client/src/pages/Translate.js) — `/translate`.

#### TRANSLATE FORM

**Component:** [TranslateForm.js](../client/src/components/TranslateForm.js)
**Submits to:** `POST /api/language/translate/v2` (Protected); `POST /api/language/translate/v2/detect` runs while typing

| Field | Input type | Required | Sent as | Validation |
|-------|-----------|----------|---------|------------|
| Source text | textarea | Yes | `sourceText` | Not blank; max **10,000** characters (Langbly free tier) |
| Source language | [LanguageSelector.js](../client/src/components/LanguageSelector.js) (with *auto*) | No | `sourceLanguage` | Pre-filled from `defaultLanguages.defaultSourceLanguage`; `auto` or blank lets Langbly detect it |
| Target language | [LanguageSelector.js](../client/src/components/LanguageSelector.js) | Yes | `targetLanguage` | Pre-filled from `defaultLanguages.defaultTargetLanguage`; must differ from source |

**Behaviour**
- When the source is `auto`, the form calls `/detect` with `{ sourceText }` after the user stops typing (debounced, minimum text length) and shows the detected language. Each text is only detected once. Detect failures are logged, not shown, because translating still works without it.
- The selectors open on the user's default pair and follow changes to the defaults until the user picks a pair by hand.
- SWAP flips the languages and the text (not available while the source is `auto`). COPY copies the result to the clipboard. CLEAR resets the form to the defaults.
- The result appears in a read-only box. **Nothing is saved yet.**
- If Langbly detected the language during translation, that result replaces the detect preview.
- Errors: **400** (too long, invalid code, same source and target), **429** (quota or rate limit), **502** (Langbly unavailable or not configured).
- Planned: a note picker that fills the source text from a note's `plainText` and sends its ID as `note` when saving.

---

#### SAVE TRANSLATION

**Submits to:** `POST /translation/save` (Protected)

A SAVE button shown under the result after a successful translation. It has no inputs of its own; the body is the last translation the server returned:

| Body field | Source |
|------------|--------|
| `sourceText` | The text sent to `/api/language/translate/v2` |
| `translatedText` | `translatedText` from the response |
| `sourceLanguage` | `sourceLanguage` from the response (the detected code if the source was `auto`) |
| `targetLanguage` | `targetLanguage` from the response |
| `note` | Optional; not sent yet (free text). When the note picker is added, send the note's ID |

**Behaviour**
- On success (**201**): show the saved state. Planned: add the translation to the translations list (or re-fetch `GET /translation/fetch`).
- Swapping, clearing or translating again resets the save state, so only a result the server produced can be saved.
- **400** if `note` is sent but is archived, trashed or belongs to another user.

---

#### TRANSLATIONS FILTER (planned)

**Page:** translations tab (currently empty)
**Submits to:** `GET /translation/fetch?…` (Protected)

| Field | Input type | Query param | Notes |
|-------|-----------|-------------|-------|
| Note | select | `note` | ID from the notes list |
| Target language | select | `targetLanguage` | Language code |
| Page | pagination | `page` | Starts at 1 |
| Per page | select | `limit` | e.g. 10, 20, 50 |

**Behaviour**
- Only send params that have a value.
- Each translation in the list has a **Delete** button (`DELETE /translation/delete/:id`).

---

### 2.6. EXPORT FORMS

#### EXPORT (planned)

**Pages:** [Notes.js](../client/src/pages/Notes.js), [Translate.js](../client/src/pages/Translate.js)
**Submits to:** `GET /export?type=…&format=…` (Protected)

| Field | Input type | Query param | Options |
|-------|-----------|-------------|---------|
| Data | radio / select | `type` | `notes`, `archived`, `translations` |
| Format | radio / select | `format` | `csv`, `xlsx` |

**Behaviour**
- One form component handles every export.
- The response is a file, not JSON: read it with `res.blob()`, then trigger a download using the filename from the `Content-Disposition` header (e.g. `note-nest-notes-2026-11-02.xlsx`).
- Disable the button and show a spinner while the file is generated.
- Trashed notes are never included.

## 3. ERROR HANDLING

The server sends errors as `{ message }` (some older routes use `{ error }`). Pages pass the message to `setError`, which shows it in the global error bar in [App.js](../client/src/App.js).

| Status | Show the user |
|--------|---------------|
| 400 | The server's `message` (the first validation error) |
| 401 | Redirect to `/` (login page, session expired). On the login form itself, show *"Invalid credentials"* |
| 403 | *"You don't have permission to do that."* (or the server's eligibility message on `/auth/setAdmin`) |
| 404 | *"That item no longer exists."*, then refresh the list |
| 409 | The server's `message` (e.g. *"That username is already taken"*, *"You already have a tag with that name"*) |
| 429 | *"Too many requests — please wait and try again."* |
| 500 | *"Something went wrong. Please try again."* |
| 502 | *"The translation service is unavailable. Please try again later."* |

Note: App.js clears the session when the start-up `/user/me` check fails, but other requests don't redirect on **401** yet. Planned: a shared fetch helper that logs out on any 401.
