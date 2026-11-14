# NOTE ROUTES - [`noteRoutes.js`](../server/routes/noteRoutes.js) BREAKDOWN

[`noteRoutes.js`](../server/routes/noteRoutes.js) is the Express router for **notes**: listing, reading, creating, editing, moving to the trash, restoring and permanently deleting. It's the largest router in the app, and it works alongside two others:

| Router | Handles |
|---|---|
| [`noteRoutes.js`](../server/routes/noteRoutes.js) | Active notes, the trash, and permanent deletion |
| [`archiveRoutes.js`](../server/routes/archiveRoutes.js) | Archiving and unarchiving (see [ARCHIVE_ROUTES.md](ARCHIVE_ROUTES.md)) |
| [`exportRoutes.js`](../server/routes/exportRoutes.js) | Downloading notes as CSV / XLSX (see [EXPORT_ROUTES.md](EXPORT_ROUTES.md)) |

---

## TABLE OF CONTENTS
1. [ROUTE SUMMARY](#1-route-summary)
     - [1.1. GET `/fetchNotes`](#11-get-fetchnotes)
     - [1.2. GET `/trash`](#12-get-trash)
     - [1.3. GET `/:id`](#13-get-id)
     - [1.4. POST `/addNote`](#14-post-addnote)
     - [1.5. PATCH `/:id`](#15-patch-id)
     - [1.6. PATCH `/:id/restore`](#16-patch-idrestore)
     - [1.7. DELETE `/:id`](#17-delete-id)
     - [1.8. DELETE `/:id/permanent`](#18-delete-idpermanent)
2. [IMPORTS](#2-imports)
3. [ROUTE ORDER AND PATTERNS](#3-route-order-and-patterns)
     - [3.1. ROUTE ORDER](#31-route-order)
     - [3.2. ROUTE PATTERNS](#32-route-patterns)
4. [NOTE STATES](#4-note-states)
5. [SCHEMAS AND UTILITY FUNCTIONS](#5-schemas-and-utility-functions)
     - [5.1. SCHEMAS](#51-schemas)
          - [5.1.1. NOTE SCHEMA](#511-note-schema-noteschemajs)
          - [5.1.2. TAG SCHEMA](#512-tag-schema-tagschemajs)
          - [5.1.3. NOTEBOOK SCHEMA](#513-notebook-schema-notebookschemajs)
     - [5.2. UTILITY FUNCTIONS](#52-utility-functions)
6. [SECURITY](#6-security)
7. [STATUS CODE REFERENCES](#7-status-code-references)
8. [KNOWN GAPS AND HOUSE KEEPING](#8-known-gaps-and-house-keeping)
     - [8.1. GAPS](#81-gaps)
     - [8.2. HOUSE KEEPING](#82-house-keeping)
9. [REFERENCES](#9-references)

- *View [GLOSSARY.md](../GLOSSARY.md) for terminology*

---

<!-- SECTION 1 -->
## 1. ROUTE SUMMARY

The router is mounted at **`/notes`** by [`app.js`](../server/app.js) (e.g. `GET /notes/fetchNotes`). The paths below are relative to that mount point. Every route requires a valid JWT (`checkJwtToken`).

| Method | Path | Middleware | Purpose | Note Must Be |
|---|---|---|---|---|
| `GET` | `/fetchNotes` | `checkJwtToken` | Paginated, filterable list of active notes | active |
| `GET` | `/trash` | `checkJwtToken` | Paginated list of trashed notes | trashed |
| `GET` | `/:id` | `checkJwtToken` | One note (for a details view) | **any** state |
| `POST` | `/addNote` | `checkJwtToken` | Create a note | n/a |
| `PATCH` | `/:id` | `checkJwtToken` | Edit title, content, language, notebook, tags or pin | active |
| `PATCH` | `/:id/restore` | `checkJwtToken` | Restore from the trash | trashed |
| `DELETE` | `/:id` | `checkJwtToken` | Move to the trash (soft delete) | not trashed |
| `DELETE` | `/:id/permanent` | `checkJwtToken` | Delete for good, along with its translations | trashed |

**Client side usage:**

| Method | Full Path | Frontend/Client side files |
|---|---|---|
| `GET` | `/notes/fetchNotes` | [Notes.js](../client/src/pages/Notes.js) |
| `GET` | `/notes/trash` | [Trash.js](../client/src/components/Trash.js) |
| `GET` | `/notes/:id` | Not called by the client yet (see [8.2](#82-house-keeping)) |
| `POST` | `/notes/addNote` | [NotePad.js](../client/src/pages/NotePad.js) (NotePadForm) |
| `PATCH` | `/notes/:id` | [Notes.js](../client/src/pages/Notes.js) (EditNoteForm) |
| `PATCH` | `/notes/:id/restore` | [Trash.js](../client/src/components/Trash.js) |
| `DELETE` | `/notes/:id` | [NotePanal.js](../client/src/components/NotePanal.js) |
| `DELETE` | `/notes/:id/permanent` | [Trash.js](../client/src/components/Trash.js) |

---

### 1.1. GET `/fetchNotes`

**Purpose:** The main Notes list (NotesList table): paginated, filterable, pinned notes first.

#### QUERY PARAMETERS (ALL OPTIONAL)

| Param | Validation | Becomes |
|---|---|---|
| `language` | String + `languageCodeRegex` | `filter.language` |
| `notebook` | String + valid ObjectId | `filter.notebook` |
| `tag` | String + valid ObjectId | `filter.tags` (array **contains** the ID) |
| `page` | Whole number ≥ 1, default `1` | `skip` |
| `limit` | 1–50, default `10` | `limit` |

```
GET /notes/fetchNotes?notebook=6732...&tag=6733...&page=2&limit=20
```

An empty value (`?language=`) means "no filter", the same as leaving it out.

#### BUILDING THE FILTER

```js
const filter = { user: userId, isArchived: false, deletedAt: null };// Only the user's own active notes
```

The language filter is checked on its own (`typeof language === 'string'` + `languageCodeRegex`, otherwise **400 "Invalid language code"**). The two ID filters share one loop:

```js
for (const [field, value, label] of [['notebook', notebook, 'notebook'], ['tags', tag, 'tag']]) {
    if (value === undefined || value === '') continue;// Not sent, so skip
    if (typeof value !== 'string' || !mongoose.Types.ObjectId.isValid(value)) → 400 `Invalid ${label} id`
    filter[field] = value;
}
```

Each entry is `[Mongo field, query value, label for the error message]`. The query param is called `tag`, but the schema field is `tags`, which is why the field and label differ.

The `typeof value !== 'string'` check matters because `?tag[$ne]=x` is parsed into `{ $ne: 'x' }`.

#### QUERY AND COUNT IN PARALLEL

```js
const { pageNumber, pageSize, skip } = parsePagination(page, limit);

const [notes, total] = await Promise.all([
    populateNote(Note.find(filter))
        .sort({ isPinned: -1, updatedAt: -1 })// Pinned first, then newest; matches the { user, isPinned, updatedAt } index
        .skip(skip)// Page 3 with 10 per page skips 20
        .limit(pageSize)
        .lean(),
    Note.countDocuments(filter)// Total for the pagination controls
]);
```

The page of notes and the total count are **independent queries**, so `Promise.all` runs them at the same time instead of one after the other.

#### RESPONSE (200)

```json
{
  "notes": [ { "_id": "...", "title": "Shopping list", "isPinned": true, "notebook": {...}, "tags": [...] } ],
  "pagination": { "page": 2, "limit": 20, "total": 47, "totalPages": 3 }
}
```

A page **beyond** `totalPages` returns `notes: []` with a 200. `Notes.js` steps back to the last page when that happens (e.g. after deleting the last note on a page).

---

### 1.2. GET `/trash`

**Purpose:** The Trash page (`Trash.js`), paginated the same way as `/fetchNotes`.

**Query (optional):** `page`, `limit` (see [5.2](#52-utility-functions)).

```js
await trashExpiredArchivedNotes(userId);// 60-day archive rule first, so expired archived notes show straight away

const filter = { user: userId, deletedAt: { $ne: null } };// Anything with a deletion date
const [notes, total] = await Promise.all([
    populateNote(Note.find(filter)).sort({ deletedAt: -1 }).skip(skip).limit(pageSize).lean(),// Most recently deleted first
    Note.countDocuments(filter)
]);
```

`$ne: null` means "**not** null", i.e. the note is in the trash. It also leaves out documents with **no** `deletedAt` field, because `null` matches missing fields in MongoDB.

**Response (200):** `{ "notes": [...], "pagination": { "page", "limit", "total", "totalPages" } }`

`Trash.js` shows the shared `Pagination` controls, re-fetches after each restore or delete so the page refills from the next one, and steps back a page if the last page empties.

---

### 1.3. GET `/:id`

**Purpose:** Fetch one note for a details panel. It works for **active, archived and trashed** notes, so any list can open a note's details.

```js
const note = await populateNote(Note.findOne({ _id: id, user: userId })).lean();
```

The filter has no state conditions on purpose: only **ownership** is checked.

**Response (200):** `{ "note": { ...populated note } }`

**400** "Invalid note id" if `:id` isn't a valid ObjectId. **404** "Note not found" for a note that doesn't exist or isn't the user's.

---

### 1.4. POST `/addNote`

**Purpose:** Create a note from the NotePadForm on the NotePad page.

#### REQUEST BODY

```json
{
  "title": "Vergadering",
  "content": "<p>Notas van die <strong>vergadering</strong></p>",
  "language": "af",
  "notebook": "6732a1f0c2b3d4e5f6071829",
  "tags": ["Work", "meetings"],
  "isPinned": false
}
```

| Field | Required | Rules |
|---|---|---|
| `content` | ✅ | A non-empty string (the editor's HTML) |
| `title` | ❌ | A string. Blank → schema default `"Untitled"`. |
| `language` | ❌ | A string. Blank → the user's default note language, then `'en'`. |
| `notebook` | ❌ | A string ID, `null` or missing. It must be the user's own notebook. |
| `tags` | ❌ | An array of strings (**names**, not IDs). Missing tags are created. Max `MAX_TAG_LENGTH` (30) characters each. |
| `isPinned` | ❌ | A boolean |

#### STEP 1: CONTENT CHECK

```js
if (typeof content !== 'string' || !content.trim()) → 400 "Note text is required"
```

This also blocks operator injection.

#### STEP 2: TYPE CHECKS

One combined condition covers every optional field:

```js
(title !== undefined && typeof title !== 'string') ||
(language !== undefined && typeof language !== 'string') ||
(notebook !== undefined && notebook !== null && typeof notebook !== 'string') ||// null is allowed = "No notebook"
(isPinned !== undefined && typeof isPinned !== 'boolean') ||// "true" (string) is rejected
!Array.isArray(tags) || tags.some((tag) => typeof tag !== 'string')
// → 400 "Invalid note details"
```

The pattern is "**if it was sent, it must be the right type**". `tags` defaults to `[]` when it's left out.

#### STEP 3: LANGUAGE FALLBACK

```js
let noteLanguage = language?.trim();
if (!noteLanguage) {
    const user = await User.findById(userId).select('defaultLanguages').exec();
    noteLanguage = user?.defaultLanguages?.defaultNoteLanguage || 'en';
}
```

The fallback order is **form → user's profile default → `'en'`**. The extra database call only happens when no language was sent.

#### STEP 4: NOTEBOOK OWNERSHIP

`checkNotebook()` (see [5.2](#checknotebookuserid-notebook)). It returns **400** for an invalid ID and **404** "That notebook no longer exists" for a notebook that doesn't exist or isn't the user's.

#### STEP 5: TAG NAMES

`normaliseTagNames()`, then a length check: any name over `MAX_TAG_LENGTH` → **400** "Tag names cannot exceed 30 characters".

#### STEP 6: BUILD AND VALIDATE THE NOTE, THEN CREATE THE TAGS, THEN SAVE

```js
const newNote = new Note({
    user: userId,
    notebook: notebookId,// null = no notebook
    title: title?.trim() || undefined,// undefined lets the schema default ("Untitled") apply
    content,// Sanitised (XSS) and copied to plainText by a noteSchema hook
    language: noteLanguage,
    isPinned: isPinned === true
});
await newNote.validate();// Fails BEFORE any tags are created

newNote.tags = await findOrCreateTagIds(userId, tagNames);
await newNote.save();
await newNote.populate([{ path: 'notebook', select: 'name colour' }, { path: 'tags', select: 'name' }]);
```

| Detail | Why |
|---|---|
| `validate()` before `findOrCreateTagIds()` | A note that fails validation (e.g. a title over 200 characters) can't leave newly created, unused tags behind |
| `title: ... \|\| undefined` | Mongoose defaults only apply to `undefined`. `''` would save an empty title. |
| Named fields only | Protects against **mass assignment**: `user`, `deletedAt` and `isArchived` can't be set from the body |
| `content` sanitising | A schema hook strips dangerous HTML (e.g. `<script>`) **before** saving, so it can't run when displayed |
| `populate(...)` | Same shape as `populateNote`, so the response has notebook and tag **names**, like `PATCH` |

#### RESPONSE (201)

```json
{
  "message": "Note saved successfully",
  "note": { "_id": "...", "notebook": { "_id": "...", "name": "Work", "colour": "#4F46E5" }, "tags": [{ "_id": "...", "name": "meetings" }] }
}
```

#### ERRORS

| Error | Status |
|---|---|
| Missing or blank content | `400` "Note text is required" |
| A field has the wrong type | `400` "Invalid note details" |
| Invalid notebook ID | `400` "Invalid notebook id" |
| Notebook doesn't exist or isn't the user's | `404` "That notebook no longer exists" |
| A tag name is too long | `400` "Tag names cannot exceed 30 characters" |
| `ValidationError` | `400` + the first schema message |
| Anything else | `500` |

---

### 1.5. PATCH `/:id`

**Purpose:** Edit a note from the EditNoteForm on the Notes page. **Only the fields that are sent are changed.** Archiving has its own route (`PATCH /archive/:id`).

#### REQUEST BODY (ANY COMBINATION)

```json
{ "title": "New title", "tags": ["work"], "isPinned": true }
```

The same "if it was sent, it must be the right type" check as `POST` runs first (→ **400** "Invalid note details"), with `content` and `tags` optional too.

#### BUILDING THE UPDATE

Each field is handled only if it was sent (`!== undefined`):

| Field | Rule | Update |
|---|---|---|
| `title` | Blank → `"Untitled"` | `updates.title` |
| `content` | Can't be emptied → 400 "Note text is required" | `updates.content` |
| `language` | Can't be emptied → 400 "Note language is required" | `updates.language` (format checked by the schema) |
| `notebook` | `''` / `null` → no notebook, otherwise `checkNotebook()` | `updates.notebook` |
| `isPinned` | Boolean | `updates.isPinned` |
| `tags` | Normalise → length check → (note check) → find or create | `updates.tags` (replaces the whole array) |

```js
if (Object.keys(updates).length === 0 && tagNames === undefined) → 400 "No changes were sent"
```

This stops an empty `{}` body from making a pointless database call.

**Why the title is set to `'Untitled'` here, when POST uses `undefined`:** with `$set`, an `undefined` value is simply skipped, so the old title would stay. Writing `'Untitled'` makes "clear the title" actually work.

#### CHECKING THE NOTE BEFORE CREATING TAGS

When `tags` are sent, the route loads the note and validates the other changes **before** calling `findOrCreateTagIds()`:

```js
const current = await Note.findOne(editableFilter);
if (!current) → 404 "Note not found"
current.set(updates);
await current.validate(Object.keys(updates));// Only the sent fields, so old data in other fields can't block an edit
updates.tags = await findOrCreateTagIds(userId, tagNames);
```

So a missing, archived or trashed note, or an invalid title or language, can't leave new, unused tags behind. When no tags are sent, this extra query is skipped.

#### THE UPDATE

```js
const editableFilter = { _id: id, user: userId, isArchived: false, deletedAt: null };// Only ACTIVE notes are editable
const note = await populateNote(Note.findOneAndUpdate(editableFilter, { $set: updates }));
```

| Detail | Meaning |
|---|---|
| `isArchived: false, deletedAt: null` | Archived and trashed notes can't be edited. Restore them first. |
| `$set` | Changes only these fields. The rest of the note stays as it is. |
| Schema hook | Sanitises `content`, updates `plainText`, runs validators and returns the **updated** note (see [3.2](#the-findoneandupdate-hook)) |
| `populateNote(...)` | The response includes notebook and tag **names** |

**Response (200):** `{ "message": "Note updated successfully", "note": { ...populated } }`

**404** "Note not found" if the note doesn't exist, isn't the user's, or isn't active.

---

### 1.6. PATCH `/:id/restore`

**Purpose:** Take a note out of the trash.

```js
Note.findOneAndUpdate(
    { _id: id, user: userId, deletedAt: { $ne: null } },// Must be in the trash
    { $set: { deletedAt: null } }// Out of the trash and out of the TTL purge
).select('_id title isArchived');
```

Only `deletedAt` is cleared. Every way into the trash clears `isArchived`, so a restored note goes back to the **Notes list**:

| Trashed From | `isArchived` After | Restored To |
|---|---|---|
| Notes list (`DELETE /notes/:id`) | `false` | Notes list |
| Archive (`DELETE /archive/:id`) | `false` | Notes list |
| Archive, but via `DELETE /notes/:id` | `false` | Notes list |
| Archive, 60-day rule (`archiveUtil.js`) | `false` | Notes list |

`isArchived` is still included in the response, so `Trash.js` can say "Restored to the archive" for notes that were trashed while archived **before** this rule was added.

**Response (200):** `{ "message": "Note restored", "note": { "_id", "title", "isArchived" } }`

**404** "Note not found in trash" if it doesn't exist, isn't the user's, or isn't in the trash.

---

### 1.7. DELETE `/:id`

**Purpose:** Move a note to the trash (a **soft delete**). It can be undone for 30 days.

```js
Note.findOneAndUpdate(
    { _id: id, user: userId, deletedAt: null },// Not already in the trash
    { $set: { deletedAt: new Date(), isPinned: false, isArchived: false, archivedAt: null } }
).select('_id title');
```

| Update | Why |
|---|---|
| `deletedAt: new Date()` | Moves it to the trash, records **when**, and starts the TTL countdown |
| `isPinned: false` | A restored note shouldn't jump to the top of the list |
| `isArchived: false`, `archivedAt: null` | The same end state as `DELETE /archive/:id` and the 60-day sweep, so a restored note always goes back to the Notes list |

**Response (200):** `{ "message": "Note moved to trash", "note": { "_id", "title" } }`

**404** "Note not found" if it doesn't exist, isn't the user's, or is already in the trash.

---

### 1.8. DELETE `/:id/permanent`

**Purpose:** Delete a note **for good**, along with every translation made from it.

```js
const trashedFilter = { _id: id, user: userId, deletedAt: { $ne: null } };
if (!(await Note.exists(trashedFilter))) → 404 "Note not found in trash"

const { deletedCount } = await Translation.deleteMany({ note: id, user: userId });// Translations FIRST
const note = await Note.findOneAndDelete(trashedFilter).select('_id title');
if (!note) → 404 "Note not found in trash"// Restored or deleted in another tab in the meantime
```

| Safeguard | How |
|---|---|
| **Two-step delete** | `deletedAt: { $ne: null }`: only notes **already in the trash** can be deleted permanently, so an active note can't be wiped by one mistaken click |
| Ownership | `user: userId` on **both** the note and the translations |
| Check first | `Note.exists()` makes sure nothing is deleted for a note that isn't in the user's trash |
| Translations before the note | If the note delete fails, the note is still in the trash and the delete can be retried. Deleting the note first could leave orphaned translations behind. |

`findOneAndDelete` returns the deleted document, so its title can go back to the client (e.g. "'Shopping list' deleted forever").

`noteSchema` also has a `post('findOneAndDelete')` hook that deletes the note's translations. It's a safety net: because the route removes them first, the hook normally finds none.

Notes purged by the **30-day TTL index** skip this route and every Mongoose hook. The hourly sweep's `removeOrphanedTranslations()` (`util/archiveUtil.js`) deletes their translations instead, so for up to an hour a translation can point at a note that no longer exists. The UI should keep handling a missing note (`t.note?.title || ''`).

**Response (200):**

```json
{ "message": "Note permanently deleted", "note": { "_id": "...", "title": "..." }, "deletedTranslations": 3 }
```

---

<!-- SECTION 2: IMPORTS -->
## 2. IMPORTS

```js
const express = require('express');
const mongoose = require('mongoose');
const Note = require('../models/noteSchema');
const Notebook = require('../models/notebookSchema');
const Tag = require('../models/tagSchema');
const User = require('../models/userSchema');
const Translation = require('../models/translationSchema');
const { checkJwtToken } = require('../middleware/securityMiddleware');
const { languageCodeRegex, MAX_TAG_LENGTH } = require('../util/schemaUtil');
const { trashExpiredArchivedNotes } = require('../util/archiveUtil');
const { parsePagination, paginationInfo } = require('../util/apiUtil');
const router = express.Router()
```

| Import | Used For |
|---|---|
| `express` | Creates the `router` |
| `mongoose` | `ObjectId.isValid()` for IDs in the URL, the query string and the body |
| `Note` | The main model |
| `Notebook` | `checkNotebook()`: does the notebook exist, and does it belong to the user? |
| `Tag` | `findOrCreateTagIds()`: look up or create tags by name |
| `User` | `POST /addNote`: the user's default note language |
| `Translation` | `DELETE /:id/permanent`: delete a note's translations along with it |
| `checkJwtToken` | Auth on every route; sets `req.user.id` |
| `languageCodeRegex` | Validates the `language` filter in `/fetchNotes` |
| `MAX_TAG_LENGTH` | The longest tag name (`30`), **shared** with `tagSchema` |
| `trashExpiredArchivedNotes` | Applies the 60-day archive rule before `GET /trash` |
| `parsePagination`, `paginationInfo` | Page/limit parsing and the `pagination` response object (defaults `10` per page, max `50`), **shared** with `translationRoutes.js` |

`dotenv` isn't loaded here: `app.js` loads it once before any router is required.

---

<!-- SECTION 3: ROUTE ORDER AND PATTERNS -->
## 3. ROUTE ORDER AND PATTERNS

### 3.1. ROUTE ORDER

Express checks routes **in the order they're declared**, and `/:id` matches **any single segment**.

```js
router.get('/fetchNotes', ...)// 1. specific path
router.get('/trash', ...)// 2. specific path
router.get('/:id', ...)// 3. catch-all — MUST come last
```

If `/:id` came first, `GET /notes/trash` would match it with `id = 'trash'`, fail the ObjectId check, and return **400 "Invalid note id"**.

The other routes can't clash, because they have different methods or different numbers of segments:

| Route | Segments |
|---|---|
| `PATCH /:id` | 1 |
| `PATCH /:id/restore` | 2 |
| `DELETE /:id` | 1 |
| `DELETE /:id/permanent` | 2 (the second segment is the literal `permanent`) |

### 3.2. ROUTE PATTERNS

| Pattern | Code | Why |
|---|---|---|
| User ID from the token | `const userId = req.user.id;` | Users can only reach their own notes |
| ObjectId check | `if (!mongoose.Types.ObjectId.isValid(id)) → 400` | Turns a `CastError` (500) into a clean 400 |
| Ownership in the filter | `{ _id: id, user: userId, ... }` | Another user's note gives **404, not 403**, so IDs can't be probed |
| State in the filter | `deletedAt: null`, `isArchived: false`, etc. | Each action only works from the right state |
| Atomic update | `findOneAndUpdate(filter, { $set })` | Check and change in one database operation, with no race between two tabs |
| Type checks on the body | `typeof x !== 'string'` | Blocks `{ "$gt": "" }`-style **NoSQL injection** |
| Guard clauses | `if (...) return res.status(4xx)...` | Each check returns early, so the happy path reads top to bottom |
| `ValidationError` → 400 | `Object.values(error.errors)[0]?.message` | The user sees the first schema message, not a 500 |
| Logging | `[SUCCESS/ERROR: noteRoutes.js, <METHOD> <path>]` | Easy to grep |

#### THE `findOneAndUpdate` HOOK

`noteSchema` has a `pre('findOneAndUpdate')` hook that runs for **every** `Note.findOneAndUpdate` call (these routes and `archiveRoutes.js`):

```js
this.setOptions({ runValidators: true, returnDocument: 'after' });// Validate updates and return the updated note
```

| Effect | Why |
|---|---|
| Sanitises `content` and updates `plainText` | Same XSS protection as creating a note |
| `runValidators: true` | Update queries skip schema validation by default |
| `returnDocument: 'after'` | Every `findOneAndUpdate` on notes returns the note **after** the change (by default Mongoose returns it as it was before) |

---

<!-- SECTION 4: NOTE STATES -->
## 4. NOTE STATES

A note's state comes from two fields: `isArchived` and `deletedAt`. A third field, `archivedAt`, records **when** a note was archived.

| State | `isArchived` | `deletedAt` | Shown In |
|---|---|---|---|
| Active | `false` | `null` | Notes list (`GET /notes/fetchNotes`) |
| Archived | `true` | `null` | Archive page (`GET /archive/fetchNotes`) |
| Trashed | `false` | a `Date` | Trash page (`GET /notes/trash`) |

Every way into the trash clears `isArchived`, so a trashed note is never also archived (notes trashed before this rule existed may still have `isArchived: true`).

```
                DELETE /notes/:id
   ┌──────────┐ ─────────────────────► ┌──────────┐  30 days (TTL)   ┌─────────┐
   │  ACTIVE  │                        │  TRASH   │ ───────────────► │  GONE   │
   │          │ ◄───────────────────── │ deletedAt│                  │         │
   └──────────┘ PATCH /:id/restore     └──────────┘ ───────────────► └─────────┘
      ▲    │                                ▲      DELETE /:id/permanent
      │    │ /archive routes                │      (+ its translations)
      │    ▼                                │
   ┌──────────┐  DELETE /archive/:id ───────┤
   │ ARCHIVED │  or 60 days after archiving ┘
   └──────────┘
```

#### THE 30-DAY TTL PURGE

`noteSchema` has a **TTL (time-to-live) index** on `deletedAt`:

```js
noteSchema.index({ deletedAt: 1 }, { expireAfterSeconds: THIRTY_DAYS_IN_SECONDS });// MongoDB deletes the note 30 days after deletedAt
```

| `deletedAt` | TTL Behaviour |
|---|---|
| A `Date` | MongoDB's background job deletes the document once that date is **30 days** old |
| `null` | Ignored. TTL only acts on date values, so active notes are never purged. |

That's why **restoring** a note (`deletedAt: null`) also **stops the countdown**. MongoDB's TTL job runs about every 60 seconds, so the deletion isn't exact to the second.

#### THE 60-DAY ARCHIVE RULE

A TTL index can only delete documents, not change them, so archived notes are moved to the trash by a sweep in `util/archiveUtil.js` instead. `trashExpiredArchivedNotes()` moves notes archived more than **60 days** ago to the trash (the same end state as `DELETE /archive/:id`). It runs for every user on server start and every hour, and for the current user before `GET /notes/trash`, so the trash list is always accurate.

---

<!-- SECTION 5: SCHEMAS AND UTILITY FUNCTIONS -->
## 5. SCHEMAS AND UTILITY FUNCTIONS

### 5.1. SCHEMAS

`User` is only read for `defaultLanguages.defaultNoteLanguage` (see [USER_ROUTES.md](USER_ROUTES.md#311-user-schema-userschemajs)), and `Translation` is only used by `deleteMany({ note, user })` (see [TRANSLATION_ROUTES.md](TRANSLATION_ROUTES.md#311-translation-schema)).

#### 5.1.1. NOTE SCHEMA ([noteSchema.js](../server/models/noteSchema.js))

| Field | Type | Rules | Set By |
|---|---|---|---|
| `user` | ObjectId → User | Required, indexed | The route (from the token) |
| `notebook` | ObjectId → Notebook, or `null` | Default `null` ("No notebook") | `POST`, `PATCH` (checked by `checkNotebook()`) |
| `title` | String | Trimmed, max 200, default `'Untitled'` | `POST`, `PATCH` |
| `content` | String | The note's HTML, **sanitised** by the schema hooks | `POST`, `PATCH` |
| `plainText` | String | **Generated** from `content`; used for search, translation and export | Schema hooks |
| `language` | String | Required, `languageCodeRegex` | `POST` (with fallback), `PATCH` |
| `tags` | [ObjectId → Tag] | Many-to-many by reference | `POST`, `PATCH` (via `findOrCreateTagIds()`) |
| `isPinned` | Boolean | Default `false` | `POST`, `PATCH`; cleared by `DELETE /:id` |
| `isArchived` | Boolean | Default `false` | `archiveRoutes.js`; cleared by `DELETE /:id` |
| `archivedAt` | Date or `null` | When the note was archived | `archiveRoutes.js`; cleared by `DELETE /:id` |
| `deletedAt` | Date or `null` | A date = in the trash | `DELETE /:id`, `PATCH /:id/restore` |
| `createdAt` / `updatedAt` | Date | `timestamps: true` | Mongoose |

**Indexes**

| Index | Used For |
|---|---|
| `{ user: 1 }` | Single-field owner lookups |
| `{ user: 1, isPinned: -1, updatedAt: -1 }` | `GET /fetchNotes`: pinned first, newest first |
| `{ title: 'text', plainText: 'text' }` (title weighted 3×) | Full-text search |
| `{ user: 1, isArchived: 1, deletedAt: 1, archivedAt: -1 }` | The archive list (`GET /archive/fetchNotes`) |
| `{ isArchived: 1, archivedAt: 1 }` | The 60-day archive sweep |
| `{ deletedAt: 1 }` with `expireAfterSeconds: THIRTY_DAYS_IN_SECONDS` | **TTL purge** 30 days after trashing |

**Hooks**

| Hook | Runs On | What it does |
|---|---|---|
| `pre('validate')` | `POST /addNote` (`validate()` and `save()`) | Sanitises `content` with `sanitize-html` (allow-listed tags, `http`/`https`/`mailto` links only) and regenerates `plainText` |
| `pre('findOneAndUpdate')` | `PATCH /:id`, restore, soft delete, `archiveRoutes.js` | The same sanitising for `content` in an update, plus `runValidators` and `returnDocument: 'after'` (see [3.2](#the-findoneandupdate-hook)) |
| `post('findOneAndDelete')` | `DELETE /:id/permanent` | Deletes the note's translations (a safety net; the route already did) |
| `toJSON` transform | `res.json()` with a document | Removes `__v` |

#### 5.1.2. TAG SCHEMA ([tagSchema.js](../server/models/tagSchema.js))

| Field / Feature | Used By | Effect |
|---|---|---|
| `name`: trimmed, **lowercased**, max `MAX_TAG_LENGTH` (30) | `findOrCreateTagIds()` | `Work` and `work` are the same tag |
| `{ user: 1, name: 1 }`, **unique** | `findOrCreateTagIds()` | The upsert finds the existing tag instead of creating a duplicate |
| `name` populated by `populateNote()` | Every response | Notes show tag **names**, not IDs |

Deleting a tag `$pull`s it from every note through the tag schema's hooks. See [TAG_ROUTES.md](TAG_ROUTES.md#311-tag-schema).

#### 5.1.3. NOTEBOOK SCHEMA ([notebookSchema.js](../server/models/notebookSchema.js))

| Field / Feature | Used By | Effect |
|---|---|---|
| `user` | `checkNotebook()` | A note can only go into the user's **own** notebook |
| `name`, `colour` | `populateNote()` | Notes show the notebook's name and colour |
| `post('findOneAndDelete')` hook | `DELETE /notebooks/:id` | Moves the notebook's notes to "No notebook" (`notebook: null`) with `{ timestamps: false }`, so their list order doesn't change |

See [NOTEBOOK_ROUTES.md](NOTEBOOK_ROUTES.md).

### 5.2. UTILITY FUNCTIONS

| Function | File | Used By |
|---|---|---|
| `checkNotebook(userId, notebook)` | `noteRoutes.js` | `POST /addNote`, `PATCH /:id` |
| `normaliseTagNames(tags)` | `noteRoutes.js` | `POST /addNote`, `PATCH /:id` |
| `findOrCreateTagIds(userId, tagNames)` | `noteRoutes.js` | `POST /addNote`, `PATCH /:id` |
| `populateNote(query)` | `noteRoutes.js` | `GET` routes, `PATCH /:id` |
| `parsePagination()`, `paginationInfo()` | [apiUtil.js](../server/util/apiUtil.js) | `GET /fetchNotes`, `GET /trash` |
| `trashExpiredArchivedNotes(userId)` | [archiveUtil.js](../server/util/archiveUtil.js) | `GET /trash` |

#### `checkNotebook(userId, notebook)`

```js
const checkNotebook = async (userId, notebook) => {
    if (!mongoose.Types.ObjectId.isValid(notebook)) return { status: 400, message: 'Invalid notebook id' };
    const ownNotebook = await Notebook.exists({ _id: notebook, user: userId });
    if (!ownNotebook) return { status: 404, message: 'That notebook no longer exists' };
    return null;
}
```

**Why it's needed:** without it, a user could put a note into **someone else's notebook** by sending that notebook's ID, and `populate` would then show the other user's notebook name.

| Returns | Meaning |
|---|---|
| `null` | Fine, carry on |
| `{ status: 400, ... }` | Not a valid ObjectId |
| `{ status: 404, ... }` | Doesn't exist, **or** isn't the user's (the same answer for both, so nothing about other users leaks) |

`Notebook.exists()` returns `{ _id }` or `null`. It's lighter than `findOne` because it doesn't load the document.

**Returning an error object instead of sending a response** keeps the helper reusable. The route decides what to send:

```js
const notebookError = await checkNotebook(userId, notebook);
if (notebookError) return res.status(notebookError.status).json({ message: notebookError.message });
```

#### `normaliseTagNames(tags)`

```js
const normaliseTagNames = (tags) => [...new Set(tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean))];
```

| Step | `[' Work', 'work', '', 'URGENT ']` |
|---|---|
| `.map(trim + lowercase)` | `['work', 'work', '', 'urgent']` |
| `.filter(Boolean)` | `['work', 'work', 'urgent']` (blanks removed) |
| `new Set(...)` | `{'work', 'urgent'}` (duplicates removed) |
| `[...set]` | `['work', 'urgent']` |

Tags are stored in lowercase (`tagSchema`), so `Work` and `work` are the **same tag**.

#### `findOrCreateTagIds(userId, tagNames)`

```js
const tagDocs = await Promise.all(tagNames.map((name) => Tag.findOneAndUpdate(
    { user: userId, name },// Look for this user's tag with this name
    { $setOnInsert: { user: userId, name } },// Only set fields when CREATING
    { upsert: true, returnDocument: 'after', runValidators: true }
).exec()));
return tagDocs.map((tag) => tag._id);
```

This is the **upsert** pattern: "find it, or create it if it's missing", in **one atomic operation per tag**.

| Option | Meaning |
|---|---|
| `upsert: true` | If nothing matches, **insert** a new document |
| `$setOnInsert` | These fields are written **only** when inserting. An existing tag is left untouched. |
| `returnDocument: 'after'` | Return the tag **after** the operation, so a newly created tag comes back with its `_id` (without this, an insert would return `null`) |
| `runValidators: true` | Apply `tagSchema` validation (e.g. max length) on inserts too. Update queries skip validators by default. |
| `Promise.all` | All tags are looked up **in parallel**, not one after another |

The result is an array of ObjectIds, ready to store in `note.tags`. Both routes that call it check the note first, so a failed save can't leave new, unused tags behind (see [1.4](#14-post-addnote) and [1.5](#15-patch-id)).

#### `populateNote(query)`

```js
const populateNote = (query) => query
    .select('-__v')
    .populate('notebook', 'name colour')
    .populate('tags', 'name');
```

This takes a Mongoose **query** (not a result) and adds the standard projection and populates, so every route returns notes in **the same shape**:

```json
{
  "notebook": { "_id": "...", "name": "Work", "colour": "#4F46E5" },
  "tags": [{ "_id": "...", "name": "meetings" }]
}
```

Because it returns the query, you can keep chaining: `populateNote(Note.find(filter)).sort(...).lean()`.

#### `parsePagination(page, limit)` AND `paginationInfo(...)`

```js
const parsePagination = (page, limit) => {
    const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(limit, 10) || DEFAULT_LIMIT, 1), MAX_LIMIT);
    return { pageNumber, pageSize, skip: (pageNumber - 1) * pageSize };
};
```

| Input | `pageNumber` | `pageSize` |
|---|---|---|
| missing | 1 | 10 |
| `page=3&limit=20` | 3 | 20 |
| `page=-5&limit=999` | 1 | 50 (capped) |
| `page=abc&limit=0` | 1 | 10 (`0` is falsy, so the default applies) |

`parseInt(x, 10)` always uses base 10, so `'08'` isn't read as octal. It's also lenient: `?page=2abc` is read as page 2, which is harmless.

`paginationInfo(pageNumber, pageSize, total)` builds `{ page, limit, total, totalPages }`. `totalPages` is **at least 1**, so the UI shows "Page 1 of 1" rather than "Page 1 of 0" when there are no notes.

Both helpers are shared by `/notes/fetchNotes`, `/notes/trash`, `/translation/fetch` and `/translation/trash`, so every paged list behaves the same.

#### `trashExpiredArchivedNotes(userId)`

Moves the user's notes that were archived more than 60 days ago to the trash (`deletedAt: new Date()`, `isArchived: false`, `archivedAt: null`, `isPinned: false`). See [4. NOTE STATES](#the-60-day-archive-rule).

---

<!-- SECTION 6: ROUTER SECURITY -->
## 6. SECURITY

### 6.1. PACKAGES

| Package | Where | Security role |
|---|---|---|
| `jsonwebtoken` | `securityMiddleware.js` | Verifies the session JWT in `checkJwtToken` |
| `cookie-parser` | `app.js` | Reads the HTTP-only `token` cookie into `req.cookies` |
| `sanitize-html` | `noteSchema.js` | Strips dangerous HTML from `content` before it's stored (stored XSS) |
| `helmet` | `app.js` | Sets secure HTTP response headers for every route |

### 6.2. MIDDLEWARE

| Middleware | File | Routes | What it does |
|---|---|---|---|
| `checkJwtToken` | [securityMiddleware.js](../server/middleware/securityMiddleware.js) | All | **401** if the cookie is missing, the token is invalid or expired, the user no longer exists, or the session was signed out (`tokenVersion` changed). **500** if the user lookup fails. Sets `req.user`. |

These routes have **no rate limiter**. They only touch the user's own documents in MongoDB.

### 6.3. SECURITY MEASURES IN THIS FILE

| Measure | Where | Protects Against |
|---|---|---|
| `userId` from the token, in every filter | All routes | Reading or changing another user's notes |
| 404 (not 403) for another user's note | All `:id` routes | Probing which note IDs exist |
| `typeof` checks on every body and query value | All routes | NoSQL operator injection (`{ "$gt": "" }`, `?tag[$ne]=x`) |
| `ObjectId.isValid()` before querying | All `:id` routes, ID filters | `CastError` 500s |
| Notes built from named fields | `POST /addNote` | Mass assignment (`user`, `deletedAt`, `isArchived`) |
| `checkNotebook()` | `POST`, `PATCH` | Filing a note in another user's notebook |
| Tags looked up by `{ user, name }` | `findOrCreateTagIds()` | Attaching another user's tags |
| HTML sanitising in the schema hooks | `POST`, `PATCH` | Stored XSS |
| Permanent delete only from the trash | `DELETE /:id/permanent` | Wiping an active note with one click |
| `try / catch` → `500 "Internal Server Error"` | All routes | Internal error details reaching the client |

---

<!-- SECTION 7 -->
## 7. STATUS CODE REFERENCES

| Code | Route(s) | When |
|---|---|---|
| `200` | all except addNote | Success |
| `201` | addNote | Note created |
| `400` | all with `:id` | Invalid ObjectId |
| `400` | fetchNotes | Invalid language, notebook or tag filter |
| `400` | addNote, PATCH | Missing content, wrong field types, tag > 30 characters, emptied language, invalid notebook ID, schema validation, no changes sent |
| `401` | all | (From `checkJwtToken`) Not logged in, or the token is invalid, expired or signed out |
| `404` | addNote, PATCH | The notebook doesn't exist or isn't the user's |
| `404` | GET /:id, PATCH, restore, delete, permanent | The note isn't found, isn't the user's, or is in the wrong state |
| `500` | all | Unexpected error, or a failed user lookup in `checkJwtToken` |

---

<!-- SECTION 8 -->
## 8. KNOWN GAPS AND HOUSE KEEPING

### 8.1. GAPS

These gaps were found in an earlier review and have now been fixed.

| Gap | Fix | Where |
|---|---|---|
| 1. `PATCH /:id` relied on the schema hook to return the updated note | Confirmed: the hook sets `runValidators` and returns the updated note. It now uses `returnDocument: 'after'` instead of `new: true`, which Mongoose 9 deprecates (it logged a warning on every note update). | `noteSchema.js` |
| 2. The two ways into the trash restored to different places | `DELETE /notes/:id` now clears `isArchived` and `archivedAt`, the same as `DELETE /archive/:id` and the 60-day sweep, so a restore always goes to the Notes list | `noteRoutes.js` DELETE `/:id` |
| 3. `addNote` returned IDs while `PATCH` returned names | The new note is populated with the same fields as `populateNote` | `noteRoutes.js` POST `/addNote` |
| 4a. Permanent delete removed the note before its translations | The route checks the note is in the trash, deletes the translations, **then** the note. This also fixes `deletedTranslations`, which was always `0`: the schema's `post('findOneAndDelete')` hook had already removed the translations before the route counted them. | `noteRoutes.js` DELETE `/:id/permanent` |
| 4b. The 30-day TTL purge skipped the translation cascade | The hourly sweep runs `removeOrphanedTranslations()` | `util/archiveUtil.js` |
| 5. Tags could be created even when the note failed | `POST` validates the note before creating tags. `PATCH` checks the note is editable and validates the sent fields first. | `noteRoutes.js` POST `/addNote`, PATCH `/:id` |
| 6. `GET /trash` wasn't paginated | Takes `page`/`limit` and returns `pagination`, like `/fetchNotes`. `Trash.js` shows the shared `Pagination` controls. | `noteRoutes.js` GET `/trash`, `Trash.js` |
| 7. The tag length limit was hardcoded | Uses `MAX_TAG_LENGTH` from `util/schemaUtil.js` | `noteRoutes.js` |
| 8. Lenient `page`/`limit` parsing | Harmless. The page/limit logic now lives in one place (`parsePagination` in `util/apiUtil.js`), shared with `translationRoutes.js`. `Notes.js` and `Trash.js` step back to the last page if a page empties. | `util/apiUtil.js` |

**Still open:**

| Item | Notes |
|---|---|
| Permanent delete isn't a transaction | A note restored in another tab **between** the translation delete and the note delete keeps the note but loses its translations. That's very unlikely, and the route returns 404 so the UI resyncs. A strict guarantee needs a MongoDB transaction (this needs a replica set; Atlas clusters have one). |
| Unused tags still build up | Tags whose notes were all deleted remain (`noteCount: 0` in `GET /tag/fetchTags`). A periodic "remove unused tags" step could clean them up; the `tagSchema` `deleteMany` hook already handles the note cleanup. |

### 8.2. HOUSE KEEPING

**Done:**

| Issue | What changed |
|---|---|
| Header block listed paths inconsistently, with a "fethc" typo | Every path is listed as `/notes/...` |
| Unused `dotenv` import | Removed (`app.js` loads it) |
| GET section header mentioned an external provider | Now says "from the database" |
| Leftover "DELETE request to the /notes/:id endpoint" comments | Removed |
| "Conditional rendering" comments | Changed to "Guard clause" |
| Response comments | Now mention the returned note |

**Still to do:**

| Issue | Where | Change |
|---|---|---|
| `GET /notes/:id` isn't called by the client | `client/src` | Use it for a note details view (e.g. from the Archive or Trash pages), or remove the route |
| Missing semicolon | `noteRoutes.js` line 23: `const router = express.Router()` | Add `;` |
| `dotenv` in other routers | `authRoutes.js` and `apiRoutes.js` still call `require('dotenv').config()` | Harmless (it's already loaded by `app.js`); left for those routers' reviews |

---

<!-- SECTION 9: REFERENCES -->
## 9. REFERENCES

**Project files**

- [noteRoutes.js](../server/routes/noteRoutes.js)
- [noteSchema.js](../server/models/noteSchema.js), [tagSchema.js](../server/models/tagSchema.js), [notebookSchema.js](../server/models/notebookSchema.js), [translationSchema.js](../server/models/translationSchema.js), [userSchema.js](../server/models/userSchema.js)
- [securityMiddleware.js](../server/middleware/securityMiddleware.js)
- [apiUtil.js](../server/util/apiUtil.js), [archiveUtil.js](../server/util/archiveUtil.js), [schemaUtil.js](../server/util/schemaUtil.js)
- [Notes.js](../client/src/pages/Notes.js), [NotePad.js](../client/src/pages/NotePad.js), [Trash.js](../client/src/components/Trash.js), [NotePanal.js](../client/src/components/NotePanal.js)
- [ARCHIVE_ROUTES.md](ARCHIVE_ROUTES.md), [TAG_ROUTES.md](TAG_ROUTES.md), [NOTEBOOK_ROUTES.md](NOTEBOOK_ROUTES.md), [TRANSLATION_ROUTES.md](TRANSLATION_ROUTES.md), [EXPORT_ROUTES.md](EXPORT_ROUTES.md), [GLOSSARY.md](../GLOSSARY.md)

**External documentation**

- [Express: Routing](https://expressjs.com/en/guide/routing.html)
- [Mongoose: Queries](https://mongoosejs.com/docs/queries.html)
- [Mongoose: Populate](https://mongoosejs.com/docs/populate.html)
- [Mongoose: Middleware (hooks)](https://mongoosejs.com/docs/middleware.html)
- [Mongoose: Validation (update validators)](https://mongoosejs.com/docs/validation.html#update-validators)
- [MongoDB: TTL Indexes](https://www.mongodb.com/docs/manual/core/index-ttl/)
- [MongoDB: Upserts with `$setOnInsert`](https://www.mongodb.com/docs/manual/reference/operator/update/setOnInsert/)
- [sanitize-html](https://github.com/apostrophecms/sanitize-html)
- [OWASP: Cross Site Scripting Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [MDN: HTTP response status codes](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status)
