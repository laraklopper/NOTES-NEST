# API REQUESTS AND FORMS

## TABLE OF CONTENTS
1. [REQUESTS SUMMARY](#1-requests-summary)
2. [FORMS](#2-forms)
3. [ERROR HANDLING](#4-error-handling)

## 1. REQUESTS SUMMARY

### 1.1. DEFAULT API'S

Requests that run by default after login or npm start

|#| METHOD | SERVER SIDE FILE | CLIENT SIDE FILE | ENDPOINT|
|-|------|--------------|----------|--------|----|
|1 | GET | [userRoutes.js](../server/routes/userRoutes.js) | [App.js](../client/src/App.js) | `/fetchUsers` | 
<!-- 

- fetchUsers
- fetchNotes
- fetch
  -->

### 1.2. FORM API REQUESTS

| # | Form | Page / Route | Endpoint | Method |
|---|------|--------------|----------|--------|
| 1 | Login | `/login` | `/auth/login` | POST |
| 2 | Register | `/reg` | `/auth/register` | POST |
| 3 | Edit Profile | `/` (Home) | `/user/editProfile` | PATCH |
| 4 | Edit Password | `/` (Home) | `/user/editPassword` | PATCH |
| 5 | Admin Request / Remove | `/` (Home) | `/auth/setAdmin`, `/auth/clearAdmin` | PATCH |
| 6 | Notepad | `/notepad`, `/notepad/:id` | `/notes`, `/notes/:id` | POST / PATCH |
| 7 | Notes Filter / Search | `/notes` | `/notes?…` | GET |
| 8 | Notebook | Sidebar / modal | `/notebooks`, `/notebooks/:id` | POST / PATCH |
| 9 | Tag | Inline (tag picker) | `/tags` | POST |
| 10 | Translate | `/translate` | `/api/translate`, `/api/detect` | POST |
| 11 | Save Translation | `/translate` | `/translation/save` | POST |
| 12 | Translations Filter | `/translate` | `/translation/fetch?…` | GET |
| 13 | Export | `/export` | `/export?…` | GET |



### 1.3. BUTTON API REQUESTS

| Action | Page | Endpoint | Method |
|--------|------|----------| -----| 
| Archive / unarchive note | `/notes` | `PATCH /notes/:id` |
| Move note to trash | `/notes`, `/notepad/:id` | `DELETE /notes/:id` |
| Restore note | `/trash` | `PATCH /notes/:id/restore` |
| Clear admin (remove admin status)| `/home` |`PATCH /auth/clearAdmin` |
| Permanently delete note | `/trash` | `DELETE /notes/:id/permanent` |
| Delete notebook | Sidebar | `DELETE /notebooks/:id` |
| Delete tag | Tag list | `DELETE /tags/:id` |
| Delete translation | `/translate` | `DELETE /translation/delete/:id` |
| Delete user | `/users` (Admin) | `DELETE /user/deleteUser/:id` |

## 2. FORMS

### 2.1. PUBLIC FORMS

#### LOGIN FORM

**Page:** `Login.js` — `/login`
**Submits to:** `POST /auth/login` (Public)
**Purpose:** Authenticates the user and sets the JWT cookie.
 
| Field | Input type | Required | Validation |
|-------|-----------|----------|------------|
| `username` | text | Yes | Not empty; trimmed |
| `password` | password | Yes | Not empty |
 
**Behaviour**
- On success: store the user in `AuthContext`, redirect to `/` (Home).
- On failure: show a single generic message — *"Invalid username or password"* — so the form never reveals which field was wrong.
- Already logged in? Redirect away from `/login` to `/`.
- `/auth` is rate-limited, so show a friendly message on **429**.
---

#### REGISTRATION FORM


### 2.2. PROFILE FORMS

 
**Page:** `Register.js` — `/reg`
**Submits to:** `POST /auth/register` (Public)
**Purpose:** Creates a new account and logs the user in.
 
| Field | Input type | Required | Validation |
|-------|-----------|----------|------------|
| `username` | text | Yes | Trimmed; unique (server returns **409** if taken) |
| `fullName.firstName` | text | Yes | Trimmed; not empty |
| `fullName.lastName` | text | No | Trimmed |
| `dateOfBirth` | date | Yes | Valid date in the past |
| `contactDetails.email` | email | Yes | Matches `emailRegex`; lowercase; unique (**409** if taken) |
| `contactDetails.phone` | tel | Yes | Matches `phoneRegex` (SA format, e.g. `0821234567` or `+27821234567`) |
| `defaultLanguages.sourceLanguage` | select | No | Code from `GET /api/languages` |
| `defaultLanguages.targetLanguage` | select | No | Code from `GET /api/languages`; should differ from source |
| `defaultLanguages.noteLanguage` | select | No | Code from `GET /api/languages`; default `en` |
| `password` | password | Yes | Minimum 8 characters |
| `adminDataConsent` | checkbox | Yes | Must match `password` — **client-side only, never sent to the API** |
 
**Behaviour**
- `admin` is **not** on this form — it can only be set later through `/auth/setAdmin`.
- Show field-level errors from the server's 400 response next to each input.
- On success: set `AuthContext`, redirect to `/` (Home).
---
#### EDIT PROFILE



**Submits to:** `PATCH /user/editProfile` (Protected)

| Field | Input type | Required | Validation |
|-------|-----------|----------|------------|
| `Username` | text | Yes | |
| `fullName.firstName` | text | No | Trimmed; not empty |
| `fullName.lastName` | text | No | Trimmed |
| `contactDetails.email` | email | Yes | `emailRegex`; unique (**409**) |
| `contactDetails.phone` | tel | Yes | `phoneRegex` (SA format) |
| `defaultLanguages.sourceLanguage` | select | No | Code from `GET /api/languages` |
| `defaultLanguages.targetLanguage` | select | No | Code from `GET /api/languages`; should differ from source |
| `defaultLanguages.noteLanguage` | select | No | Code from `GET /api/languages`; default `en` |
**Behaviour**
- Pre-fill all fields from `GET /user/me`. currentDetails are used as placeholder (if no data for a field exits because not required at registration (e.g. `defaultLanguages.sourceLanguage`) or if the data is not found use the same placeholder as used for registration form).
- Only send fields that changed.
- `dateOfBirth` and `password` and `admin` are **not** editable here.

#### EDIT PASSWORD

**Submits to:** `PATCH /user/editPassword` (Protected)
 
| Field | Input type | Required | Validation |
|-------|-----------|----------|------------|
| `currentPassword` | password | Yes | Not empty; checked against the stored hash on the server |
| `newPassword` | password | Yes | Minimum 8 characters; must differ from current |
| `confirmNewPassword` | password | Yes | Must match `newPassword` — **client-side only** |
 
**Behaviour**
- Wrong current password → server returns **401** or **400**; show *"Current password is incorrect"*.
- Clear all three fields after success.

#### REGISTER AS ADMIN

Form to allow user to register as admin (only displayed once) if user clicks exit on the form they cannot 
register as admin again
The form is only available to users who have been users for 3 months (one day during development). Admin registration is
also subject to age requirements.

### 2.3. NOTE FORMS

### 2.4. TAG FORMS

### 2.5. TRANSLATION FORMS

#### Translate form
 
**Submits to:** `POST /api/translate` (and optionally `POST /api/detect`) — Protected
 
| Field | Input type | Required | Sent as | Validation |
|-------|-----------|----------|---------|------------|
| Note | select from NotesList | Yes | `q` = the note's `plainText` | Note must not be archived (archived notes are hidden from the list) |
| Source language | select | No | `source` | Code from `GET /api/languages`; pre-filled from `defaultLanguages.sourceLanguage`; leave blank to auto-detect |
| Target language | select | Yes | `target` | Code from `GET /api/languages`; pre-filled from `defaultLanguages.targetLanguage`; must differ from source |
 
**Behaviour**
- **Detect** button calls `POST /api/detect` with `{ q }` and fills the source language.
- Show a character count — max **10,000** characters per request on Langbly's free tier.
- Result appears in a read-only preview. **Nothing is saved yet.**
- Errors: **400** (too long / invalid), **429** (quota or rate limit), **502** (Langbly unavailable).

##### **SAVE TRANSLATION**

**Submits to:** `POST /translation/save` (Protected)

Button displayed below the output after successful translateForm form submission 

### Translations Filter form
### 2.6. EXPORT FORMS



| Field | Input type | Query param | Options |
|-------|-----------|-------------|---------|
| Data | radio / select | `type` | `notes`, `archived`, `translations` |
| Format | radio / select | `format` | `csv`, `xlsx` |

**Behaviour**
- One (component) form for all exports handles every export.
- The response is a file, not JSON: read it with `res.blob()`, then trigger a download using the filename from the `Content-Disposition` header (e.g. `note-nest-notes-2026-11-02.xlsx`).
- Disable the button and show a spinner while the file is generated.
- Trashed notes are never included.
- available in Notes.js, and Translate.js Pages
## 3. ERROR HANDLING

| Status | Show the user |
|--------|---------------|
| 400 | Field-level messages from the validator response |
| 401 | Redirect to `/login` (session expired) |
| 403 | *"You don't have permission to do that."* |
| 409 | Message on the duplicate field (e.g. *"Username already taken"*) |
| 429 | *"Too many requests — please wait and try again."* |
| 500 / 502 | *"Something went wrong. Please try again."* |
 
---