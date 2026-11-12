# archiveRoutes.md — `archiveRoutes.js` Breakdown

`archiveRoutes.js` is the Express router for the **notes archive**. Archiving hides a note from the main notes list without deleting it. From the archive, a note can be **restored** to the main list or **moved to the trash** (soft delete).

The archive has no collection of its own. It's a **state** on each `Note` document, controlled by three fields:

| Field | Type | Meaning |
|---|---|---|
| `isArchived` | Boolean | `true` means the note is in the archive |
| `deletedAt` | Date or `null` | A date means the note is in the trash (soft-deleted); `null` means it isn't |
| `isPinned` | Boolean | Pinned to the top of the main list. Always cleared when a note is archived or trashed. |

---

## Table of Contents

1. [Route Summary](#1-route-summary)
2. [Note Lifecycle](#2-note-lifecycle)
3. [Imports & Setup](#3-imports--setup)
4. [Patterns Shared by Every Route](#4-patterns-shared-by-every-route)
5. [GET /archive/fetchNotes](#5-get-archivefetchnotes)
6. [PATCH /archive/:id](#6-patch-archiveid)
7. [PATCH /archive/:id/restore](#7-patch-archiveidrestore)
8. [DELETE /archive/:id](#8-delete-archiveid)
9. [Status Code Reference](#9-status-code-reference)
10. [Known Gaps & Housekeeping](#10-known-gaps--housekeeping)

---

## 1. Route Summary

The router is mounted at **`/archive`** in `app.js`. Every route requires a valid JWT (`checkJwtToken`).

| Method | Full Path | Purpose | Note Must Be | Sets |
|---|---|---|---|---|
| `GET` | `/archive/fetchNotes` | List the user's archived notes | archived, not trashed | — |
| `PATCH` | `/archive/:id` | Archive an active note | **active** (not archived, not trashed) | `isArchived: true`, `isPinned: false` |
| `PATCH` | `/archive/:id/restore` | Return a note to the main list | **archived**, not trashed | `isArchived: false` |
| `DELETE` | `/archive/:id` | Move an archived note to the trash | **archived**, not trashed | `deletedAt: now`, `isArchived: false`, `isPinned: false` |

No route takes a request body. Everything comes from the URL (`:id`) and the token (`req.user.id`).

---

## 2. Note Lifecycle

```
                PATCH /archive/:id
   ┌──────────┐ ─────────────────────► ┌──────────┐
   │  ACTIVE  │                        │ ARCHIVED │
   │ (main    │ ◄───────────────────── │          │
   │  list)   │ PATCH /archive/:id/    └──────────┘
   └──────────┘        restore              │
        ▲                                   │ DELETE /archive/:id
        │  restore from trash               ▼
        │  (trash routes)             ┌──────────┐
        └──────────────────────────── │  TRASH   │
                                      │ deletedAt│
                                      └──────────┘
```

| State | `isArchived` | `deletedAt` |
|---|---|---|
| Active | `false` | `null` |
| Archived | `true` | `null` |
| Trash | `false` | a `Date` |

**Why `DELETE` sets `isArchived: false`:** a trashed note shouldn't remember that it came from the archive. That way, restoring *any* note from the trash always returns it to the **main list**, and the trash routes only need one rule.

---

## 3. Imports & Setup

```js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const Note = require('../models/noteSchema');
const { checkJwtToken } = require('../middleware/securityMiddleware');
const router = express.Router()
```

| Import | Used For |
|---|---|
| `dotenv` | Loads `.env`. Nothing in this file reads `process.env`, so it isn't needed here (see [Housekeeping](#housekeeping)). |
| `express` | Creates the `router` |
| `mongoose` | Only `mongoose.Types.ObjectId.isValid()`, to check `:id` |
| `Note` | The Mongoose model for notes |
| `checkJwtToken` | Verifies the JWT cookie and sets `req.user` |

---

## 4. Patterns Shared by Every Route

All four routes use the same building blocks, so they're explained once here.

### 4.1 The user ID comes from the token

```js
const userId = req.user.id;
```

`checkJwtToken` decodes the cookie and attaches the payload to `req.user`. Taking the user ID from the token (never from the body or the URL) means a user can only ever touch **their own** notes.

### 4.2 ObjectId validation

```js
if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid note id' });
}
```

If `:id` is something like `abc`, Mongoose can't convert it to an ObjectId and throws a `CastError`, which would land in the `catch` as a **500**. This check turns that into a proper **400 Bad Request**.

`isValid()` also accepts **any 12-character string** (e.g. `"aaaaaaaaaaaa"`), because those can be converted to an ObjectId. That's harmless: the query just finds nothing and returns 404.

### 4.3 Ownership and state in a single filter

```js
Note.findOneAndUpdate(
    { _id: id, user: userId, deletedAt: null, isArchived: false },// WHO + WHICH STATE
    { $set: { ... } }// WHAT changes
)
```

The filter checks four things at once:

| Condition | Ensures |
|---|---|
| `_id: id` | The right note |
| `user: userId` | **The user owns it** |
| `deletedAt: null` | It isn't in the trash. In MongoDB, `null` matches **both** `null` and a missing field, so older notes without `deletedAt` still count. |
| `isArchived: true/false` | It's in the **right starting state** for this action |

**Why this matters:**

1. **It's atomic.** The check and the update happen in **one** database operation. If two browser tabs try to archive the same note at the same moment, only one matches, and the other gets a 404. A separate "find, check, then save" would leave a gap where both could succeed.
2. **It doesn't reveal other users' notes.** Someone else's note, a note that doesn't exist, and a note in the wrong state all give the same **404**. An attacker can't tell "this ID exists but isn't yours" apart from "this ID doesn't exist". A 403 would reveal that.

### 4.4 Small projections

```js
.select('_id title')
```

The response only needs enough for the UI to confirm the action (e.g. a toast saying "'Shopping list' archived"), so the content, tags and so on aren't sent back.

### 4.5 Consistent error handling

Every route follows the same pattern:

```
invalid id ──► 400
no match ────► 404
success ─────► 200 { message, note }
exception ───► 500 { message: 'Internal Server Error' }
```

The logs use `[SUCCESS/ERROR: archiveRoutes.js, <METHOD> <path>]`, so you can grep by route.

---

## 5. GET `/archive/fetchNotes`

**Purpose:** Fill the Archive page with the user's archived notes.

```js
const notes = await Note.find({ user: userId, isArchived: true, deletedAt: null })
    .select('-__v')
    .populate('notebook', 'name colour')
    .populate('tags', 'name')
    .sort({ updatedAt: -1 })
    .lean();
```

| Step | What It Does |
|---|---|
| `find({...})` | The user's notes that are archived **and** not in the trash |
| `.select('-__v')` | Leaves out Mongoose's internal version key. The `-` means "exclude". |
| `.populate('notebook', 'name colour')` | Replaces the notebook ObjectId with `{ _id, name, colour }`, so the UI can show a coloured notebook badge |
| `.populate('tags', 'name')` | Replaces each tag ObjectId with `{ _id, name }` |
| `.sort({ updatedAt: -1 })` | Newest first. Archiving updates `updatedAt` (schema `timestamps: true`), so the most recently archived note appears at the top. |
| `.lean()` | Returns plain JS objects instead of full Mongoose documents. It's faster and uses less memory, and is fine because the data is only being sent, not modified and saved. |

The populate fields match `/notes/fetchNotes`, so **the same note card component** can display both lists.

**Response (200):**

```json
{
  "notes": [
    {
      "_id": "6732a1f0c2b3d4e5f6071829",
      "title": "Old meeting notes",
      "content": "...",
      "isArchived": true,
      "isPinned": false,
      "deletedAt": null,
      "notebook": { "_id": "...", "name": "Work", "colour": "#4F46E5" },
      "tags": [{ "_id": "...", "name": "meetings" }],
      "createdAt": "2026-10-01T08:00:00.000Z",
      "updatedAt": "2026-11-10T14:22:00.000Z"
    }
  ]
}
```

An empty archive returns `{ "notes": [] }` with a **200**. "No archived notes" isn't an error.

---

## 6. PATCH `/archive/:id`

**Purpose:** Move an active note into the archive.

**Example:** `PATCH /archive/6732a1f0c2b3d4e5f6071829`

```js
const note = await Note.findOneAndUpdate(
    { _id: id, user: userId, deletedAt: null, isArchived: false },
    { $set: { isArchived: true, isPinned: false } }
).select('_id title isArchived');
```

| Filter | Why |
|---|---|
| `isArchived: false` | You can't archive a note that's already archived |
| `deletedAt: null` | You can't archive a note that's in the trash |

| Update | Why |
|---|---|
| `isArchived: true` | Hides the note from the main list |
| `isPinned: false` | Pinning only matters in the main list. If the note kept its pin, it would jump to the top unexpectedly when restored. |

`$set` changes **only** these fields and leaves the title, content, tags and so on alone.

**Response (200):**

```json
{ "message": "Note archived", "note": { "_id": "...", "title": "Old meeting notes", "isArchived": false } }
```

The response shows **`isArchived: false`** even though the note *was* archived. See [Gap 1](#gap-1-findoneandupdate-returns-the-old-document).

**404:** "Note not found or already archived". This covers: the note doesn't exist, it isn't yours, it's already archived, or it's in the trash.

---

## 7. PATCH `/archive/:id/restore`

**Purpose:** Return an archived note to the main notes list.

**Example:** `PATCH /archive/6732a1f0c2b3d4e5f6071829/restore`

```js
const note = await Note.findOneAndUpdate(
    { _id: id, user: userId, deletedAt: null, isArchived: true },
    { $set: { isArchived: false } }
).select('_id title');
```

| Filter | Why |
|---|---|
| `isArchived: true` | Only archived notes can be restored from here |
| `deletedAt: null` | Notes in the trash are restored by the trash routes, not this one |

`isPinned` isn't touched. It was already set to `false` when the note was archived, so the note comes back **unpinned**.

**Response (200):**

```json
{ "message": "Note restored", "note": { "_id": "...", "title": "Old meeting notes" } }
```

**404:** "Archived note not found".

**Route matching:** `/:id/restore` doesn't clash with `/:id`. Express matches the whole path, and `/:id` matches only **one** segment, so `/abc/restore` never matches `/:id`.

---

## 8. DELETE `/archive/:id`

**Purpose:** Move an archived note to the trash. This is a **soft delete**: the document stays in MongoDB with a `deletedAt` date, so it can still be restored from the trash.

**Example:** `DELETE /archive/6732a1f0c2b3d4e5f6071829`

```js
const note = await Note.findOneAndUpdate(
    { _id: id, user: userId, deletedAt: null, isArchived: true },
    { $set: { deletedAt: new Date(), isArchived: false, isPinned: false } }
).select('_id title');
```

| Update | Why |
|---|---|
| `deletedAt: new Date()` | Puts the note in the trash and records **when**, so a "deleted X days ago" label or an auto-purge job can work |
| `isArchived: false` | So a trash restore returns it to the main list ([section 2](#2-note-lifecycle)) |
| `isPinned: false` | Already false from archiving. Setting it again is a harmless safety net. |

**Why `DELETE` and not `PATCH`?** From the user's point of view this *is* a delete, so the HTTP verb matches what the user is doing, even though the server only updates fields. Permanent deletion (`deleteOne`) belongs in the trash routes.

**Response (200):**

```json
{ "message": "Note moved to trash", "note": { "_id": "...", "title": "Old meeting notes" } }
```

**404:** "Archived note not found". This route only trashes **archived** notes. Active notes are trashed through the notes routes.

---

## 9. Status Code Reference

| Code | Route(s) | When |
|---|---|---|
| `200` | all | Success (including an empty archive list) |
| `400` | PATCH, PATCH restore, DELETE | `:id` isn't a valid ObjectId |
| `401` | all | (From `checkJwtToken`) No token, or an invalid or expired one |
| `404` | PATCH | Not found, not yours, already archived, or in the trash |
| `404` | PATCH restore, DELETE | Not found, not yours, not archived, or in the trash |
| `500` | all | Unexpected server or database error |

---

## 10. Known Gaps & Housekeeping

### Gap 1: `findOneAndUpdate` returns the OLD document

By default, `findOneAndUpdate` returns the document **as it was before the update**. In `PATCH /archive/:id` the projection includes `isArchived`, so the response says:

```json
{ "message": "Note archived", "note": { "isArchived": false } }
```

If the frontend uses `note.isArchived` from this response to update its state, it will be wrong. The other two routes only return `_id` and `title`, which don't change, so they aren't affected.

**Fix:** ask for the updated document:

```js
const note = await Note.findOneAndUpdate(
    { _id: id, user: userId, deletedAt: null, isArchived: false },
    { $set: { isArchived: true, isPinned: false } },
    { new: true }// Return the document AFTER the update (Mongoose 8 also accepts returnDocument: 'after')
).select('_id title isArchived');
```

Adding `{ new: true }` to all three update routes keeps them consistent.

### Gap 2: "Most recently archived" really means "most recently updated"

The list is sorted by `updatedAt`, which changes on **any** update, not just archiving. If archived notes can be edited (or touched by another route, such as renaming a tag), an old archived note jumps to the top. If you need a true "archived on" order or label, add an `archivedAt` field:

```js
{ $set: { isArchived: true, isPinned: false, archivedAt: new Date() } }// Set when archiving
// GET: .sort({ archivedAt: -1 })
```

### Gap 3: One 404 message covers several cases

"Note not found or already archived" doesn't tell the user *which* case applies. That's deliberate for security ([4.3](#43-ownership-and-state-in-a-single-filter)), and usually fine because the UI only shows the Archive button on active notes. If you want friendlier messages for **the user's own** notes, you'd need a second lookup after a miss, and that lookup must still filter by `user: userId`.

### Gap 4: Route order (future-proofing)

Right now `GET /fetchNotes` is the only GET, so there's no clash. If you ever add `GET /:id`, it must go **after** `GET /fetchNotes`, otherwise Express will treat `fetchNotes` as an `:id` and the ObjectId check will return 400.

### Gap 5: Index for the list query

`GET /fetchNotes` filters on `user`, `isArchived` and `deletedAt`, and sorts on `updatedAt`. Once there are many notes, a compound index in `noteSchema` keeps it fast:

```js
noteSchema.index({ user: 1, isArchived: 1, deletedAt: 1, updatedAt: -1 });// Matches the archive list filter + sort
```

### Housekeeping

| Line(s) | Issue | Suggestion |
|---|---|---|
| 8 | `require('dotenv').config()` isn't used in this file | Load it once in `app.js` / `server.js` and remove it from route files |
| 42–45 | `PATCH /:id` has three overlapping comments | Keep the block comment (44–45) and delete lines 42–43 |
| 51, 63, 83, 95, 119, 131 | "Conditional rendering" | That's a React UI term. These are **guard clauses** / conditional checks. |
| 70, 102, 138 | Comments say "with a message", but the response also includes `note` | e.g. "Send a 200 (OK) status code with a message and the note" |
| 108–110 | The section header says DELETE is "used to remove an item from the database", but this route soft-deletes | e.g. "DELETE: moves an item to the trash (soft delete)" |
