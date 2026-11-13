# archiveRoutes.md — `archiveRoutes.js` Breakdown

`archiveRoutes.js` is the Express router for the **archive**. It handles two kinds of item: **notes** and **translations**. Archiving hides an item from its main list without deleting it. From the archive, an item can be **restored** to its main list or **moved to the trash** (soft delete). An item left in the archive for **60 days** is moved to the trash automatically.

The archive has no collection of its own. It's a **state** on each `Note` and `Translation` document, controlled by these fields:

| Field | Type | On | Meaning |
|---|---|---|---|
| `isArchived` | Boolean | both | `true` means the item is in the archive |
| `archivedAt` | Date or `null` | both | When the item was archived. Starts the 60-day countdown. `null` when not archived. |
| `deletedAt` | Date or `null` | both | A date means the item is in the trash (soft-deleted); `null` means it isn't |
| `isPinned` | Boolean | notes only | Pinned to the top of the main list. Always cleared when a note is archived or trashed. |

---

## Table of Contents

1. [Route Summary](#1-route-summary)
2. [Lifecycle](#2-lifecycle)
3. [The 60-Day Archive Rule](#3-the-60-day-archive-rule)
4. [Imports & Setup](#4-imports--setup)
5. [Patterns Shared by Every Route](#5-patterns-shared-by-every-route)
6. [GET /archive/fetchNotes](#6-get-archivefetchnotes)
7. [GET /archive/fetchTranslations](#7-get-archivefetchtranslations)
8. [PATCH /archive/:id](#8-patch-archiveid)
9. [PATCH /archive/:id/restore](#9-patch-archiveidrestore)
10. [DELETE /archive/:id](#10-delete-archiveid)
11. [Translation Routes](#11-translation-routes)
12. [Status Code Reference](#12-status-code-reference)
13. [Resolved Gaps & Remaining Housekeeping](#13-resolved-gaps--remaining-housekeeping)

---

## 1. Route Summary

The router is mounted at **`/archive`** in `app.js`. Every route requires a valid JWT (`checkJwtToken`).

### Notes

| Method | Full Path | Purpose | Note Must Be | Sets |
|---|---|---|---|---|
| `GET` | `/archive/fetchNotes` | List the user's archived notes | archived, not trashed | — |
| `PATCH` | `/archive/:id` | Archive an active note | **active** (not archived, not trashed) | `isArchived: true`, `isPinned: false`, `archivedAt: now` |
| `PATCH` | `/archive/:id/restore` | Return a note to the main list | **archived**, not trashed | `isArchived: false`, `archivedAt: null` |
| `DELETE` | `/archive/:id` | Move an archived note to the trash | **archived**, not trashed | `deletedAt: now`, `isArchived: false`, `isPinned: false`, `archivedAt: null` |

### Translations

| Method | Full Path | Purpose | Translation Must Be | Sets |
|---|---|---|---|---|
| `GET` | `/archive/fetchTranslations` | List the user's archived translations | archived, not trashed | — |
| `PATCH` | `/archive/translation/:id` | Archive an active translation | **active** (not archived, not trashed) | `isArchived: true`, `archivedAt: now` |
| `PATCH` | `/archive/translation/:id/restore` | Return a translation to the main list | **archived**, not trashed | `isArchived: false`, `archivedAt: null` |
| `DELETE` | `/archive/translation/:id` | Move an archived translation to the trash | **archived**, not trashed | `deletedAt: now`, `isArchived: false`, `archivedAt: null` |

No route takes a request body. Everything comes from the URL (`:id`) and the token (`req.user.id`).

---

## 2. Lifecycle

Notes and translations follow the same lifecycle.

```
                PATCH /archive/:id
   ┌──────────┐ ─────────────────────► ┌──────────┐
   │  ACTIVE  │                        │ ARCHIVED │
   │ (main    │ ◄───────────────────── │archivedAt│
   │  list)   │ PATCH /archive/:id/    └──────────┘
   └──────────┘        restore              │
        ▲                                   │ DELETE /archive/:id
        │  restore from trash               │ or 60 days in the archive
        │  (trash routes)                   ▼
        │                             ┌──────────┐
        └──────────────────────────── │  TRASH   │ ── 30 days ──► purged
                                      │ deletedAt│    (TTL index)
                                      └──────────┘
```

For translations, swap in the `/archive/translation/...` paths.

| State | `isArchived` | `archivedAt` | `deletedAt` |
|---|---|---|---|
| Active | `false` | `null` | `null` |
| Archived | `true` | a `Date` | `null` |
| Trash | `false` | `null` | a `Date` |

**Why `DELETE` sets `isArchived: false`:** a trashed item shouldn't remember that it came from the archive. That way, restoring *any* item from the trash always returns it to the **main list**, and the trash routes only need one rule. `DELETE /notes/:id`, `DELETE /translation/:id` and the 60-day sweep all produce the same trash state.

---

## 3. The 60-Day Archive Rule

An archived item is moved to the trash **60 days** after `archivedAt`. A TTL index can only delete documents, not change them, so a sweep in `util/archiveUtil.js` does the move instead:

| Function | Moves |
|---|---|
| `trashExpiredArchivedNotes(userId?)` | Expired archived notes (also clears `isPinned`) |
| `trashExpiredArchivedTranslations(userId?)` | Expired archived translations |

Both set the same fields as the `DELETE` routes (`deletedAt: now`, `isArchived: false`, `archivedAt: null`). Items archived before `archivedAt` existed have no date, so `updatedAt` is used for them.

**When it runs:**

- For **one user**, at the start of `GET /archive/fetchNotes`, `GET /archive/fetchTranslations` and `GET /notes/trash`. The lists are always accurate, even between hourly sweeps.
- For **every user**, on server start and then every hour (`startArchiveSweep()` in `app.js`). The hourly sweep also deletes translations whose note was purged by the notes TTL index.

Once in the trash, the `deletedAt` TTL index purges the item **30 days** later.

---

## 4. Imports & Setup

```js
const express = require('express');
const mongoose = require('mongoose');
const Note = require('../models/noteSchema');
const Translation = require('../models/translationSchema');
const { checkJwtToken } = require('../middleware/securityMiddleware');
const { trashExpiredArchivedNotes, trashExpiredArchivedTranslations } = require('../util/archiveUtil');
const router = express.Router();
```

| Import | Used For |
|---|---|
| `express` | Creates the `router` |
| `mongoose` | Only `mongoose.Types.ObjectId.isValid()`, to check `:id` |
| `Note` | The Mongoose model for notes |
| `Translation` | The Mongoose model for translations |
| `checkJwtToken` | Verifies the JWT cookie and sets `req.user` |
| `trashExpiredArchived*` | The per-user 60-day sweep run before each GET ([section 3](#3-the-60-day-archive-rule)) |

`dotenv` isn't imported. `app.js` loads it before any router is required.

---

## 5. Patterns Shared by Every Route

All eight routes use the same building blocks, so they're explained once here.

### 5.1 The user ID comes from the token

```js
const userId = req.user.id;
```

`checkJwtToken` decodes the cookie and attaches the payload to `req.user`. Taking the user ID from the token (never from the body or the URL) means a user can only ever touch **their own** items.

### 5.2 ObjectId validation (guard clause)

```js
if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid note id' });
}
```

If `:id` is something like `abc`, Mongoose can't convert it to an ObjectId and throws a `CastError`, which would land in the `catch` as a **500**. This check turns that into a proper **400 Bad Request**.

`isValid()` also accepts **any 12-character string** (e.g. `"aaaaaaaaaaaa"`), because those can be converted to an ObjectId. That's harmless: the query just finds nothing and returns 404.

### 5.3 Ownership and state in a single filter

```js
Note.findOneAndUpdate(
    { _id: id, user: userId, deletedAt: null, isArchived: false },// WHO + WHICH STATE
    { $set: { ... } }// WHAT changes
)
```

The filter checks four things at once:

| Condition | Ensures |
|---|---|
| `_id: id` | The right item |
| `user: userId` | **The user owns it** |
| `deletedAt: null` | It isn't in the trash. In MongoDB, `null` matches **both** `null` and a missing field, so older documents without `deletedAt` still count. |
| `isArchived: true/false` | It's in the **right starting state** for this action |

**Why this matters:**

1. **It's atomic.** The check and the update happen in **one** database operation. If two browser tabs try to archive the same item at the same moment, only one matches, and the other gets a 404. A separate "find, check, then save" would leave a gap where both could succeed.
2. **It doesn't reveal other users' items.** Someone else's item, an item that doesn't exist, and an item in the wrong state all give the same **404**. An attacker can't tell "this ID exists but isn't yours" apart from "this ID doesn't exist". A 403 would reveal that.

### 5.4 Returning the updated document

By default, `findOneAndUpdate` returns the document **as it was before** the update. Every update route here returns it **after** the update:

- **Notes:** `noteSchema`'s `pre('findOneAndUpdate')` hook sets `returnDocument: 'after'` (and `runValidators`) for every note update, so the routes don't pass it themselves.
- **Translations:** `translationSchema` has no such hook, so each translation update route passes `{ returnDocument: 'after' }` itself.

`returnDocument: 'after'` is used instead of `{ new: true }`, which Mongoose 9 deprecates.

### 5.5 Small projections

```js
.select('_id title')
```

The response only needs enough for the UI to confirm the action (e.g. a toast saying "'Shopping list' archived"), so the content, tags and so on aren't sent back. Translations return `_id` and `sourceText`.

### 5.6 Consistent error handling

Every route follows the same pattern:

```
invalid id ──► 400
no match ────► 404
success ─────► 200 { message, note | translation }
exception ───► 500 { message: 'Internal Server Error' }
```

The logs use `[SUCCESS/ERROR: archiveRoutes.js, <METHOD> <path>]`, so you can grep by route.

---

## 6. GET `/archive/fetchNotes`

**Purpose:** Fill the Archive page with the user's archived notes.

```js
await trashExpiredArchivedNotes(userId);

const notes = await Note.find({ user: userId, isArchived: true, deletedAt: null })
    .select('-__v')
    .populate('notebook', 'name colour')
    .populate('tags', 'name')
    .sort({ archivedAt: -1, updatedAt: -1 })
    .lean();
```

| Step | What It Does |
|---|---|
| `trashExpiredArchivedNotes(userId)` | Moves this user's notes archived more than 60 days ago to the trash first, so they never show here |
| `find({...})` | The user's notes that are archived **and** not in the trash |
| `.select('-__v')` | Leaves out Mongoose's internal version key. The `-` means "exclude". |
| `.populate('notebook', 'name colour')` | Replaces the notebook ObjectId with `{ _id, name, colour }`, so the UI can show a coloured notebook badge |
| `.populate('tags', 'name')` | Replaces each tag ObjectId with `{ _id, name }` |
| `.sort({ archivedAt: -1, updatedAt: -1 })` | Most recently **archived** first. `updatedAt` breaks ties and orders older notes archived before `archivedAt` existed. |
| `.lean()` | Returns plain JS objects instead of full Mongoose documents. It's faster and uses less memory, and is fine because the data is only being sent, not modified and saved. |

The populate fields match `/notes/fetchNotes`, so **the same note card component** can display both lists. The compound index `{ user, isArchived, deletedAt, archivedAt }` in `noteSchema` covers this filter and sort.

**Response (200):**

```json
{
  "notes": [
    {
      "_id": "6732a1f0c2b3d4e5f6071829",
      "title": "Old meeting notes",
      "content": "...",
      "isArchived": true,
      "archivedAt": "2026-11-10T14:22:00.000Z",
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

## 7. GET `/archive/fetchTranslations`

**Purpose:** Fill the archived translations list.

```js
await trashExpiredArchivedTranslations(userId);

const translations = await Translation.find({ user: userId, isArchived: true, deletedAt: null })
    .select('-__v')
    .populate('note', 'title')
    .sort({ archivedAt: -1, updatedAt: -1 })
    .lean();
```

The same steps as [section 6](#6-get-archivefetchnotes), except:

| Step | What It Does |
|---|---|
| `.populate('note', 'title')` | Replaces the linked note ObjectId with `{ _id, title }`, like `/translation/fetch`. It stays `null` for free text that wasn't translated from a note. |

`textHash` has `select: false` in the schema, so it's never sent. The index `{ user, isArchived, deletedAt, archivedAt }` in `translationSchema` covers this query.

**Response (200):** `{ "translations": [ ... ] }`. An empty archive returns `{ "translations": [] }`.

---

## 8. PATCH `/archive/:id`

**Purpose:** Move an active note into the archive.

**Example:** `PATCH /archive/6732a1f0c2b3d4e5f6071829`

```js
const note = await Note.findOneAndUpdate(
    { _id: id, user: userId, deletedAt: null, isArchived: false },
    { $set: { isArchived: true, isPinned: false, archivedAt: new Date() } }
).select('_id title isArchived archivedAt');
```

| Filter | Why |
|---|---|
| `isArchived: false` | You can't archive a note that's already archived |
| `deletedAt: null` | You can't archive a note that's in the trash |

| Update | Why |
|---|---|
| `isArchived: true` | Hides the note from the main list |
| `isPinned: false` | Pinning only matters in the main list. If the note kept its pin, it would jump to the top unexpectedly when restored. |
| `archivedAt: new Date()` | Starts the 60-day countdown and gives the archive list its sort order |

`$set` changes **only** these fields and leaves the title, content, tags and so on alone.

**Response (200):**

```json
{ "message": "Note archived", "note": { "_id": "...", "title": "Old meeting notes", "isArchived": true, "archivedAt": "2026-11-13T09:00:00.000Z" } }
```

The response shows the note **after** the update ([5.4](#54-returning-the-updated-document)), so the frontend can use `isArchived` and `archivedAt` directly.

**404:** "Note not found or already archived". This covers: the note doesn't exist, it isn't yours, it's already archived, or it's in the trash.

---

## 9. PATCH `/archive/:id/restore`

**Purpose:** Return an archived note to the main notes list.

**Example:** `PATCH /archive/6732a1f0c2b3d4e5f6071829/restore`

```js
const note = await Note.findOneAndUpdate(
    { _id: id, user: userId, deletedAt: null, isArchived: true },
    { $set: { isArchived: false, archivedAt: null } }
).select('_id title');
```

| Filter | Why |
|---|---|
| `isArchived: true` | Only archived notes can be restored from here |
| `deletedAt: null` | Notes in the trash are restored by the trash routes, not this one |

| Update | Why |
|---|---|
| `isArchived: false` | Puts the note back in the main list |
| `archivedAt: null` | Stops the 60-day countdown. If the note is archived again, the countdown starts fresh. |

`isPinned` isn't touched. It was already set to `false` when the note was archived, so the note comes back **unpinned**.

**Response (200):**

```json
{ "message": "Note restored", "note": { "_id": "...", "title": "Old meeting notes" } }
```

**404:** "Archived note not found".

**Route matching:** `/:id/restore` doesn't clash with `/:id`. Express matches the whole path, and `/:id` matches only **one** segment, so `/abc/restore` never matches `/:id`.

---

## 10. DELETE `/archive/:id`

**Purpose:** Move an archived note to the trash. This is a **soft delete**: the document stays in MongoDB with a `deletedAt` date, so it can still be restored from the trash for 30 days.

**Example:** `DELETE /archive/6732a1f0c2b3d4e5f6071829`

```js
const note = await Note.findOneAndUpdate(
    { _id: id, user: userId, deletedAt: null, isArchived: true },
    { $set: { deletedAt: new Date(), isArchived: false, isPinned: false, archivedAt: null } }
).select('_id title');
```

| Update | Why |
|---|---|
| `deletedAt: new Date()` | Puts the note in the trash and records **when**, for the "deleted X days ago" label and the 30-day TTL purge |
| `isArchived: false` | So a trash restore returns it to the main list ([section 2](#2-lifecycle)) |
| `isPinned: false` | Already false from archiving. Setting it again is a harmless safety net. |
| `archivedAt: null` | The note has left the archive, so the countdown no longer applies |

**Why `DELETE` and not `PATCH`?** From the user's point of view this *is* a delete, so the HTTP verb matches what the user is doing, even though the server only updates fields. Permanent deletion belongs in the trash routes.

**Response (200):**

```json
{ "message": "Note moved to trash", "note": { "_id": "...", "title": "Old meeting notes" } }
```

**404:** "Archived note not found". This route only trashes **archived** notes. Active notes are trashed through `DELETE /notes/:id`.

---

## 11. Translation Routes

The three translation update routes mirror the note routes, under `/archive/translation/...`. Only the differences are listed here.

| Route | Filter | Sets | Response (200) | 404 Message |
|---|---|---|---|---|
| `PATCH /archive/translation/:id` | `isArchived: { $ne: true }` | `isArchived: true`, `archivedAt: now` | `{ message: 'Translation archived', translation: { _id, sourceText, isArchived, archivedAt } }` | "Translation not found or already archived" |
| `PATCH /archive/translation/:id/restore` | `isArchived: true` | `isArchived: false`, `archivedAt: null` | `{ message: 'Translation restored', translation: { _id, sourceText } }` | "Archived translation not found" |
| `DELETE /archive/translation/:id` | `isArchived: true` | `deletedAt: now`, `isArchived: false`, `archivedAt: null` | `{ message: 'Translation moved to trash', translation: { _id, sourceText } }` | "Archived translation not found" |

All three also filter on `_id`, `user: userId` and `deletedAt: null` ([5.3](#53-ownership-and-state-in-a-single-filter)) and pass `{ returnDocument: 'after' }` ([5.4](#54-returning-the-updated-document)).

**Differences from notes:**

- Translations have no `isPinned`, so nothing is unpinned.
- The archive filter uses `isArchived: { $ne: true }` instead of `isArchived: false`. `$ne: true` also matches older translations saved before the field existed.
- The 400 message is "Invalid translation id".
- Active translations are trashed through `DELETE /translation/:id`; archived ones only through this router.

**Route matching:** `/translation/:id` has two segments and `/:id` has one, so `PATCH /archive/translation/abc` never reaches the note route. Likewise `/translation/:id/restore` (three segments) never matches `/:id/restore` (two).

---

## 12. Status Code Reference

| Code | Route(s) | When |
|---|---|---|
| `200` | all | Success (including an empty archive list) |
| `400` | all with `:id` | `:id` isn't a valid ObjectId |
| `401` | all | (From `checkJwtToken`) No token, or an invalid or expired one |
| `404` | PATCH `/:id`, PATCH `/translation/:id` | Not found, not yours, already archived, or in the trash |
| `404` | restore, DELETE (notes and translations) | Not found, not yours, not archived, or in the trash |
| `500` | all | Unexpected server or database error (for the GETs, this includes a failed 60-day sweep) |

---

## 13. Resolved Gaps & Remaining Housekeeping

These gaps were found in an earlier review and have now been fixed.

| Gap | Fix | Where |
|---|---|---|
| 1. `findOneAndUpdate` returned the old document, so `PATCH /archive/:id` answered `isArchived: false` | Notes: `noteSchema`'s `findOneAndUpdate` hook sets `returnDocument: 'after'`, so every note update returns the new document. Translations: all three update routes pass `{ returnDocument: 'after' }`. The translation archive route used `{ new: true }`, which Mongoose 9 deprecates. | `noteSchema.js`, `archiveRoutes.js` translation routes |
| 2. "Most recently archived" really meant "most recently updated" | Added `archivedAt`, set on archive and cleared on restore/trash. Both lists sort by `{ archivedAt: -1, updatedAt: -1 }`. `archivedAt` also drives the 60-day rule. | `noteSchema.js`, `translationSchema.js`, `archiveRoutes.js` |
| 5. No index for the list query | Added `{ user: 1, isArchived: 1, deletedAt: 1, archivedAt: -1 }` to `noteSchema`, matching the one `translationSchema` already had | `noteSchema.js` |

The housekeeping comments are fixed too:
- The unused `require('dotenv').config()` is removed (`app.js` loads it).
- The three overlapping comments above `PATCH /:id` are now one block comment.
- "Conditional rendering" is now "Guard clause".
- The response comments mention the returned note.
- The DELETE section header says the routes move items to the trash (soft delete) instead of "remove an item from the database".
- Missing semicolons after the `Translation` import and `express.Router()` are added, and trailing whitespace in the `PATCH /translation/:id` comment is removed.

### Still open

| Item | Notes |
|---|---|
| 3. One 404 message covers several cases | By design ([5.3](#53-ownership-and-state-in-a-single-filter)). The UI only shows each button on items in the right state, so a 404 normally means another tab already acted, and the list refreshes. Friendlier messages would need a second lookup after a miss, which must still filter by `user: userId`. |
| 4. Route order (future-proofing) | `GET /fetchNotes` and `GET /fetchTranslations` are the only GETs, so nothing clashes. If you add `GET /:id`, it must go **after** them, otherwise Express treats `fetchNotes` as an `:id` and the ObjectId check returns 400. |
| A failed sweep fails the GET | The per-user sweep runs inside the GET's `try`, so if it throws, the archive list returns 500 instead of the (possibly slightly stale) list. The hourly sweep would still catch up. Wrapping it in its own `try/catch` that only logs would keep the list available; it's left as is because a DB error during the sweep usually means the `find` would fail too. |
| Route order in the file | Note and translation routes are interleaved within each verb section. It doesn't affect matching (see [section 11](#11-translation-routes)), but grouping them would make the file easier to scan. |
