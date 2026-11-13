# NOTE_ROUTES.md — `noteRoutes.js` Breakdown

`noteRoutes.js` is the Express router for **notes**: listing, reading, creating, editing, moving to the trash, restoring and permanently deleting. It's the largest router in the app, and it works alongside two others:

| Router | Handles |
|---|---|
| `noteRoutes.js` | Active notes, the trash, and permanent deletion |
| `archiveRoutes.js` | Archiving and unarchiving |
| `exportRoutes.js` | Downloading notes as CSV / XLSX |

---

## Table of Contents

1. [Route Summary](#1-route-summary)
2. [Note States](#2-note-states)
3. [Imports & Constants](#3-imports--constants)
4. [Shared Helpers](#4-shared-helpers)
5. [Patterns Shared by Every Route](#5-patterns-shared-by-every-route)
6. [GET /notes/fetchNotes](#6-get-notesfetchnotes)
7. [GET /notes/trash](#7-get-notestrash)
8. [GET /notes/:id](#8-get-notesid)
9. [POST /notes/addNote](#9-post-notesaddnote)
10. [PATCH /notes/:id](#10-patch-notesid)
11. [PATCH /notes/:id/restore](#11-patch-notesidrestore)
12. [DELETE /notes/:id](#12-delete-notesid)
13. [DELETE /notes/:id/permanent](#13-delete-notesidpermanent)
14. [Route Order](#14-route-order)
15. [Status Code Reference](#15-status-code-reference)
16. [Resolved Gaps & Remaining Housekeeping](#16-resolved-gaps--remaining-housekeeping)

---

## 1. Route Summary

The router is mounted at **`/notes`** in `app.js`. Every route requires a valid JWT (`checkJwtToken`).

| Method | Full Path | Purpose | Note Must Be |
|---|---|---|---|
| `GET` | `/notes/fetchNotes` | Paginated, filterable list of active notes | active |
| `GET` | `/notes/trash` | Paginated list of trashed notes | trashed |
| `GET` | `/notes/:id` | One note (for a details view) | **any** state |
| `POST` | `/notes/addNote` | Create a note | — |
| `PATCH` | `/notes/:id` | Edit title, content, language, notebook, tags or pin | active |
| `PATCH` | `/notes/:id/restore` | Restore from the trash | trashed |
| `DELETE` | `/notes/:id` | Move to the trash (soft delete) | not trashed |
| `DELETE` | `/notes/:id/permanent` | Delete for good, along with its translations | trashed |

---

## 2. Note States

A note's state comes from two fields: `isArchived` and `deletedAt`. A third field, `archivedAt`, records **when** a note was archived.

| State | `isArchived` | `deletedAt` | Shown In |
|---|---|---|---|
| Active | `false` | `null` | Notes list |
| Archived | `true` | `null` | Archive page |
| Trashed | `false` | a `Date` | Trash page |

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

### The 30-day TTL purge

`noteSchema` has a **TTL (time-to-live) index** on `deletedAt`:

```js
noteSchema.index({ deletedAt: 1 }, { expireAfterSeconds: THIRTY_DAYS_IN_SECONDS });// MongoDB deletes the note 30 days after deletedAt
```

| `deletedAt` | TTL Behaviour |
|---|---|
| A `Date` | MongoDB's background job deletes the document once that date is **30 days** old |
| `null` | Ignored. TTL only acts on date values, so active notes are never purged. |

That's why **restoring** a note (`deletedAt: null`) also **stops the countdown**. MongoDB's TTL job runs about every 60 seconds, so the deletion isn't exact to the second.

### The 60-day archive rule

A TTL index can only delete documents, not change them, so archived notes are moved to the trash by a sweep in `util/archiveUtil.js` instead. `trashExpiredArchivedNotes()` moves notes archived more than **60 days** ago to the trash (the same end state as `DELETE /archive/:id`). It runs for every user on server start and every hour, and for the current user before `GET /notes/trash`, so the trash list is always accurate.

---

## 3. Imports & Constants

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
```

| Import | Used For |
|---|---|
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

## 4. Shared Helpers

### 4.1 `checkNotebook(userId, notebook)`

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

### 4.2 `normaliseTagNames(tags)`

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

### 4.3 `findOrCreateTagIds(userId, tagNames)`

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

The result is an array of ObjectIds, ready to store in `note.tags`. Both routes that call it check the note first, so a failed save can't leave new, unused tags behind (see [9](#9-post-notesaddnote) and [10](#10-patch-notesid)).

### 4.4 `populateNote(query)`

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

### 4.5 `parsePagination(page, limit)` and `paginationInfo(...)` (`util/apiUtil.js`)

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

---

## 5. Patterns Shared by Every Route

| Pattern | Code | Why |
|---|---|---|
| User ID from the token | `const userId = req.user.id;` | Users can only reach their own notes |
| ObjectId check | `if (!mongoose.Types.ObjectId.isValid(id)) → 400` | Turns a `CastError` (500) into a clean 400 |
| Ownership in the filter | `{ _id: id, user: userId, ... }` | Another user's note gives **404, not 403**, so IDs can't be probed |
| State in the filter | `deletedAt: null`, `isArchived: false`, etc. | Each action only works from the right state |
| Atomic update | `findOneAndUpdate(filter, { $set })` | Check and change in one database operation, with no race between two tabs |
| Type checks on the body | `typeof x !== 'string'` | Blocks `{ "$gt": "" }`-style **NoSQL injection** |
| Guard clauses | `if (...) return res.status(4xx)...` | Each check returns early, so the happy path reads top to bottom |
| Logging | `[SUCCESS/ERROR: noteRoutes.js, <METHOD> <path>]` | Easy to grep |

### The `findOneAndUpdate` hook

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

## 6. GET `/notes/fetchNotes`

**Purpose:** The main Notes list (NotesList table): paginated, filterable, pinned notes first.

### Query parameters (all optional)

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

### The filter loop

```js
for (const [field, value, label] of [['notebook', notebook, 'notebook'], ['tags', tag, 'tag']]) {
    if (value === undefined || value === '') continue;// Not sent, so skip
    if (typeof value !== 'string' || !mongoose.Types.ObjectId.isValid(value)) → 400 `Invalid ${label} id`
    filter[field] = value;
}
```

One loop handles **both** ID filters. Each entry is `[Mongo field, query value, label for the error message]`. The query param is called `tag`, but the schema field is `tags`, which is why the field and label differ.

The `typeof value !== 'string'` check matters because `?tag[$ne]=x` is parsed into `{ $ne: 'x' }`.

### Query and count in parallel

```js
const { pageNumber, pageSize, skip } = parsePagination(page, limit);

const [notes, total] = await Promise.all([
    populateNote(Note.find(filter))
        .sort({ isPinned: -1, updatedAt: -1 })// Pinned first, then newest
        .skip(skip)// Page 3 with 10 per page skips 20
        .limit(pageSize)
        .lean(),
    Note.countDocuments(filter)// Total for the pagination controls
]);
```

The page of notes and the total count are **independent queries**, so `Promise.all` runs them at the same time instead of one after the other.

### Response (200)

```json
{
  "notes": [ { "_id": "...", "title": "Shopping list", "isPinned": true, "notebook": {...}, "tags": [...] } ],
  "pagination": { "page": 2, "limit": 20, "total": 47, "totalPages": 3 }
}
```

A page **beyond** `totalPages` returns `notes: []` with a 200. `Notes.js` steps back to the last page when that happens (e.g. after deleting the last note on a page).

---

## 7. GET `/notes/trash`

**Purpose:** The Trash page (`Trash.js`), paginated the same way as `/fetchNotes`.

```js
await trashExpiredArchivedNotes(userId);// 60-day archive rule first, so expired archived notes show straight away

const filter = { user: userId, deletedAt: { $ne: null } };// Anything with a deletion date
const [notes, total] = await Promise.all([
    populateNote(Note.find(filter)).sort({ deletedAt: -1 }).skip(skip).limit(pageSize).lean(),// Most recently deleted first
    Note.countDocuments(filter)
]);
```

`$ne: null` means "**not** null", i.e. the note is in the trash. It also leaves out documents with **no** `deletedAt` field, because `null` matches missing fields in MongoDB.

**Query (optional):** `page`, `limit` (see [4.5](#45-parsepaginationpage-limit-and-paginationinfo-apiutiljs)).

**Response (200):** `{ "notes": [...], "pagination": { "page", "limit", "total", "totalPages" } }`

`Trash.js` shows the shared `Pagination` controls, re-fetches after each restore or delete so the page refills from the next one, and steps back a page if the last page empties.

---

## 8. GET `/notes/:id`

**Purpose:** Fetch one note for a details panel. It works for **active, archived and trashed** notes, so any list can open a note's details.

```js
const note = await populateNote(Note.findOne({ _id: id, user: userId })).lean();
```

The filter has no state conditions on purpose: only **ownership** is checked.

**Response (200):** `{ "note": { ...populated note } }`

**404:** "Note not found". This covers a note that doesn't exist and one that isn't the user's.

---

## 9. POST `/notes/addNote`

**Purpose:** Create a note from the NotePadForm.

### Request body

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

### Step-by-step

**Step 1: Content check.** Content must be a non-empty string. This also blocks operator injection.

**Step 2: Type checks.** One combined condition covers every optional field:

```js
(title !== undefined && typeof title !== 'string') ||
(language !== undefined && typeof language !== 'string') ||
(notebook !== undefined && notebook !== null && typeof notebook !== 'string') ||// null is allowed = "No notebook"
(isPinned !== undefined && typeof isPinned !== 'boolean') ||// "true" (string) is rejected
!Array.isArray(tags) || tags.some((tag) => typeof tag !== 'string')
```

The pattern is "**if it was sent, it must be the right type**".

**Step 3: Language fallback**

```js
let noteLanguage = language?.trim();
if (!noteLanguage) {
    const user = await User.findById(userId).select('defaultLanguages').exec();
    noteLanguage = user?.defaultLanguages?.defaultNoteLanguage || 'en';
}
```

The fallback order is **form → user's profile default → `'en'`**. The extra database call only happens when no language was sent.

**Step 4: Notebook ownership.** `checkNotebook()`, see [4.1](#41-checknotebookuserid-notebook).

**Step 5: Tag names.** `normaliseTagNames()` → length check (≤ `MAX_TAG_LENGTH`).

**Step 6: Build and validate the note, then create the tags, then save**

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

**Response (201):**

```json
{
  "message": "Note saved successfully",
  "note": { "_id": "...", "notebook": { "_id": "...", "name": "Work", "colour": "#4F46E5" }, "tags": [{ "_id": "...", "name": "meetings" }] }
}
```

**Errors:** `ValidationError` → 400 with the first schema message. Anything else → 500.

---

## 10. PATCH `/notes/:id`

**Purpose:** Edit a note from the EditNoteForm. **Only the fields that are sent are changed.**

### Request body (any combination)

```json
{ "title": "New title", "tags": ["work"], "isPinned": true }
```

### Building the update

Each field is handled only if it was sent (`!== undefined`):

| Field | Rule | Update |
|---|---|---|
| `title` | Blank → `"Untitled"` | `updates.title` |
| `content` | Can't be emptied → 400 | `updates.content` |
| `language` | Can't be emptied → 400 | `updates.language` (format checked by the schema) |
| `notebook` | `''` / `null` → no notebook, otherwise `checkNotebook()` | `updates.notebook` |
| `isPinned` | Boolean | `updates.isPinned` |
| `tags` | Normalise → length check → (note check) → find or create | `updates.tags` (replaces the whole array) |

```js
if (Object.keys(updates).length === 0 && tagNames === undefined) → 400 "No changes were sent"
```

This stops an empty `{}` body from making a pointless database call.

**Why the title is set to `'Untitled'` here, when POST uses `undefined`:** with `$set`, an `undefined` value is simply skipped, so the old title would stay. Writing `'Untitled'` makes "clear the title" actually work.

### Checking the note before creating tags

When `tags` are sent, the route loads the note and validates the other changes **before** calling `findOrCreateTagIds()`:

```js
const current = await Note.findOne(editableFilter);
if (!current) → 404 "Note not found"
current.set(updates);
await current.validate(Object.keys(updates));// Only the sent fields, so old data in other fields can't block an edit
updates.tags = await findOrCreateTagIds(userId, tagNames);
```

So a missing, archived or trashed note, or an invalid title or language, can't leave new, unused tags behind. When no tags are sent, this extra query is skipped.

### The update

```js
const editableFilter = { _id: id, user: userId, isArchived: false, deletedAt: null };// Only ACTIVE notes are editable
const note = await populateNote(Note.findOneAndUpdate(editableFilter, { $set: updates }));
```

| Detail | Meaning |
|---|---|
| `isArchived: false, deletedAt: null` | Archived and trashed notes can't be edited. Restore them first. |
| `$set` | Changes only these fields. The rest of the note stays as it is. |
| Schema hook | Sanitises `content`, updates `plainText`, runs validators and returns the **updated** note (see [5](#the-findoneandupdate-hook)) |
| `populateNote(...)` | The response includes notebook and tag **names** |

**Response (200):** `{ "message": "Note updated successfully", "note": { ...populated } }`

---

## 11. PATCH `/notes/:id/restore`

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

---

## 12. DELETE `/notes/:id`

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

---

## 13. DELETE `/notes/:id/permanent`

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

## 14. Route Order

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

---

## 15. Status Code Reference

| Code | Route(s) | When |
|---|---|---|
| `200` | all except addNote | Success |
| `201` | addNote | Note created |
| `400` | all with `:id` | Invalid ObjectId |
| `400` | fetchNotes | Invalid language, notebook or tag filter |
| `400` | addNote, PATCH | Missing content, wrong field types, tag > 30 characters, emptied language, invalid notebook ID, schema validation, no changes sent |
| `401` | all | (From `checkJwtToken`) No token, or an invalid or expired one |
| `404` | addNote, PATCH | The notebook doesn't exist or isn't the user's |
| `404` | GET /:id, PATCH, restore, delete, permanent | The note isn't found, isn't the user's, or is in the wrong state |
| `500` | all | Unexpected error |

---

## 16. Resolved Gaps & Remaining Housekeeping

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

The housekeeping comments are fixed too:
- The header block lists every path the same way (`/notes/...`) and the "fethc" typo is gone.
- The unused `dotenv` import is removed (`app.js` loads it).
- The GET section header says "from the database" (there's no external provider).
- The leftover "DELETE request to the /notes/:id endpoint" comments are removed.
- "Conditional rendering" is now "Guard clause".
- The response comments mention the returned note.

### Still open

| Item | Notes |
|---|---|
| Permanent delete isn't a transaction | A note restored in another tab **between** the translation delete and the note delete keeps the note but loses its translations. That's very unlikely, and the route returns 404 so the UI resyncs. A strict guarantee needs a MongoDB transaction (this needs a replica set; Atlas clusters have one). |
| Unused tags still build up | Tags whose notes were all deleted remain (`noteCount: 0` in `GET /tag/fetchTags`). A periodic "remove unused tags" step could clean them up; the `tagSchema` `deleteMany` hook already handles the note cleanup. |
| `dotenv` in other routers | `authRoutes.js` and `apiRoutes.js` still call `require('dotenv').config()`. It's harmless (it's already loaded by `app.js`) and is left for those routers' reviews. |
