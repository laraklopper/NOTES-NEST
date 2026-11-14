# TRANSLATION_ROUTES — [`translationRoutes.js`](../server/routes/translationRoutes.js) BREAKDOWN

[`translationRoutes.js`](../server/routes/translationRoutes.js) is the Express router for the user's **translation history**: listing, saving, trashing, restoring and permanently deleting translations. It doesn't translate anything itself. Translating is done by `apiRoutes.js` (the Langbly proxy). This router stores the results the user chooses to keep.

Archiving translations is handled by a different router, `archiveRoutes.js` (see `ARCHIVE_ROUTES.md`). This router only reads and resets the archive fields.

```
TranslateForm
   │ 1. POST /api/language/translate/v2      (apiRoutes.js → Langbly)
   │    ← { translatedText, sourceLanguage, targetLanguage, ... }   nothing saved yet
   │
   │ 2. User clicks "Save"
   │    POST /translation/save                (this router → MongoDB)
   │    ← 201 { translation }   (or 200 if an identical one is already saved)
   ▼
TranslationsList / TranslationPanal
     GET    /translation/fetch                (this router)
     DELETE /translation/:id                  (this router: move to trash)
     PATCH  /archive/translation/:id          (archiveRoutes.js: archive)
   ▼
TrashedTranslations
     GET    /translation/trash                (this router)
     PATCH  /translation/:id/restore          (this router)
     DELETE /translation/:id/permanent        (this router)
```

Keeping **translate** and **save** as separate steps means the user can translate as often as they like without filling up their history, and only what they **choose** to keep is saved.

---

## TABLE OF CONTENTS
1. [ROUTE SUMMARY](#1-route-summary)
     - [1.1. GET `/translation/fetch`](#11-get-translationfetch)
     - [1.2. GET `/translation/trash`](#12-get-translationtrash)
     - [1.3. POST `/translation/save`](#13-post-translationsave)
     - [1.4. PATCH `/translation/:id/restore`](#14-patch-translationidrestore)
     - [1.5. DELETE `/translation/:id`](#15-delete-translationid)
     - [1.6. DELETE `/translation/:id/permanent`](#16-delete-translationidpermanent)
2. [IMPORTS AND SETUP](#2-imports-and-setup)
3. [SCHEMAS AND UTILITY FUNCTIONS](#3-schemas-and-utility-functions)
     - [3.1. SCHEMAS](#31-schemas)
          - [3.1.1. TRANSLATION SCHEMA](#311-translation-schema)
          - [3.1.2. NOTE SCHEMA](#312-note-schema)
     - [3.2. UTILITY FUNCTIONS](#32-utility-functions)
4. [RELATIONSHIPS](#4-relationships)
     - [4.1. HOW TRANSLATIONS RELATE TO NOTES](#41-how-translations-relate-to-notes)
5. [SECURITY](#5-security)
6. [STATUS CODE REFERENCES](#6-status-code-references)
7. [KNOWN GAPS AND HOUSE KEEPING](#7-known-gaps-and-house-keeping)
     - [7.1. GAPS](#71-gaps)
     - [7.2. HOUSE KEEPING](#72-house-keeping)
8. [REFERENCES](#8-references)

- *View [GLOSSARY.md](../GLOSSARY.md) for terminology*

---

<!-- SECTION 1 -->
## 1. ROUTE SUMMARY

The router is mounted at **`/translation`** in `app.js`. Every route requires a valid JWT (`checkJwtToken`).

| Method | Full Path | Middleware | Purpose |
|---|---|---|---|
| `GET` | `/translation/fetch` | `checkJwtToken` | Paginated, filterable list of **active** translations, newest first |
| `GET` | `/translation/trash` | `checkJwtToken` | Paginated list of **trashed** translations, most recently deleted first |
| `POST` | `/translation/save` | `checkJwtToken` | Save a translation to the user's history |
| `PATCH` | `/translation/:id/restore` | `checkJwtToken` | Move a trashed translation back to the main list |
| `DELETE` | `/translation/:id` | `checkJwtToken` | Move an active translation to the trash (soft delete) |
| `DELETE` | `/translation/:id/permanent` | `checkJwtToken` | Permanently delete a translation that's **already in the trash** |

`GET /trash` is declared right after `GET /fetch` so that, if a `GET /:id` route is ever added, `"trash"` isn't read as an ID. `DELETE /:id` can't clash with `DELETE /:id/permanent`, because they have a different number of path segments.

**Client side usage:**

| Method | Full Path | Frontend/Client side files |
|---|---|---|
| `GET` | `/translation/fetch` | [TranslationsList.js](../client/src/components/TranslationsList.js) (on load, and when the filters or page change) |
| `GET` | `/translation/trash` | [TrashedTranslations.js](../client/src/components/TrashedTranslations.js) (on load, on page change, and after each restore or delete) |
| `POST` | `/translation/save` | [TranslateForm.js](../client/src/components/TranslateForm.js) (Save button) |
| `PATCH` | `/translation/:id/restore` | [TrashedTranslations.js](../client/src/components/TrashedTranslations.js) (Restore button) |
| `DELETE` | `/translation/:id` | [TranslationPanal.js](../client/src/components/TranslationPanal.js) (Delete button) |
| `DELETE` | `/translation/:id/permanent` | [TrashedTranslations.js](../client/src/components/TrashedTranslations.js) (DELETE button in a trash row) |

---

### 1.1. GET `/translation/fetch`

**Purpose:** Fill the TranslationsList table with the user's **active** translations: paginated, filterable, newest first.

#### Query parameters (all optional)

| Param | Validation | Becomes |
|---|---|---|
| `note` | String + valid ObjectId | `filter.note`: only translations linked to that note |
| `sourceLanguage` | String + `languageCodeRegex` | `filter.sourceLanguage` |
| `targetLanguage` | String + `languageCodeRegex` | `filter.targetLanguage` |
| `page` | Whole number ≥ 1, default `1` | `skip` |
| `limit` | 1 to `MAX_LIMIT`, default `DEFAULT_LIMIT` | `limit` |

```
GET /translation/fetch?sourceLanguage=af&targetLanguage=en&page=2
GET /translation/fetch?note=6732a1f0c2b3d4e5f6071829
```

An empty value (`?note=`) means "no filter", the same as leaving it out.

#### Building the filter

```js
const filter = { user: userId, isArchived: { $ne: true }, deletedAt: null };
```

| Condition | Why |
|---|---|
| `user: userId` | Only the user's own translations |
| `isArchived: { $ne: true }` | Hides archived translations. `$ne: true` (rather than `false`) also matches translations saved **before** `isArchived` existed, which have no such field. |
| `deletedAt: null` | Hides trashed translations |

**The note filter:**

```js
if (note !== undefined && note !== '') {
    if (typeof note !== 'string' || !mongoose.Types.ObjectId.isValid(note)) → 400 "Invalid note id"
    filter.note = note;
}
```

The note's ownership doesn't need checking here, because `filter.user` already limits results to the user's own translations. Another user's note ID simply returns an empty list.

**The language filters, in one loop:**

```js
for (const [field, value] of [['sourceLanguage', sourceLanguage], ['targetLanguage', targetLanguage]]) {
    if (value === undefined || value === '') continue;// Not sent, so skip
    if (typeof value !== 'string' || !languageCodeRegex.test(value)) → 400 "Invalid language code"
    filter[field] = value;
}
```

The query param name and the Mongo field name are the **same**, so each entry only needs `[field, value]`. The `typeof value !== 'string'` check blocks `?sourceLanguage[$ne]=x`, which `qs` parses into `{ $ne: 'x' }`.

#### Query and count in parallel

```js
const { pageNumber, pageSize, skip } = parsePagination(page, limit);

const [translations, total] = await Promise.all([
    Translation.find(filter)
        .sort({ createdAt: -1 })// Newest first; uses the { user, createdAt } index
        .skip(skip)
        .limit(pageSize)
        .populate('note', 'title')// Only the note's title is needed for the list
        .select('-__v')
        .lean(),
    Translation.countDocuments(filter)
]);
```

| Piece | Why |
|---|---|
| `parsePagination` | Turns `page` / `limit` into safe numbers (see [3.2. UTILITY FUNCTIONS](#32-utility-functions)) |
| `Promise.all` | The page and the total are independent, so they run at the same time |
| `.populate('note', 'title')` | `note: "6732..."` becomes `note: { _id, title }`, so the list can show "From: Shopping list" |
| `.lean()` | Plain objects: faster, and fine because the data is only sent, not saved |

#### Response (200)

```json
{
  "translations": [
    {
      "_id": "6736...",
      "user": "6731...",
      "note": { "_id": "6732...", "title": "Vergadering" },
      "sourceText": "Goeie môre",
      "translatedText": "Good morning",
      "sourceLanguage": "af",
      "targetLanguage": "en",
      "characterCount": 10,
      "isArchived": false,
      "archivedAt": null,
      "deletedAt": null,
      "createdAt": "2026-11-12T09:14:00.000Z",
      "updatedAt": "2026-11-12T09:14:00.000Z"
    }
  ],
  "pagination": { "page": 1, "limit": 10, "total": 23, "totalPages": 3 }
}
```

A translation that isn't linked to a note has `note: null`. `textHash` is never included, because the field is `select: false`.

---

### 1.2. GET `/translation/trash`

**Purpose:** Fill the TrashedTranslations table, one page at a time.

#### Query parameters (all optional)

| Param | Validation | Default |
|---|---|---|
| `page` | Whole number ≥ 1 | `1` |
| `limit` | 1 to `MAX_LIMIT` | `DEFAULT_LIMIT` |

```js
const { pageNumber, pageSize, skip } = parsePagination(req.query.page, req.query.limit);

await trashExpiredArchivedTranslations(userId);// Apply the 60-day archive rule first

const filter = { user: userId, deletedAt: { $ne: null } };
const [translations, total] = await Promise.all([
    Translation.find(filter)
        .sort({ deletedAt: -1 })// Most recently trashed first
        .skip(skip)
        .limit(pageSize)
        .populate('note', 'title')
        .select('-__v')
        .lean(),
    Translation.countDocuments(filter)
]);
```

| Step | Why |
|---|---|
| `trashExpiredArchivedTranslations(userId)` | The global sweep only runs hourly (`startArchiveSweep` in `app.js`). Running it for this user first means a translation that passed the 60-day archive limit shows up in the trash **straight away**, not up to an hour later. It runs **before** the count, so `total` includes those translations. |
| `deletedAt: { $ne: null }` | Anything with a deletion date is in the trash |
| `.sort({ deletedAt: -1 })` | The most recently trashed translation is at the top |
| `Promise.all` + `countDocuments` | Same page + total pattern as `GET /fetch` |

#### Response (200)

```json
{
  "translations": [ { "_id": "6736...", "sourceText": "Goeie môre", "deletedAt": "2026-11-13T08:00:00.000Z", "...": "..." } ],
  "pagination": { "page": 1, "limit": 10, "total": 4, "totalPages": 1 }
}
```

`TrashedTranslations.js` shows the `Pagination` controls in the table footer, numbers rows across pages, and re-fetches after each restore or delete so the page refills from the next one. If that empties the last page, it steps back to the new last page. It shows the days left before the purge as `deletedAt + 30 days`.

---

### 1.3. POST `/translation/save`

**Purpose:** Save the current result from the TranslateForm to the user's history.

#### Request body

```json
{
  "sourceText": "Goeie môre",
  "translatedText": "Good morning",
  "sourceLanguage": "af",
  "targetLanguage": "en",
  "note": "6732a1f0c2b3d4e5f6071829"
}
```

| Field | Required | Rules |
|---|---|---|
| `sourceText` | ✅ | A non-empty string, max `MAX_TRANSLATION_CHARS` (schema) |
| `translatedText` | ✅ | A non-empty string, max `MAX_TRANSLATION_CHARS × 2` (schema) |
| `sourceLanguage` | ✅ | A non-empty string (format checked by the schema) |
| `targetLanguage` | ✅ | A non-empty string (format and source ≠ target checked by the schema) |
| `note` | ❌ | A string ID, `null` or `''` (both mean "no note"). It must be the user's **active** note (not archived or trashed). |

`TranslateForm` currently sends `{ sourceText, translatedText, sourceLanguage, targetLanguage }` only, so saved translations from the form have `note: null`.

#### Step 1: Required strings check

```js
if ([sourceText, translatedText, targetLanguage]
        .some((field) => typeof field !== 'string' || !field.trim())) → 400 "Translate some text before saving"

if (typeof sourceLanguage !== 'string' || !sourceLanguage.trim()) → 400 "Choose the source language before saving"
```

Together these cover **presence**, **blank values** and **type** (which blocks operator injection) for all four fields. The first message is for the most likely cause: pressing Save before translating anything.

`sourceLanguage` is checked on its own because it can be missing **after** a successful translation: `POST /api/language/translate/v2` returns `sourceLanguage: null` when the user picks "auto" and Langbly doesn't report a detected language. `TranslateForm` shows the server's message, so the user is told to pick the source language instead of being told to translate again.

#### Step 2: The optional note link

```js
let noteId = null;// null = not linked to a note
if (note !== undefined && note !== null && note !== '') {// '' = "No note", same as the fetch filter
    if (typeof note !== 'string' || !mongoose.Types.ObjectId.isValid(note)) → 400 "Invalid note id"
    const ownNote = await Note.findOne({ _id: note, user: userId, deletedAt: null }).select('isArchived').exec();
    if (!ownNote || ownNote.isArchived) → 400 "That note cannot be translated"
    noteId = note;
}
```

| Condition | Blocks |
|---|---|
| `note !== ''` | Treats an empty `<select>` value ("No note") the same as `null`, matching `GET /fetch?note=` |
| `user: userId` | Linking a translation to **another user's** note |
| `deletedAt: null` | Linking to a note in the **trash** |
| `ownNote.isArchived` | Linking to an **archived** note |
| `.select('isArchived')` | Loads only the one field that's needed |

One message covers "doesn't exist", "isn't yours", "is trashed" and "is archived", so nothing is revealed about notes that belong to other users.

#### Step 3: Skip duplicates

```js
const existing = await Translation.findOne({
    user: userId,
    textHash: Translation.hashText(sourceText, translatedText),// Uses the { user, textHash } index
    note: noteId,
    sourceText, translatedText, sourceLanguage, targetLanguage,// Guards against a hash collision
    isArchived: { $ne: true }, deletedAt: null// Only active translations count
}).populate('note', 'title').select('-__v').lean();
if (existing) → 200 { message: 'Translation already saved', created: false, translation: existing }
```

`textHash` is a SHA-256 of `sourceText + '\0' + translatedText` (see [3.1.1. TRANSLATION SCHEMA](#311-translation-schema)). The `{ user, textHash }` index takes MongoDB straight to the (almost always zero or one) matching translations, so it doesn't have to compare the full text of every translation the user has saved. The full text fields stay in the filter, so a hash collision can never return the wrong translation.

If an identical **active** translation already exists, it's returned instead of saving a second copy. An identical translation that's archived or trashed doesn't count, because the user can't see it in the main list, so saving again creates a new one. `TranslateForm` also disables Save after a successful save, so this mainly protects against direct API calls and other tabs.

#### Step 4: Create

```js
const newTranslation = await Translation.create({
    user: userId,// From the token
    note: noteId,// Verified note ID or null
    sourceText, translatedText, sourceLanguage, targetLanguage
});
await newTranslation.populate('note', 'title');// Same note shape as GET /fetch
```

`characterCount` and `textHash` **aren't** sent by the client. A `pre('validate')` hook works them out from the text, so the client can't fake usage numbers. Building the document from **named fields** means the client can't set `user`, `characterCount`, `textHash`, `isArchived`, `deletedAt` or anything else.

#### Responses

**201**: a new translation was saved.

```json
{
  "message": "Translation saved successfully",
  "created": true,
  "translation": { "_id": "6736...", "note": { "_id": "6732...", "title": "Vergadering" }, "sourceText": "Goeie môre", "characterCount": 10, "...": "..." }
}
```

**200**: an identical active translation was already saved.

```json
{ "message": "Translation already saved", "created": false, "translation": { "_id": "6736...", "...": "..." } }
```

In both cases `translation.note` is `{ _id, title }` or `null`, the same shape as `GET /fetch`, so the frontend can add it to a list straight away.

#### Errors

| Error | Status |
|---|---|
| Missing or blank text or target language | `400` "Translate some text before saving" |
| Missing source language | `400` "Choose the source language before saving" |
| An invalid note ID | `400` "Invalid note id" |
| The note isn't available | `400` "That note cannot be translated" |
| `ValidationError` (bad language code, same source and target, text too long, etc.) | `400` + the first schema message |
| Anything else | `500` |

---

### 1.4. PATCH `/translation/:id/restore`

**Purpose:** Move a trashed translation back to the main translations list.

```js
const translation = await Translation.findOneAndUpdate(
    { _id: id, user: userId, deletedAt: { $ne: null } },// Must be the user's AND in the trash
    { $set: { deletedAt: null, isArchived: false, archivedAt: null } }
).select('_id sourceText');
```

| Part | Why |
|---|---|
| `deletedAt: { $ne: null }` | Only a translation that's actually in the trash can be restored |
| `deletedAt: null` | Takes it out of the trash **and** out of the 30-day TTL purge (the TTL index ignores `null`) |
| `isArchived: false, archivedAt: null` | Restores to the **main list**, never the archive |

**Response (200):**

```json
{ "message": "Translation restored", "translation": { "_id": "6736...", "sourceText": "Goeie môre" } }
```

**400** "Invalid translation id" if `:id` isn't a valid ObjectId. **404** "Translation not found in trash" if it doesn't exist, isn't the user's, or isn't in the trash.

---

### 1.5. DELETE `/translation/:id`

**Purpose:** Move an **active** translation to the trash (soft delete). It can be restored for 30 days.

```js
const translation = await Translation.findOneAndUpdate(
    { _id: id, user: userId, isArchived: { $ne: true }, deletedAt: null },// The user's, active only
    { $set: { deletedAt: new Date(), isArchived: false, archivedAt: null } }
).select('_id sourceText');
```

| Part | Why |
|---|---|
| `isArchived: { $ne: true }` | Archived translations are trashed through their own route, `DELETE /archive/translation/:id`. `$ne: true` also matches older translations without the field. |
| `deletedAt: null` in the filter | A translation that's already in the trash returns 404 instead of having its 30-day timer reset |
| `deletedAt: new Date()` | Moves it to the trash and starts the TTL countdown |
| `isArchived: false, archivedAt: null` | Keeps the three states separate (see [Lifecycle](#lifecycle)) |

**Response (200):**

```json
{ "message": "Translation moved to trash", "translation": { "_id": "6736...", "sourceText": "Goeie môre" } }
```

**400** "Invalid translation id" if `:id` isn't a valid ObjectId. **404** "Translation not found" if it doesn't exist, isn't the user's, is archived, or is already in the trash.

---

### 1.6. DELETE `/translation/:id/permanent`

**Purpose:** Permanently delete one translation from the trash.

```js
const translation = await Translation.findOneAndDelete(
    { _id: id, user: userId, deletedAt: { $ne: null } }// Must be the user's AND in the trash
).select('_id sourceText');
```

Requiring `deletedAt: { $ne: null }` means an **active** translation can't be wiped in one step. It has to go through the trash first, so a wrong click can always be undone.

**Response (200):**

```json
{ "message": "Translation permanently deleted", "translation": { "_id": "6736...", "sourceText": "Goeie môre" } }
```

**400** "Invalid translation id" if `:id` isn't a valid ObjectId. **404** "Translation not found in trash" if it doesn't exist, isn't the user's, or isn't in the trash.

---

<!-- SECTION 2: IMPORTS AND SETUP -->
## 2. IMPORTS AND SETUP

```js
const express = require('express');
const mongoose = require('mongoose');
const Translation = require('../models/translationSchema');
const Note = require('../models/noteSchema');
const { checkJwtToken } = require('../middleware/securityMiddleware');
const { languageCodeRegex } = require('../util/schemaUtil');
const { parsePagination, paginationInfo } = require('../util/apiUtil');
const { trashExpiredArchivedTranslations } = require('../util/archiveUtil');
const router = express.Router()
```

`.env` is loaded once at the top of `app.js`, so this file doesn't call `dotenv` itself.

| Import | Used For |
|---|---|
| `express` | `express.Router()` |
| `mongoose` | `ObjectId.isValid()` for `:id`, the `note` filter and the `note` body field |
| `Translation` | The model this router manages |
| `Note` | `POST /save`: checks that the linked note exists, belongs to the user, and is active |
| `checkJwtToken` | Auth on every route; sets `req.user.id` |
| `languageCodeRegex` | Validates the `sourceLanguage` and `targetLanguage` filters in `GET /fetch` |
| `parsePagination`, `paginationInfo` | Paging for `GET /fetch` and `GET /trash`, **shared** with the notes lists |
| `trashExpiredArchivedTranslations` | `GET /trash`: applies the 60-day archive rule for this user before listing |

---

<!-- SECTION 3: SCHEMAS AND UTILITY FUNCTIONS -->
## 3. SCHEMAS AND UTILITY FUNCTIONS

### 3.1. SCHEMAS

#### 3.1.1. TRANSLATION SCHEMA

Defined in [translationSchema.js](../server/models/translationSchema.js):

| Field | Type | Set By |
|---|---|---|
| `user` | ObjectId → User | The route (from the token) |
| `note` | ObjectId → Note, or `null` | The route (optional link to the note the text came from) |
| `sourceText` | String, max `MAX_TRANSLATION_CHARS` | The client |
| `translatedText` | String, max `MAX_TRANSLATION_CHARS × 2` (translations can run longer than the source) | The client |
| `sourceLanguage` | Language code (`languageCodeRegex`) | The client |
| `targetLanguage` | Language code, must differ from `sourceLanguage` | The client |
| `textHash` | SHA-256 hex string, `select: false` (never sent to the client) | **A schema hook** (`Translation.hashText(sourceText, translatedText)`) |
| `characterCount` | Number | **A schema hook** (`sourceText.length`) |
| `isArchived` | Boolean, default `false` | `archiveRoutes.js`; reset by this router |
| `archivedAt` | Date or `null` | `archiveRoutes.js`; reset by this router |
| `deletedAt` | Date or `null` (a date = in the trash) | This router (and the archive sweep) |
| `createdAt` / `updatedAt` | Date | `timestamps: true` |

**Indexes**

| Index | Used For |
|---|---|
| `{ user: 1 }`, `{ note: 1 }` | Single-field lookups (owner, translations of one note) |
| `{ user: 1, createdAt: -1 }` | `GET /fetch`: the user's translations, newest first |
| `{ user: 1, textHash: 1 }` | `POST /save`: the duplicate check |
| `{ user: 1, isArchived: 1, deletedAt: 1, archivedAt: -1 }` | The archive list |
| `{ isArchived: 1, archivedAt: 1 }` | The 60-day archive sweep (`util/archiveUtil.js`) |
| `{ deletedAt: 1 }` with `expireAfterSeconds: THIRTY_DAYS_IN_SECONDS` | **TTL purge**: MongoDB deletes a translation 30 days after it was trashed |

**Hooks and statics**

| Name | Kind | What it does |
|---|---|---|
| `hashText(sourceText, translatedText)` | Static | SHA-256 of `sourceText + '\0' + translatedText`. The `\0` separator means `"ab" + "c"` and `"a" + "bc"` hash differently. |
| `pre('validate')` | Hook | Sets `characterCount` when `sourceText` changes, and `textHash` when either text changes |
| `getMonthlyUsage(userId)` | Static | Sums `characterCount` for the current calendar month (not used by this router) |
| `toJSON` transform | Option | Removes `__v` and `textHash` from any document sent with `res.json()` |

##### Lifecycle

A translation is always in exactly one of three states, decided by `isArchived` and `deletedAt`:

| State | `isArchived` | `deletedAt` | Shown In |
|---|---|---|---|
| **Active** | `false` (or missing) | `null` | `GET /translation/fetch` |
| **Archived** | `true` | `null` | `GET /archive/fetchTranslations` |
| **Trashed** | `false` | a date | `GET /translation/trash` |

```
            save                    PATCH /archive/translation/:id
   ──────────────► ACTIVE ◄──────────────────────────────────────► ARCHIVED
                   │  ▲      PATCH /archive/translation/:id/restore   │
       DELETE /:id │  │ PATCH /:id/restore                            │ DELETE /archive/translation/:id
                   ▼  │                                               │ or 60 days after archiving (sweep)
                   TRASHED ◄──────────────────────────────────────────┘
                     │
                     │ DELETE /:id/permanent, or 30 days later (TTL index)
                     ▼
                   gone
```

A translation in **any** state is also deleted when its linked note is permanently deleted or purged (see [4.1. HOW TRANSLATIONS RELATE TO NOTES](#41-how-translations-relate-to-notes)).

Every route that moves a translation into or out of the trash also sets `isArchived: false, archivedAt: null`. That way a trashed translation is never "archived" as well, and restoring it always returns it to the **main list** (not the archive).

#### 3.1.2. NOTE SCHEMA

Defined in [noteSchema.js](../server/models/noteSchema.js). This router only **reads** notes; it never changes them. The fields it relies on:

| Field | Used By | Why |
|---|---|---|
| `_id` | `POST /save` | The note being linked |
| `user` | `POST /save` | The note must belong to the signed-in user |
| `isArchived` | `POST /save` | Archived notes can't be linked |
| `deletedAt` | `POST /save` | Trashed notes can't be linked |
| `title` | `GET /fetch`, `GET /trash`, `POST /save` | The only field loaded by `.populate('note', 'title')` |

`noteSchema` also has a `post('findOneAndDelete')` hook that deletes the note's translations. `DELETE /notes/:id/permanent` already removes them first, so the hook is a safety net and normally finds none (see [4.1](#41-how-translations-relate-to-notes)).

### 3.2. UTILITY FUNCTIONS

| Function | File | Used By | What it does |
|---|---|---|---|
| `parsePagination(page, limit)` | [apiUtil.js](../server/util/apiUtil.js) | `GET /fetch`, `GET /trash` | Turns the query strings into `{ pageNumber, pageSize, skip }` |
| `paginationInfo(pageNumber, pageSize, total)` | [apiUtil.js](../server/util/apiUtil.js) | `GET /fetch`, `GET /trash` | Builds the `pagination` object in the response |
| `trashExpiredArchivedTranslations(userId)` | [archiveUtil.js](../server/util/archiveUtil.js) | `GET /trash` | Moves this user's translations archived more than 60 days ago to the trash |
| `removeOrphanedTranslations()` | [archiveUtil.js](../server/util/archiveUtil.js) | Hourly sweep (`app.js`) | Deletes translations whose note was purged by the TTL index (see [4.1](#cleaning-up-after-the-ttl-purge)) |
| `Translation.hashText()` | [translationSchema.js](../server/models/translationSchema.js) | `POST /save` | Builds the `textHash` used by the duplicate check |
| `languageCodeRegex` | [schemaUtil.js](../server/util/schemaUtil.js) | `GET /fetch` | `/^[a-z]{2,3}(-[A-Za-z]{2,4})?$/`, for example `en`, `af`, `zh-CN` |

**Pagination helpers**

```js
const parsePagination = (page, limit) => {
    const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(limit, 10) || DEFAULT_LIMIT, 1), MAX_LIMIT);
    return { pageNumber, pageSize, skip: (pageNumber - 1) * pageSize };
};

const paginationInfo = (pageNumber, pageSize, total) => ({
    page: pageNumber, limit: pageSize, total,
    totalPages: Math.max(Math.ceil(total / pageSize), 1)// At least 1, even for an empty list
});
```

`DEFAULT_LIMIT` is `10` and `MAX_LIMIT` is `50`.

| Input | `pageNumber` | `pageSize` |
|---|---|---|
| missing | 1 | `10` |
| `page=-3&limit=9999` | 1 | `50` |
| `page=abc&limit=0` | 1 | `10` |

---

<!-- SECTION 4 -->
## 4. RELATIONSHIPS

### 4.1. HOW TRANSLATIONS RELATE TO NOTES

A translation can **optionally** point to the note its text came from.

| Note Event | What Happens to Its Translations |
|---|---|
| Note edited | Nothing. They're a snapshot of the text at the time. |
| Note archived | Kept and still listed. New translations **can't** be linked to it. |
| Note moved to the trash | Kept and still listed. New translations **can't** be linked to it. |
| Note restored | Linking is allowed again |
| `DELETE /notes/:id/permanent` | **Deleted along with the note**, whatever their state (`Translation.deleteMany({ note: id, user: userId })` in `noteRoutes.js`) |
| 30-day TTL purge of a trashed note | **Deleted by the next hourly sweep** (`removeOrphanedTranslations()` in `util/archiveUtil.js`) |
| User deleted (`userRoutes.js`) | All of the user's translations are deleted |

#### Cleaning up after the TTL purge

The TTL index deletes notes inside MongoDB, so no route code runs and the cascade in `DELETE /notes/:id/permanent` is skipped. `removeOrphanedTranslations()` runs with the hourly archive sweep and gives purged notes the same result:

```js
const missing = await Translation.aggregate([
    { $match: { note: { $ne: null } } },
    { $group: { _id: '$note' } },// One entry per linked note
    { $lookup: {
        from: Note.collection.name,
        let: { noteId: '$_id' },
        pipeline: [
            { $match: { $expr: { $eq: ['$_id', '$$noteId'] } } },// Uses the _id index
            { $project: { _id: 1 } }// Only existence matters
        ],
        as: 'found'
    } },
    { $match: { found: { $size: 0 } } },// The note no longer exists
    { $project: { _id: 1 } }
]).allowDiskUse(true);
await Translation.deleteMany({ note: { $in: missing.map((doc) => doc._id) } });
```

The join runs **inside MongoDB**, so only the IDs of notes that are actually missing come back to Node (usually none), instead of every linked note ID in the collection. `allowDiskUse(true)` lets the `$group` stage spill to disk if the collection grows very large.

A translation of a purged note can still exist for up to an hour before the sweep runs. During that time `populate` gives `note: null`, so the frontend should keep handling a missing note:

```jsx
<td>{t.note?.title || '—'}</td>// No note, or the note was just purged
```

---

<!-- SECTION 5: ROUTER SECURITY -->
## 5. SECURITY

### 5.1. PACKAGES

| Package | Where | Security role |
|---|---|---|
| `jsonwebtoken` | `securityMiddleware.js` | Verifies the session JWT in `checkJwtToken` |
| `cookie-parser` | `app.js` | Reads the HTTP-only `token` cookie into `req.cookies` |
| `helmet` | `app.js` | Sets secure HTTP response headers for every route |
| `crypto` (Node built-in) | `translationSchema.js` | SHA-256 for `textHash` |

### 5.2. MIDDLEWARE

| Middleware | File | Routes | What it does |
|---|---|---|---|
| `checkJwtToken` | [securityMiddleware.js](../server/middleware/securityMiddleware.js) | All | **401** if the cookie is missing, the token is invalid or expired, the user no longer exists, or the session was signed out (`tokenVersion` changed). Sets `req.user`. |

These routes have **no rate limiter**. They only touch the user's own documents in MongoDB, unlike `/api/language/translate/v2`, which spends Langbly quota.

### 5.3. PATTERNS SHARED BY EVERY ROUTE

| Pattern | Why |
|---|---|
| `userId` comes from `req.user.id`, never the request | A user can't act on someone else's data by sending a different ID |
| `mongoose.Types.ObjectId.isValid(id)` before querying | Turns a `CastError` (500) into a clean 400 |
| `typeof ... === 'string'` on query and body values | Blocks operator injection such as `?note[$ne]=x` |
| Ownership **and** state in one filter (`{ _id, user, deletedAt: ... }`) | One query; another user's translation returns **404**, not 403, so IDs can't be probed |
| One message for every unavailable note in `POST /save` | Doesn't reveal whether a note ID belongs to someone else |
| Documents built from **named fields** in `POST /save` | The client can't set `user`, `characterCount`, `textHash`, `isArchived` or `deletedAt` |
| `textHash` is `select: false` and removed by `toJSON` | The internal hash never reaches the browser |
| Permanent delete only works on trashed translations | A wrong click can always be undone |
| `.select('_id sourceText')` on writes | Only what the response needs is loaded |
| `try / catch` → `500 "Internal Server Error"` | Internal error details aren't sent to the client |

---

<!-- SECTION 6 -->
## 6. STATUS CODE REFERENCES

| Code | Route(s) | When |
|---|---|---|
| `200` | fetch, trash, restore, delete, permanent | Success (including an empty list) |
| `200` | save | An identical active translation was already saved (`created: false`) |
| `201` | save | Translation saved (`created: true`) |
| `400` | fetch | Invalid note ID or language code filter |
| `400` | save | A missing or blank field, a missing source language, an invalid note ID, the note isn't available, schema validation |
| `400` | restore, delete, permanent | `:id` isn't a valid ObjectId |
| `401` | all | (From `checkJwtToken`) Not logged in, or the token is invalid, expired or signed out |
| `404` | delete | Translation not found, not the user's, archived, or already in the trash |
| `404` | restore, permanent | Translation not found, not the user's, or not in the trash |
| `500` | all | Unexpected error |

---

<!-- SECTION 7 -->
## 7. KNOWN GAPS AND HOUSE KEEPING

### 7.1. GAPS

#### Gap 1: `DELETE /delete/:id` put the verb in the URL (fixed)

The soft delete is now `DELETE /translation/:id`, which matches the REST convention and the `/:id/restore` and `/:id/permanent` routes. The notes router was renamed at the same time (`DELETE /notes/:id`), along with their frontend calls (`TranslationPanal.js`, `NotePanal.js`), the `app.js` mount comment and `README.md`.

#### Gap 2: The duplicate check compared full text (fixed)

Translations now store a `textHash` (SHA-256 of both texts), and a `{ user: 1, textHash: 1 }` index covers the duplicate check in `POST /save` (see [Step 3](#step-3-skip-duplicates)).

**Older translations:** documents saved before `textHash` existed don't have one, so the duplicate check can't match them. Saving the exact same translation again creates **one** new copy (which does have a hash), and later saves match that copy. To include old translations too, backfill the hash once:

```js
for await (const t of Translation.find({ textHash: { $exists: false } }).select('sourceText translatedText')) {
    await Translation.updateOne({ _id: t._id }, { $set: { textHash: Translation.hashText(t.sourceText, t.translatedText) } });
}
```

#### Gap 3: The orphan cleanup scanned every linked note (fixed)

`removeOrphanedTranslations()` now uses an aggregation with `$lookup`, so the join runs inside MongoDB and only the IDs of missing notes reach Node (see [Cleaning up after the TTL purge](#cleaning-up-after-the-ttl-purge)). `$lookup` still checks each linked note once per hour, but against the `_id` index, and nothing is loaded into the server's memory.

### 7.2. HOUSE KEEPING

**Done:**

| Issue | What changed |
|---|---|
| `parsePagination` and `paginationInfo` were defined at the top of this router | Moved to `util/apiUtil.js` and shared with the notes lists; the router now imports them instead of `DEFAULT_LIMIT` / `MAX_LIMIT` |

**Still to do:**

| Issue | Where | Change |
|---|---|---|
| Missing semicolon | `translationRoutes.js`: `const router = express.Router()` | Add `;` to match the other lines |
| `characterCount` comment says "Set the data type as a String" | `translationSchema.js` | "Set the data type as a Number" |
| "Field to archivedFlag" comment | `translationSchema.js`, above `isArchived` | "Field for the archived flag" |
| Header comment doesn't list `GET /translation/trash` as a per-user caller | `archiveUtil.js`, top comment | Add it next to `GET /notes/trash` |
| `getMonthlyUsage` isn't called anywhere | `translationSchema.js` | Use it (for example a usage display) or remove it |

---

<!-- SECTION 8: REFERENCES -->
## 8. REFERENCES

**Project files**

- [translationRoutes.js](../server/routes/translationRoutes.js)
- [translationSchema.js](../server/models/translationSchema.js), [noteSchema.js](../server/models/noteSchema.js)
- [apiUtil.js](../server/util/apiUtil.js), [archiveUtil.js](../server/util/archiveUtil.js), [schemaUtil.js](../server/util/schemaUtil.js)
- [securityMiddleware.js](../server/middleware/securityMiddleware.js)
- [TranslateForm.js](../client/src/components/TranslateForm.js), [TranslationsList.js](../client/src/components/TranslationsList.js), [TranslationPanal.js](../client/src/components/TranslationPanal.js), [TrashedTranslations.js](../client/src/components/TrashedTranslations.js)
- [API_ROUTES.md](API_ROUTES.md), [ARCHIVE_ROUTES.md](ARCHIVE_ROUTES.md), [NOTE_ROUTES.md](NOTE_ROUTES.md), [GLOSSARY.md](../GLOSSARY.md)

**External documentation**

- [Express: Routing](https://expressjs.com/en/guide/routing.html)
- [Mongoose: Queries](https://mongoosejs.com/docs/queries.html)
- [Mongoose: Populate](https://mongoosejs.com/docs/populate.html)
- [Mongoose: Middleware (hooks)](https://mongoosejs.com/docs/middleware.html)
- [MongoDB: TTL Indexes](https://www.mongodb.com/docs/manual/core/index-ttl/)
- [MongoDB: `$lookup`](https://www.mongodb.com/docs/manual/reference/operator/aggregation/lookup/)
- [Node.js: `crypto.createHash()`](https://nodejs.org/api/crypto.html#cryptocreatehashalgorithm-options)
- [MDN: HTTP response status codes](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status)
