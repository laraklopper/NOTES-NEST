# TRANSLATION_ROUTES.md — `translationRoutes.js` Breakdown

`translationRoutes.js` is the Express router for the user's **translation history**: listing, saving and deleting translations. It doesn't translate anything itself. Translating is done by `apiRoutes.js` (the Langbly proxy). This router stores the results the user chooses to keep.

```
TranslateForm
   │ 1. POST /api/language/translate/v2      (apiRoutes.js → Langbly)
   │    ← { translatedText, sourceLanguage, targetLanguage, ... }   nothing saved yet
   │
   │ 2. User clicks "Save"
   │    POST /translation/save                (this router → MongoDB)
   │    ← 201 { translation }
   ▼
TranslationsList
     GET /translation/fetch                   (this router)
     DELETE /translation/delete/:id           (this router)
```

Keeping **translate** and **save** as separate steps means the user can translate as often as they like without filling up their history, and only what they **choose** to keep is saved.

---

## Table of Contents

1. [Route Summary](#1-route-summary)
2. [The Translation Document](#2-the-translation-document)
3. [Imports & Setup](#3-imports--setup)
4. [GET /translation/fetch](#4-get-translationfetch)
5. [POST /translation/save](#5-post-translationsave)
6. [DELETE /translation/delete/:id](#6-delete-translationdeleteid)
7. [How Translations Relate to Notes](#7-how-translations-relate-to-notes)
8. [Status Code Reference](#8-status-code-reference)
9. [Known Gaps & Housekeeping](#9-known-gaps--housekeeping)

---

## 1. Route Summary

The router is mounted at **`/translation`** in `app.js`. Every route requires a valid JWT (`checkJwtToken`).

| Method | Full Path | Purpose |
|---|---|---|
| `GET` | `/translation/fetch` | Paginated, filterable list of saved translations, newest first |
| `POST` | `/translation/save` | Save a translation to the user's history |
| `DELETE` | `/translation/delete/:id` | Permanently delete a saved translation (there's no trash) |

---

## 2. The Translation Document

Based on what the routes read and write, a saved translation looks like this:

| Field | Type | Set By |
|---|---|---|
| `user` | ObjectId → User | The route (from the token) |
| `note` | ObjectId → Note, or `null` | The route (optional link to the note the text came from) |
| `sourceText` | String | The client |
| `translatedText` | String | The client |
| `sourceLanguage` | Language code | The client |
| `targetLanguage` | Language code | The client |
| `characterCount` | Number | **A schema hook** (from `sourceText`) |
| `createdAt` / `updatedAt` | Date | `timestamps: true` |

---

## 3. Imports & Setup

```js
require('dotenv').config()
const express = require('express');
const mongoose = require('mongoose');
const Translation = require('../models/translationSchema');
const Note = require('../models/noteSchema');
const { checkJwtToken } = require('../middleware/securityMiddleware');
const { languageCodeRegex } = require('../util/schemaUtil');
const { DEFAULT_LIMIT, MAX_LIMIT } = require('../util/apiUtil')
```

| Import | Used For |
|---|---|
| `dotenv` | Loads `.env`. It isn't used directly in this file. |
| `mongoose` | `ObjectId.isValid()` for `:id`, the `note` filter and the `note` body field |
| `Translation` | The model this router manages |
| `Note` | `POST /save`: checks that the linked note exists, belongs to the user, and is active |
| `checkJwtToken` | Auth on every route; sets `req.user.id` |
| `languageCodeRegex` | Validates the `sourceLanguage` and `targetLanguage` filters |
| `DEFAULT_LIMIT`, `MAX_LIMIT` | Pagination defaults, **shared** from `apiUtil` |

---

## 4. GET `/translation/fetch`

**Purpose:** Fill the TranslationsList table: paginated, filterable, newest first.

### Query parameters (all optional)

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

### Building the filter

```js
const filter = { user: userId };// Always: only the user's own translations
```

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

This is the same loop pattern as `noteRoutes.js`. Here the query param name and the Mongo field name are the **same**, so each entry only needs `[field, value]`.

The `typeof value !== 'string'` check blocks `?sourceLanguage[$ne]=x`, which `qs` parses into `{ $ne: 'x' }`.

### Pagination

```js
const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
const pageSize = Math.min(Math.max(parseInt(limit, 10) || DEFAULT_LIMIT, 1), MAX_LIMIT);
```

| Input | `pageNumber` | `pageSize` |
|---|---|---|
| missing | 1 | `DEFAULT_LIMIT` |
| `page=-3&limit=9999` | 1 | `MAX_LIMIT` |
| `page=abc&limit=0` | 1 | `DEFAULT_LIMIT` |

### Query and count in parallel

```js
const [translations, total] = await Promise.all([
    Translation.find(filter)
        .sort({ createdAt: -1 })// Newest first; uses the { user, createdAt } index
        .skip((pageNumber - 1) * pageSize)
        .limit(pageSize)
        .populate('note', 'title')// Only the note's title is needed for the list
        .select('-__v')
        .lean(),
    Translation.countDocuments(filter)
]);
```

| Piece | Why |
|---|---|
| `Promise.all` | The page and the total are independent, so they run at the same time |
| `.populate('note', 'title')` | `note: "6732..."` becomes `note: { _id, title }`, so the list can show "From: Shopping list" |
| `.lean()` | Plain objects: faster, and fine because the data is only sent, not saved |

**About the index:** a compound index `{ user: 1, createdAt: -1 }` lets MongoDB find this user's translations **already in date order**, so no in-memory sort is needed.

### Response (200)

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
      "createdAt": "2026-11-12T09:14:00.000Z",
      "updatedAt": "2026-11-12T09:14:00.000Z"
    }
  ],
  "pagination": { "page": 1, "limit": 10, "total": 23, "totalPages": 3 }
}
```

A translation that isn't linked to a note has `note: null`. So does one whose note has been **permanently deleted or purged** (see [section 7](#7-how-translations-relate-to-notes)).

---

## 5. POST `/translation/save`

**Purpose:** Save the current result from the TranslateForm to the user's history.

### Request body

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
| `sourceText` | ✅ | A non-empty string |
| `translatedText` | ✅ | A non-empty string |
| `sourceLanguage` | ✅ | A non-empty string (format checked by the schema) |
| `targetLanguage` | ✅ | A non-empty string (format checked by the schema) |
| `note` | ❌ | A string ID or `null`. It must be the user's **active** note (not archived or trashed). |

### Step 1: Required strings check

```js
if ([sourceText, translatedText, sourceLanguage, targetLanguage]
        .some((field) => typeof field !== 'string' || !field.trim())) → 400 "Translate some text before saving"
```

One check covers **presence**, **blank values** and **type** (which blocks operator injection) for all four fields. The message is written for the user: the most likely cause is pressing Save before translating anything.

### Step 2: The optional note link

```js
let noteId = null;// null = not linked to a note
if (note !== undefined && note !== null) {
    if (typeof note !== 'string' || !mongoose.Types.ObjectId.isValid(note)) → 400 "Invalid note id"
    const ownNote = await Note.findOne({ _id: note, user: userId, deletedAt: null }).select('isArchived').exec();
    if (!ownNote || ownNote.isArchived) → 400 "That note cannot be translated"
    noteId = note;
}
```

| Condition | Blocks |
|---|---|
| `user: userId` | Linking a translation to **another user's** note |
| `deletedAt: null` | Linking to a note in the **trash** |
| `ownNote.isArchived` | Linking to an **archived** note |
| `.select('isArchived')` | Loads only the one field that's needed |

One message covers "doesn't exist", "isn't yours", "is trashed" and "is archived", so nothing is revealed about notes that belong to other users.

### Step 3: Create

```js
const newTranslation = await Translation.create({
    user: userId,// From the token
    note: noteId,// Verified note ID or null
    sourceText, translatedText, sourceLanguage, targetLanguage
});
```

`characterCount` **isn't** sent by the client. A schema hook works it out from `sourceText`, so the client can't fake usage numbers. Building the document from **named fields** means the client can't set `user`, `characterCount` or anything else.

### Response (201)

```json
{
  "message": "Translation saved successfully",
  "created": true,
  "translation": { "_id": "6736...", "note": "6732...", "sourceText": "Goeie môre", "characterCount": 10, "...": "..." }
}
```

`translation.note` here is an **ID**, not `{ _id, title }`, because `create()` doesn't populate (see [Gap 4](#gap-4-save-returns-the-note-as-an-id)).

### Errors

| Error | Status |
|---|---|
| A missing or blank field | `400` "Translate some text before saving" |
| An invalid note ID | `400` "Invalid note id" |
| The note isn't available | `400` "That note cannot be translated" |
| `ValidationError` (bad language code, text too long, etc.) | `400` + the first schema message |
| Anything else | `500` |

---

## 6. DELETE `/translation/delete/:id`

**Purpose:** Permanently delete one saved translation. Translations have **no trash**: deleting is final.

```js
const translation = await Translation.findOneAndDelete({ _id: id, user: userId }).select('_id');
```

| Part | Why |
|---|---|
| `isValid(id)` check first | Turns a `CastError` (500) into a clean 400 |
| `user: userId` | Another user's translation returns **404**, not 403, so IDs can't be probed |
| `.select('_id')` | Only the existence check is needed, so the deleted text isn't loaded |

**Response (200):**

```json
{ "message": "Translation deleted", "id": "6736a1f0c2b3d4e5f6071830" }
```

The frontend can use `id` to remove the row from its list without fetching it again.

---

## 7. How Translations Relate to Notes

A translation can **optionally** point to the note its text came from.

| Note Event | What Happens to Its Translations |
|---|---|
| Note edited | Nothing. They're a snapshot of the text at the time. |
| Note archived | Kept and still listed. New translations **can't** be linked to it. |
| Note moved to the trash | Kept and still listed. New translations **can't** be linked to it. |
| Note restored | Linking is allowed again |
| `DELETE /notes/:id/permanent` | **Deleted along with the note** (`Translation.deleteMany` in `noteRoutes.js`) |
| 30-day TTL purge of a trashed note | **Not deleted.** `note` now points to nothing, so `populate` gives `null`. |

So the frontend should always handle a missing note:

```jsx
<td>{t.note?.title || '—'}</td>// No note, or the note was purged
```

---

## 8. Status Code Reference

| Code | Route(s) | When |
|---|---|---|
| `200` | fetch, delete | Success (including an empty list) |
| `201` | save | Translation saved |
| `400` | fetch | Invalid note ID or language code filter |
| `400` | save | A missing or blank field, an invalid note ID, the note isn't available, schema validation |
| `400` | delete | `:id` isn't a valid ObjectId |
| `401` | all | (From `checkJwtToken`) No token, or an invalid or expired one |
| `404` | delete | Translation not found, or not the user's |
| `500` | all | Unexpected error |

---

## 9. Known Gaps & Housekeeping

### Gap 1: An empty `note` string is rejected by save, but accepted by fetch

| Value | `GET /fetch?note=` | `POST /save { note: "" }` |
|---|---|---|
| `''` | ✅ No filter | ❌ **400 "Invalid note id"** |
| `null` | — | ✅ Not linked |

If the TranslateForm's note dropdown uses `''` for "No note" (a common default for a `<select>`), **every save without a note fails**. Treat `''` the same as `null`:

```js
if (note !== undefined && note !== null && note !== '') {// '' = "No note", same as the fetch filter
```

### Gap 2: An auto-detected source language can be `null`

`POST /api/language/translate/v2` returns `sourceLanguage: null` when the user picks "auto" and Langbly doesn't report a detected language. If the frontend sends that straight to `/save`, it fails the required-strings check with **"Translate some text before saving"**, which is misleading because the user *did* translate.

Options:
- Disable the Save button when `sourceLanguage` is missing, and ask the user to pick the source language.
- Or give the missing language its own message in `/save`:

```js
if (typeof sourceLanguage !== 'string' || !sourceLanguage.trim()) {
    return res.status(400).json({ message: 'Choose the source language before saving' });// Detection didn't return one
}
```

### Gap 3: Languages and text length are only checked by the schema

`/save` checks that the four fields are non-empty strings, but leaves to the schema:
- the **language code format** (`languageCodeRegex`),
- **source ≠ target**,
- the **text length** (`MAX_TRANSLATION_CHARS` is enforced in `apiRoutes.js` for translating, but the client could send longer text straight to `/save`).

If the schema already covers all three, this is fine. Check that `translationSchema` has a `maxlength` on `sourceText` **and** `translatedText`, otherwise very large documents can be saved by calling the API directly.

### Gap 4: Save returns the note as an ID

`POST /save` returns `translation.note` as an **ID**, while `GET /fetch` returns `{ _id, title }`. If the frontend adds the new translation to the list straight away, the Note column shows an ID or a blank until the page refreshes. **Fix:**

```js
await newTranslation.populate('note', 'title');// Same shape as GET /fetch
```

### Gap 5: Saving the same translation twice creates duplicates

Clicking Save twice (or double-clicking) stores **two identical** translations. The `created: true` field in the response suggests a "find existing, else create" check may have been planned. Options:

- **Frontend:** disable the Save button after a successful save, until the text or languages change.
- **Backend:** look for an identical recent translation first, and return it with `created: false` and a **200** instead of a 201:

```js
const existing = await Translation.findOne({ user: userId, note: noteId, sourceText, translatedText, sourceLanguage, targetLanguage }).lean();
if (existing) return res.status(200).json({ message: 'Already saved', created: false, translation: existing });// No duplicate
```

If you don't need either, remove `created: true`, because a 201 already means "created".

### Gap 6: Pagination limits are defined in two places

This file imports `DEFAULT_LIMIT` and `MAX_LIMIT` from `apiUtil`, but `noteRoutes.js` defines **its own** local `DEFAULT_LIMIT = 10` and `MAX_LIMIT = 50`. If you change one, the lists will page differently. Import from `apiUtil` in `noteRoutes.js` too.

### Gap 7: Translations of purged notes keep a dead reference

As described in [section 7](#7-how-translations-relate-to-notes), the 30-day TTL purge removes notes directly in MongoDB, so their translations keep a `note` ID that points nowhere. The list handles this (`populate` → `null`), but `GET /fetch?note=<purgedId>` still returns them. That's harmless, but the fix (a scheduled cleanup job) is covered in `NOTE_ROUTES.md` Gap 4.

### Housekeeping

| Line(s) | Issue | Suggestion |
|---|---|---|
| 7 | `require('dotenv').config()` isn't used in this file | Load it once in `app.js` |
| 13 | Comment says "Used to validate the **targetLanguage** filter" | It validates **both** language filters |
| 14 | The `apiUtil` import has no comment and no semicolon | `const { DEFAULT_LIMIT, MAX_LIMIT } = require('../util/apiUtil');// Shared pagination limits` |
| 16–18 | Extra blank lines | Remove two |
| 104, 109 | These `return res.status(400)` lines have no end-of-line comment, unlike the rest of the file | Add the usual `// Return a 400 (Bad Request) status code with a message` |
| 146 | `DELETE /delete/:id` puts the verb in the URL | The REST convention is `DELETE /:id`. The same note applies to `noteRoutes.js`. Update the frontend calls if you change it. |
| 32, 41, 93, 99, 151, 160 | "Conditional rendering" | That's a React UI term. These are **guard clauses** / validation checks. |
| 167 | "Send a 200 (OK) status code with a message", but the response also includes `id` | "...with a message and the deleted id" |
