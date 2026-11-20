# CLIENT PAGES AND COMPONENTS

## TABLE OF CONTENTS

1. [PAGES](#1-pages)
- [1.1. LOGGED OUT](#11-logged-out)
- [1.2. LOGGED IN](#12-logged-in)
- [1.3. FALLBACK ROUTE](#13-fallback-route)
- [1.4. PROTECTED ROUTES](#14-protected-routes)
2. [COMPONENTS](#2-components)
- [2.1. LAYOUT COMPONENTS](#21-layout-components)
- [2.2. FORM COMPONENTS](#22-form-components)
- [2.3. LIST AND PANEL COMPONENTS](#23-list-and-panel-components)
- [2.4. ARCHIVE AND TRASH COMPONENTS](#24-archive-and-trash-components)
- [2.5. SHARED UI COMPONENTS](#25-shared-ui-components)
3. [COMPONENT TREE](#3-component-tree)
4. [UTILITY FILES](#4-utility-files)

- *View [APPLICATION_API.md](./APPLICATION_API.md) for the full list of server endpoints*

---

## 1. PAGES

All client routes are declared in [App.js](../client/src/App.js). Which set of routes exists depends on the `loggedIn` state in `App.js`, so the same path (`/`) shows a different page when logged out and logged in.

On load, `App.js` restores the saved user from `localStorage` and confirms the session with `GET /user/me`. If the JWT cookie has expired, the session is cleared and the logged-out routes are shown.

### 1.1. LOGGED OUT

**`loggedIn === false`**

| ROUTE | FILE | PURPOSE | ACCESS |
|-------|------|---------|--------|
| `/` | [Login.js](../client/src/pages/Login.js) | Landing page. Renders the login form and sends `POST /auth/login`. On success it saves the user to `localStorage` and sets `loggedIn` | Public |
| `/reg` | [Register.js](../client/src/pages/Register.js) | Registration (sign up) page. Renders the registration form and sends `POST /auth/register` | Public |

### 1.2. LOGGED IN

**`loggedIn === true`**

| ROUTE | FILE | PURPOSE | ACCESS |
|-------|------|---------|--------|
| `/` | [Home.js](../client/src/pages/Home.js) | Landing page when logged in. Application description, user profile, and the toggled Edit Profile, Edit Password and Admin Registration forms | Private (`ProtectedUserRoute`) |
| `/notepad` | [NotePad.js](../client/src/pages/NotePad.js) | Create content. Tabs: **NOTE PAD** (new note), **NOTEBOOK** (new notebook), **TAGS** (new tag) | Private (`ProtectedUserRoute`) |
| `/notes` | [Notes.js](../client/src/pages/Notes.js) | Manage saved notes. Tabs: **NOTES** (filter, view, edit, export), **NOTEBOOKS AND TAGS** (rename/delete), **ARCHIVE & TRASH** | Private (`ProtectedUserRoute`) |
| `/translate` | [Translate.js](../client/src/pages/Translate.js) | Translation. Tabs: **TRANSLATOR** (translate text and save), **DOCUMENT TRANSLATOR** (translate a PDF and save), **TRANSLATIONS** (saved list, filter, export), **DOCUMENTS** (saved document translations), **ARCHIVE**, **TRASH**, **DOCUMENT ARCHIVE/TRASH**, **LANGUAGES** | Private (`ProtectedUserRoute`) |
| `/users` | [Users.js](../client/src/pages/Users.js) | List all users, view a user's details and delete non-admin users | **Admin only** (`ProtectedAdminRoute`) |

### 1.3. FALLBACK ROUTE

| ROUTE | BEHAVIOUR | ACCESS |
|-------|-----------|--------|
| `*` | Any unknown route redirects to `/` with `<Navigate to='/' replace/>` (Login when logged out, Home when logged in). A 404 page element is written but commented out in `App.js` | Public |

### 1.4. PROTECTED ROUTES

| FILE | CHECK | IF THE CHECK FAILS |
|------|-------|--------------------|
| [ProtectedUserRoute.js](../client/src/protectedRoutes/ProtectedUserRoute.js) | `currentUser` exists | Redirect to `/` |
| [ProtectedAdminRoute.js](../client/src/protectedRoutes/ProtectedAdminRoute.js) | `currentUser` exists **and** `currentUser.admin === true` | Redirect to `/` |

> These guards only control what the client renders. The real protection is on the server (`checkJwtToken`, `checkAdmin`).

---

## 2. COMPONENTS

All components live in [client/src/components/](../client/src/components/).

### 2.1. LAYOUT COMPONENTS

| COMPONENT FILE | DESCRIPTION | USED IN | loggedIn STATE *`(App.js)`* |
|----------------|-------------|---------|-----------------------------|
| [MainHeader.js](../client/src/components/MainHeader.js) | Header for the Login and Registration pages, with date/time and `LOGIN` / `REGISTRATION` links | Login.js, Register.js | *loggedIn === false* |
| [Header.js](../client/src/components/Header.js) | Header and navbar for logged-in pages: `HOME`, `NOTE PAD`, `NOTES`, `TRANSLATE`, plus `USERS` for admins only | Home.js, NotePad.js, Notes.js, Translate.js, Users.js | *loggedIn === true* |
| [Footer.js](../client/src/components/Footer.js) | Footer with date/time and the logout button | Home.js, NotePad.js, Notes.js, Translate.js, Users.js | *loggedIn === true* |

### 2.2. FORM COMPONENTS

Some forms send their own request; others pass the form data up to the page, which sends the request.

| COMPONENT FILE | PURPOSE | USED IN | ENDPOINT | METHOD | REQUEST SENT BY |
|----------------|---------|---------|----------|--------|-----------------|
| [LoginForm.js](../client/src/components/LoginForm.js) | User login | Login.js | `/auth/login` | **POST** | Login.js |
| [RegistrationForm.js](../client/src/components/RegistrationForm.js) | User registration (sign up) | Register.js | `/auth/register` | **POST** | Register.js |
| [EditProfile.js](../client/src/components/EditProfile.js) | Update profile details and default languages | Home.js | `/user/editProfile` | **PATCH** | Home.js |
| [EditPassword.js](../client/src/components/EditPassword.js) | Change password | Home.js | `/user/editPassword` | **PATCH** | EditPassword.js |
| [AdminRegisForm.js](../client/src/components/AdminRegisForm.js) | Upgrade the logged-in user to admin (21+ and minimum account age) | Home.js | `/auth/setAdmin` | **PATCH** | AdminRegisForm.js |
| [NotePadForm.js](../client/src/components/NotePadForm.js) | Write a new note (title, content, language, notebook, tags) | NotePad.js | `/notes/addNote` | **POST** | NotePad.js |
| [AddNoteBook.js](../client/src/components/AddNoteBook.js) | Create a notebook | NotePad.js | `/notebooks` | **POST** | NotePad.js |
| [AddTag.js](../client/src/components/AddTag.js) | Create a tag | NotePad.js | `/tag/addTag` | **POST** | NotePad.js |
| [EditNoteForm.js](../client/src/components/EditNoteForm.js) | Edit the selected note | Notes.js | `/notes/:id` | **PATCH** | Notes.js |
| [TranslateForm.js](../client/src/components/TranslateForm.js) | Load languages, detect the source language, translate text and save the result | Translate.js | `/api/language/translate/v2/languages`<br>`/api/language/translate/v2/detect`<br>`/api/language/translate/v2`<br>`/translation/save` | **GET**<br>**POST**<br>**POST**<br>**POST** | TranslateForm.js |
| [DocTranslator.js](../client/src/components/DocTranslator.js) | Upload a PDF (max 5 MB), translate it, then save, copy or download the result as `.txt`. Opens on the user's default languages | Translate.js | `/api/language/translate/v2/languages`<br>`/document/translateDoc` (`multipart/form-data`)<br>`/document/saveDoc` | **GET**<br>**POST**<br>**POST** | DocTranslator.js |
| [FilterNotes.js](../client/src/components/FilterNotes.js) | Filter notes by language, notebook and tag | NotesList.js | `/notes/fetchNotes?…` | **GET** | Notes.js |
| [FilterTranslations.js](../client/src/components/FilterTranslations.js) | Filter translations by note, source and target language | TranslationsList.js | `/translation/fetch?…` | **GET** | TranslationsList.js |
| [ExportForm.js](../client/src/components/ExportForm.js) | Download notes or translations as `.csv` / `.xlsx` (uses the current filters) | NotesList.js, TranslationsList.js | `/export?type=…&format=…` | **GET** | ExportForm.js |

### 2.3. LIST AND PANEL COMPONENTS

| COMPONENT FILE | DESCRIPTION | USED IN | ENDPOINTS (METHOD) |
|----------------|-------------|---------|--------------------|
| [Profile.js](../client/src/components/Profile.js) | Shows the user's profile, toggles the edit forms, and lets an admin give up admin status | Home.js | `/auth/clearAdmin` (**PATCH**) |
| [NotesList.js](../client/src/components/NotesList.js) | Paginated list of active notes with filters, export and the selected note panel | Notes.js | — (data passed from Notes.js) |
| [NotePanal.js](../client/src/components/NotePanal.js) | Details of the selected note: edit, archive, move to trash, and a link to `/translate` with the note id | NotesList.js | `/archive/:id` (**PATCH**), `/notes/:id` (**DELETE**) |
| [NoteDataLists.js](../client/src/components/NoteDataLists.js) | Wrapper for the notebooks and tags lists | Notes.js | — |
| [NoteBookList.js](../client/src/components/NoteBookList.js) | List notebooks with note counts; rename/recolour and delete | NoteDataLists.js | `/notebooks/:id` (**PATCH**, **DELETE**) |
| [TagsList.js](../client/src/components/TagsList.js) | List tags with note counts; rename and delete | NoteDataLists.js | `/tag/:id` (**PUT**, **DELETE**) |
| [TranslationsList.js](../client/src/components/TranslationsList.js) | Paginated list of saved translations with filters, export and the selected translation panel. Re-fetches each time the tab opens | Translate.js | `/translation/fetch` (**GET**) |
| [TranslationPanal.js](../client/src/components/TranslationPanal.js) | Details of the selected translation: archive or move to trash | TranslationsList.js | `/archive/translation/:id` (**PATCH**), `/translation/:id` (**DELETE**) |
| [DocTranslationList.js](../client/src/components/DocTranslationList.js) | Paginated list of saved document translations (file name and languages). VIEW loads the full translation into a details panel with copy, download (`.txt`), archive and move to trash | Translate.js | `/document/fetchDocuments` (**GET**), `/document/fetchDoc/:id` (**GET**), `/archive/document/:id` (**PATCH**), `/document/:id` (**DELETE**) |
| [LanguagesList.js](../client/src/components/LanguagesList.js) | Table of supported languages, with a link to the Langbly language reference | Translate.js | — (uses `languageData.js`) |
| [UsersList.js](../client/src/components/UsersList.js) | Paginated table of all users, user details panel and delete user | Users.js | `/user/fetchUsers` (**GET**), `/user/fetchUser/:id` (**GET**), `/user/deleteUser/:id` (**DELETE**) |

### 2.4. ARCHIVE AND TRASH COMPONENTS

Archived items older than 60 days are moved to the trash by the server.

| COMPONENT FILE | DESCRIPTION | USED IN | ENDPOINTS (METHOD) |
|----------------|-------------|---------|--------------------|
| [ArchivedNotes.js](../client/src/components/ArchivedNotes.js) | Archived notes with days left before they move to the trash; restore or move to trash | Notes.js (ARCHIVE & TRASH tab) | `/archive/fetchNotes` (**GET**), `/archive/:id/restore` (**PATCH**), `/archive/:id` (**DELETE**) |
| [Trash.js](../client/src/components/Trash.js) | Paginated trashed notes with days left before purge; restore or delete permanently | Notes.js (ARCHIVE & TRASH tab) | `/notes/trash` (**GET**), `/notes/:id/restore` (**PATCH**), `/notes/:id/permanent` (**DELETE**) |
| [ArchivedTranslations.js](../client/src/components/ArchivedTranslations.js) | Archived translations; restore or move to trash | Translate.js (ARCHIVE & TRASH tab) | `/archive/fetchTranslations` (**GET**), `/archive/translation/:id/restore` (**PATCH**), `/archive/translation/:id` (**DELETE**) |
| [TrashedTranslations.js](../client/src/components/TrashedTranslations.js) | Paginated trashed translations; restore or delete permanently | Translate.js (ARCHIVE & TRASH tab) | `/translation/trash` (**GET**), `/translation/:id/restore` (**PATCH**), `/translation/:id/permanent` (**DELETE**) |
| [TrashArchiveDocs.js](../client/src/components/TrashArchiveDocs.js) | Archived **and** trashed document translations in one table with a STATUS column and days left. Archived rows: restore or move to trash. Trashed rows: restore or delete permanently. All archived rows show first; pagination pages through the trashed rows | Translate.js (DOCUMENT ARCHIVE/TRASH tab) | `/archive/fetchDocuments` (**GET**), `/document/trash` (**GET**), `/archive/document/:id/restore` (**PATCH**), `/archive/document/:id` (**DELETE**), `/document/:id/restore` (**PATCH**), `/document/:id/permanent` (**DELETE**) |

### 2.5. SHARED UI COMPONENTS

| COMPONENT FILE | DESCRIPTION | USED IN |
|----------------|-------------|---------|
| [Pagination.js](../client/src/components/Pagination.js) | Page controls and page-size selector (exports `PAGE_SIZES`) | NotesList.js, TranslationsList.js, Trash.js, TrashedTranslations.js, DocTranslationList.js, TrashArchiveDocs.js, UsersList.js |
| [LanguageSelector.js](../client/src/components/LanguageSelector.js) | Language dropdown used for both source and target language | TranslateForm.js |

---

## 3. COMPONENT TREE

```
App.js
├── LOGGED OUT
│   ├── Login.js ──────── MainHeader, LoginForm
│   └── Register.js ───── MainHeader, RegistrationForm
└── LOGGED IN
    ├── Home.js ───────── Header, Profile, EditProfile, EditPassword, AdminRegisForm, Footer
    ├── NotePad.js ────── Header, NotePadForm, AddNoteBook, AddTag, Footer
    ├── Notes.js ──────── Header, Footer
    │   ├── NotesList
    │   │   ├── FilterNotes
    │   │   ├── NotePanal
    │   │   ├── Pagination
    │   │   └── ExportForm
    │   ├── EditNoteForm
    │   ├── NoteDataLists
    │   │   ├── NoteBookList
    │   │   └── TagsList
    │   ├── ArchivedNotes
    │   └── Trash ─────── Pagination
    ├── Translate.js ──── Header, Footer
    │   ├── TranslateForm ── LanguageSelector
    │   ├── DocTranslator
    │   ├── TranslationsList
    │   │   ├── FilterTranslations
    │   │   ├── TranslationPanal
    │   │   ├── Pagination
    │   │   └── ExportForm
    │   ├── DocTranslationList ── Pagination (details panel built in)
    │   ├── ArchivedTranslations
    │   ├── TrashedTranslations ── Pagination
    │   ├── TrashArchiveDocs ── Pagination
    │   └── LanguagesList
    └── Users.js (admin) ─ Header, UsersList (Pagination), Footer
```

---

## 4. UTILITY FILES

Helper functions and data in [client/src/util/](../client/src/util/).

| FILE | PURPOSE | USED BY |
|------|---------|---------|
| [dateFunctions.js](../client/src/util/dateFunctions.js) | Date and time formatting (`dateDisplay`, `timeDisplay`, `formatTimestamp`, `TODAY`) | Headers, Footer, lists and panels |
| [languageData.js](../client/src/util/languageData.js) | Client copy of the supported languages list | Forms with language selects, LanguagesList |
| [languageFunc.js](../client/src/util/languageFunc.js) | `languageName` – turns a language code into its name | Notes and translations lists/panels |
| [listUtilFunc.js](../client/src/util/listUtilFunc.js) | Archive/trash countdown helpers (`ARCHIVE_DAYS`, `PURGE_DAYS`, `daysLeft`, `archiveDaysLeft`, `formatDaysLeft`, `urgentStyle`) | Archive and trash components (including TrashArchiveDocs) |
| [notesUtil.js](../client/src/util/notesUtil.js) | Empty note form values and note ↔ form conversion (`emptyNoteForm`, `noteToForm`, `textToHtml`) | NotePadForm, EditNoteForm |
| [formUtil.js](../client/src/util/formUtil.js) | Empty filter values and export helpers (`EMPTY_NOTE_FILTERS`, `EMPTY_FILTERS`, `EXPORT_TYPES`, `filenameFromHeader`); document upload rules (`ACCEPTED_EXTENSION`, `ACCEPTED_MIME_TYPE`, `MAX_FILE_SIZE_MB`, `MAX_FILE_SIZE_BYTES`) and `downloadName` for the `.txt` download | Notes.js, filters, lists, ExportForm, DocTranslator, DocTranslationList |
| [userFunc.js](../client/src/util/userFunc.js) | Empty profile form values (`emptyProfileForm`) | EditProfile |
