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
12. [DELETE /notes/delete/:id](#12-delete-notesdeleteid)
13. [DELETE /notes/:id/permanent](#13-delete-notesidpermanent)
14. [Route Order](#14-route-order)
15. [Status Code Reference](#15-status-code-reference)
16. [Known Gaps & Housekeeping](#16-known-gaps--housekeeping)

---

## 1. Route Summary

The router is mounted at **`/notes`** in `app.js`. Every route requires a valid JWT (`checkJwtToken`).

| Method | Full Path | Purpose | Note Must Be |
|---|---|---|---|
| `GET` | `/notes/fetchNotes` | Paginated, filterable list of active notes | active |
| `GET` | `/notes/trash` | List trashed notes | trashed |
| `GET` | `/notes/:id` | One note (for a details view) | **any** state |
| `POST` | `/notes/addNote` | Create a note | — |
| `PATCH` | `/notes/:id` | Edit title, content, language, notebook, tags or pin | active |
| `PATCH` | `/notes/:id/restore` | Restore from the trash | trashed |
| `DELETE` | `/notes/delete/:id` | Move to the trash (soft delete) | not trashed |
| `DELETE` | `/notes/:id/permanent` | Delete for good, along with its translations | trashed |

---

## 2. Note States

A note's state comes from two fields: `isArchived` and `deletedAt`.

| State | `isArchived` | `deletedAt` | Shown In |
|---|---|---|---|
| Active | `false` | `null` | Notes list |
| Archived | `true` | `null` | Archive page |
| Trashed | any | a `Date` | Trash page |

```
              DELETE /notes/delete/:id
   ┌──────────┐ ─────────────────────► ┌──────────┐  30 days (TTL)   ┌─────────┐
   │  ACTIVE  │                        │  TRASH   │ ───────────────► │  GONE   │
   │          │ ◄───────────────────── │ deletedAt│                  │         │
   └──────────┘ PATCH /:id/restore     └──────────┘ ───────────────► └─────────┘
      ▲    │                                ▲      DELETE /:id/permanent
      │    │ /archive routes                │      (+ its translations)
      │    ▼                                │
   ┌──────────┐  DELETE /archive/:id ───────┘
   │ ARCHIVED │
   └──────────┘
```

### The 30-day TTL purge

`noteSchema` has a **TTL (time-to-live) index** on `deletedAt`, roughly:

```js
noteSchema.index({ deletedAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });// MongoDB deletes the note 30 days after deletedAt
```

| `deletedAt` | TTL Behaviour |
|---|---|
| A `Date` | MongoDB's background job deletes the document once that date is **30 days** old |
| `null` | Ignored. TTL only acts on date values, so active notes are never purged. |

That's why **restoring** a note (`deletedAt: null`) also **stops the countdown**. MongoDB's TTL job runs about every 60 seconds, so the deletion isn't exact to the second.

---

## 3. Imports & Constants

```js
require('dotenv').config()
const express = require('express');
const mongoose = require('mongoose');
const Note = require('../models/noteSchema');
const Notebook = require('../models/notebookSchema');
const Tag = require('../models/tagSchema');
const User = require('../models/userSchema');
const Translation = require('../models/translationSchema');
const { checkJwtToken } = require('../middleware/securityMiddleware');
const { languageCodeRegex } = require('../util/schemaUtil');
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
| `DEFAULT_LIMIT`, `MAX_LIMIT` | Pagination defaults (`10` and `50`), **shared** with `translationRoutes.js` from `util/apiUtil.js` |

```js
const { DEFAULT_LIMIT, MAX_LIMIT } = require('../util/apiUtil');// Shared pagination limits (same as the translations list)
```

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

The result is an array of ObjectIds, ready to store in `note.tags`.

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
| Logging | `[SUCCESS/ERROR: noteRoutes.js, <METHOD> <path>]` | Easy to grep |

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

### Pagination maths

```js
const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
const pageSize = Math.min(Math.max(parseInt(limit, 10) || DEFAULT_LIMIT, 1), MAX_LIMIT);
```

| Input | `pageNumber` | `pageSize` |
|---|---|---|
| missing | 1 | 10 |
| `page=3&limit=20` | 3 | 20 |
| `page=-5&limit=999` | 1 | 50 (capped) |
| `page=abc&limit=0` | 1 | 10 (`0` is falsy, so the default applies) |

`parseInt(x, 10)` always uses base 10, so `'08'` isn't read as octal.

### Query and count in parallel

```js
const [notes, total] = await Promise.all([
    populateNote(Note.find(filter))
        .sort({ isPinned: -1, updatedAt: -1 })// Pinned first, then newest
        .skip((pageNumber - 1) * pageSize)// Page 3 with 10 per page skips 20
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

`totalPages: Math.max(Math.ceil(total / pageSize), 1)` is **at least 1**, so the UI shows "Page 1 of 1" rather than "Page 1 of 0" when there are no notes.

---

## 7. GET `/notes/trash`

**Purpose:** The Trash page.

```js
Note.find({ user: userId, deletedAt: { $ne: null } })// Anything with a deletion date
    .sort({ deletedAt: -1 })// Most recently deleted first
```

`$ne: null` means "**not** null", i.e. the note is in the trash. It also leaves out documents with **no** `deletedAt` field, because `null` matches missing fields in MongoDB.

**Response (200):** `{ "notes": [...] }`. This route isn't paginated (see [Gap 6](#gap-6-get-trash-isnt-paginated)).

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
| `tags` | ❌ | An array of strings (**names**, not IDs). Missing tags are created. Max 30 characters each. |
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

**Step 5: Tags.** `normaliseTagNames()` → length check (≤ 30) → `findOrCreateTagIds()`.

**Step 6: Create**

```js
const newNote = await Note.create({
    user: userId,
    notebook: notebookId,// null = no notebook
    title: title?.trim() || undefined,// undefined lets the schema default ("Untitled") apply
    content,// Sanitised (XSS) and copied to plainText by a noteSchema hook
    language: noteLanguage,
    tags: tagIds,
    isPinned: isPinned === true
});
```

| Detail | Why |
|---|---|
| `title: ... \|\| undefined` | Mongoose defaults only apply to `undefined`. `''` would save an empty title. |
| Named fields only | Protects against **mass assignment**: `user`, `deletedAt` and `isArchived` can't be set from the body |
| `content` sanitising | A schema hook strips dangerous HTML (e.g. `<script>`) **before** saving, so it can't run when displayed |

**Response (201):**

```json
{ "message": "Note saved successfully", "note": { "_id": "...", "notebook": "6732...", "tags": ["6733...", "6734..."] } }
```

Here the note is **not populated**: `notebook` and `tags` are IDs (see [Gap 3](#gap-3-addnote-returns-ids-patch-returns-names)).

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
| `tags` | Normalise → length check → find or create | `updates.tags` (replaces the whole array) |
| `isPinned` | Boolean | `updates.isPinned` |

```js
if (Object.keys(updates).length === 0) → 400 "No changes were sent"
```

This stops an empty `{}` body from making a pointless database call.

**Why the title is set to `'Untitled'` here, when POST uses `undefined`:** with `$set`, an `undefined` value is simply skipped, so the old title would stay. Writing `'Untitled'` makes "clear the title" actually work.

### The update

```js
const note = await populateNote(Note.findOneAndUpdate(
    { _id: id, user: userId, isArchived: false, deletedAt: null },// Only ACTIVE notes are editable
    { $set: updates }
));
```

| Detail | Meaning |
|---|---|
| `isArchived: false, deletedAt: null` | Archived and trashed notes can't be edited. Restore them first. |
| `$set` | Changes only these fields. The rest of the note stays as it is. |
| Schema hook | According to the code comment, a `noteSchema` `findOneAndUpdate` hook **sanitises** `content`, updates `plainText`, runs validation and makes the query return the **updated** note (see [Gap 1](#gap-1-check-that-the-patch-hook-sets-new-true)) |
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

Only `deletedAt` is cleared. `isArchived` isn't touched, so the note goes back to **wherever it was before**:

| Trashed From | `isArchived` | Restored To |
|---|---|---|
| Notes list (`DELETE /notes/delete/:id`) | `false` | Notes list |
| Archive (`DELETE /archive/:id`, which clears `isArchived`) | `false` | Notes list |
| Archive, but via `DELETE /notes/delete/:id` | `true` | **Archive** (see [Gap 2](#gap-2-two-ways-into-the-trash-behave-differently)) |

`isArchived` is included in the response so the frontend can say "Restored to Notes" or "Restored to Archive". Restoring doesn't change `isArchived`, so the value is accurate even though `findOneAndUpdate` returns the document as it was before the update.

**Response (200):** `{ "message": "Note restored", "note": { "_id", "title", "isArchived" } }`

---

## 12. DELETE `/notes/delete/:id`

**Purpose:** Move a note to the trash (a **soft delete**). It can be undone for 30 days.

```js
Note.findOneAndUpdate(
    { _id: id, user: userId, deletedAt: null },// Not already in the trash
    { $set: { deletedAt: new Date(), isPinned: false } }// Starts the 30-day TTL countdown
).select('_id title');
```

| Update | Why |
|---|---|
| `deletedAt: new Date()` | Moves it to the trash, records **when**, and starts the TTL countdown |
| `isPinned: false` | A restored note shouldn't jump to the top of the list |

**Response (200):** `{ "message": "Note moved to trash", "note": { "_id", "title" } }`

---

## 13. DELETE `/notes/:id/permanent`

**Purpose:** Delete a note **for good**, along with every translation made from it.

```js
const note = await Note.findOneAndDelete({ _id: id, user: userId, deletedAt: { $ne: null } }).select('_id title');
if (!note) → 404 "Note not found in trash"
const { deletedCount } = await Translation.deleteMany({ note: id, user: userId });
```

| Safeguard | How |
|---|---|
| **Two-step delete** | `deletedAt: { $ne: null }`: only notes **already in the trash** can be deleted permanently, so an active note can't be wiped by one mistaken click |
| Ownership | `user: userId` on **both** the note and the translations |
| Cascade | Translations linked to the note are removed, so none are left pointing at a deleted note |

`findOneAndDelete` returns the deleted document, so its title can go back to the client (e.g. "'Shopping list' deleted forever").

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
| `DELETE /delete/:id` | 2 (the first segment is the literal `delete`) |
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

## 16. Known Gaps & Housekeeping

### Gap 1: Check that the PATCH hook sets `new: true`

`PATCH /:id` calls `findOneAndUpdate` **without** `{ new: true }` and relies on the `noteSchema` hook to return the updated note (according to the comment). By default, `findOneAndUpdate` returns the document **as it was before the update**, and it also skips validators. Check that the hook does something like:

```js
noteSchema.pre('findOneAndUpdate', function (next) {
    this.setOptions({ new: true, runValidators: true });// Return the updated doc + validate the update
    // ...sanitise content, set plainText
    next();
});
```

If it doesn't, the client gets the **old** note after editing. Passing the options in the route makes it explicit either way:

```js
Note.findOneAndUpdate(filter, { $set: updates }, { new: true, runValidators: true })
```

### Gap 2: Two ways into the trash behave differently

| Route | Clears `isArchived`? | Restore Goes To |
|---|---|---|
| `DELETE /archive/:id` | ✅ Yes | Notes list |
| `DELETE /notes/delete/:id` | ❌ No (and it doesn't exclude archived notes) | **Archive**, if the note was archived |

So the same archived note restores to **different places** depending on which delete was used. Pick one rule:

- **Always restore to the Notes list:** add `isArchived: false` to the `$set` in `DELETE /notes/delete/:id`.
- **Restore to where it came from:** remove `isArchived: false` from `DELETE /archive/:id`.

### Gap 3: `addNote` returns IDs, `PATCH` returns names

`POST /addNote` returns `newNote` **unpopulated** (`notebook: "6732..."`, `tags: ["6733..."]`), while `PATCH` returns it **populated** (`notebook: { name, colour }`). If the frontend adds the new note straight to the list, the notebook and tag columns show IDs or blanks until the page refreshes. **Fix:**

```js
await newNote.populate([{ path: 'notebook', select: 'name colour' }, { path: 'tags', select: 'name' }]);// Same shape as populateNote
```

### Gap 4: Permanent delete isn't atomic, and TTL skips the cascade

**a)** The note is deleted **first**, then the translations. If `Translation.deleteMany` fails, the note is already gone, the translations are left orphaned, and the client gets a 500 for a delete that partly worked. Deleting the translations **first** is safer: if the note delete then fails, the note is still in the trash and can be retried. For a strict guarantee, use a MongoDB **transaction** (this needs a replica set; Atlas clusters have one).

**b)** ✅ **Fixed.** The **30-day TTL purge** deletes notes directly inside MongoDB, so no Mongoose hooks or route code run, and the translation cascade above is skipped. The hourly sweep in `util/archiveUtil.js` now includes `removeOrphanedTranslations()`, which deletes translations whose linked note no longer exists. A translation of a purged note can still exist for up to an hour, so the UI should keep handling a missing note (`t.note?.title || ''`).

### Gap 5: Tags can be created even when the note fails

In `POST /addNote` and `PATCH /:id`, `findOrCreateTagIds()` runs **before** the note is saved. If the note then fails validation, the new tags stay in the database with no notes using them. It's harmless, and they're reused next time the same name is typed. To clean up, a "remove unused tags" step can run periodically, or when a tag list is fetched.

### Gap 6: GET /trash isn't paginated

`/fetchNotes` pages its results, but `/trash` returns **every** trashed note. The 30-day purge keeps the list bounded, but a user who trashes many notes at once could still get a large response. Reusing the same `page`/`limit` logic would keep it consistent.

### Gap 7: The magic number `30`

The tag length limit is hardcoded in two places (`name.length > 30`). If `tagSchema` also has a `maxlength`, the three can drift apart. Move it to `schemaUtil`:

```js
const { languageCodeRegex, MAX_TAG_LENGTH } = require('../util/schemaUtil');// Shared with tagSchema
if (tagNames.some((name) => name.length > MAX_TAG_LENGTH)) ...
```

### Gap 8: Lenient `page` / `limit` parsing (minor)

`parseInt('2abc', 10)` returns `2`, so `?page=2abc` is accepted as page 2. That's harmless. A page **beyond** `totalPages` returns `notes: []` with a 200, so the frontend should clamp to `totalPages` after deleting the last note on a page.

### Housekeeping

| Line(s) | Issue | Suggestion |
|---|---|---|
| 3 | Typo: "fethc" | "fetch" |
| 7–10 | The header lists `/notes/:id`, `/notes/delete/:id` etc., but lines 3–6 list paths **without** `/notes` | Use one style throughout, e.g. drop the `/notes` prefix since the router is mounted there |
| 12 | `require('dotenv').config()` isn't used in this file | Load it once in `app.js` |
| 59 | GET section header: "fetch information from the **provider** and the database" | There's no external provider in this file. "from the database". |
| 401–402 | Leftover comments ("DELETE request to the /notes/:id endpoint") | Delete them. The block comment below covers it, and the path is `/delete/:id`. |
| 405 | `DELETE /delete/:id` puts the verb in the URL | The REST convention is `DELETE /:id`, since the HTTP method already says "delete". (If you change it, update the frontend calls.) |
| Throughout | "Conditional rendering" | That's a React UI term. These are **guard clauses** / validation checks. |
| 391, 429, 461 | "Send a 200 (OK) status code with a message", but the response also includes `note` | e.g. "...with a message and the note" |
