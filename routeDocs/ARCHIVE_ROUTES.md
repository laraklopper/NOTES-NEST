# ARCHIVE ROUTES — [`archiveRoutes.js`](../server/routes/archiveRoutes.js) BREAKDOWN

[`archiveRoutes.js`](../server/routes/archiveRoutes.js) is the Express router for the **archive**. It handles two kinds of item: **notes** and **translations**. Archiving hides an item from its main list without deleting it. From the archive, an item can be **restored** to its main list or **moved to the trash** (soft delete). An item left in the archive for **60 days** is moved to the trash automatically.

The archive has no collection of its own. It's a **state** on each `Note` and `Translation` document, controlled by these fields:

| Field | Type | On | Meaning |
|---|---|---|---|
| `isArchived` | Boolean | both | `true` means the item is in the archive |
| `archivedAt` | Date or `null` | both | When the item was archived. Starts the 60-day countdown. `null` when not archived. |
| `deletedAt` | Date or `null` | both | A date means the item is in the trash (soft-deleted); `null` means it isn't |
| `isPinned` | Boolean | notes only | Pinned to the top of the main list. Always cleared when a note is archived or trashed. |

---

## TABLE OF CONTENTS
1. [ROUTE SUMMARY](#1-route-summary)
     - [1.1. GET `/archive/fetchNotes`](#11-get-archivefetchnotes)
     - [1.2. GET `/archive/fetchTranslations`](#12-get-archivefetchtranslations)
     - [1.3. PATCH `/archive/:id`](#13-patch-archiveid)
     - [1.4. PATCH `/archive/:id/restore`](#14-patch-archiveidrestore)
     - [1.5. DELETE `/archive/:id`](#15-delete-archiveid)
     - [1.6. TRANSLATION ROUTES](#16-translation-routes)
     - [1.7. LIFECYCLE](#17-lifecycle)
     - [1.8. THE 60-DAY ARCHIVE RULE](#18-the-60-day-archive-rule)
2. [IMPORTS AND SETUP](#2-imports-and-setup)
3. [SCHEMAS AND UTILITY FUNCTIONS](#3-schemas-and-utility-functions)
     - [3.1. SCHEMAS](#31-schemas)
          - [3.1.1. NOTE SCHEMA](#311-note-schema)
          - [3.1.2. TAG SCHEMA](#312-tag-schema)
          - [3.1.3. NOTEBOOK SCHEMA](#313-notebook-schema)
          - [3.1.4. TRANSLATION SCHEMA](#314-translation-schema)
     - [3.2. UTILITY FUNCTIONS](#32-utility-functions)
4. [SECURITY](#4-security)
     - [4.1. PACKAGES](#41-packages)
     - [4.2. MIDDLEWARE](#42-middleware)
     - [4.3. PATTERNS SHARED BY EVERY ROUTE](#43-patterns-shared-by-every-route)
5. [STATUS CODE REFERENCES](#5-status-code-references)
6. [KNOWN GAPS AND HOUSE KEEPING](#6-known-gaps-and-house-keeping)
     - [6.1. GAPS](#61-gaps)
     - [6.2. HOUSE KEEPING](#62-house-keeping)
7. [REFERENCES](#7-references)

- *View [GLOSSARY.md](../GLOSSARY.md) for terminology*

---

<!-- SECTION 1 -->
## 1. ROUTE SUMMARY

The router is mounted at **`/archive`** in `app.js`. Every route requires a valid JWT (`checkJwtToken`).

**Notes**

| Method | Full Path | Middleware | Purpose | Note Must Be | Sets |
|---|---|---|---|---|---|
| `GET` | `/archive/fetchNotes` | `checkJwtToken` | List the user's archived notes | archived, not trashed | — |
| `PATCH` | `/archive/:id` | `checkJwtToken` | Archive an active note | **active** (not archived, not trashed) | `isArchived: true`, `isPinned: false`, `archivedAt: now` |
| `PATCH` | `/archive/:id/restore` | `checkJwtToken` | Return a note to the main list | **archived**, not trashed | `isArchived: false`, `archivedAt: null` |
| `DELETE` | `/archive/:id` | `checkJwtToken` | Move an archived note to the trash | **archived**, not trashed | `deletedAt: now`, `isArchived: false`, `isPinned: false`, `archivedAt: null` |

**Translations**

| Method | Full Path | Middleware | Purpose | Translation Must Be | Sets |
|---|---|---|---|---|---|
| `GET` | `/archive/fetchTranslations` | `checkJwtToken` | List the user's archived translations | archived, not trashed | — |
| `PATCH` | `/archive/translation/:id` | `checkJwtToken` | Archive an active translation | **active** (not archived, not trashed) | `isArchived: true`, `archivedAt: now` |
| `PATCH` | `/archive/translation/:id/restore` | `checkJwtToken` | Return a translation to the main list | **archived**, not trashed | `isArchived: false`, `archivedAt: null` |
| `DELETE` | `/archive/translation/:id` | `checkJwtToken` | Move an archived translation to the trash | **archived**, not trashed | `deletedAt: now`, `isArchived: false`, `archivedAt: null` |

No route takes a request body. Everything comes from the URL (`:id`) and the token (`req.user.id`).

**Client side usage:**

| Method | Full Path | Frontend/Client side files |
|---|---|---|
| `GET` | `/archive/fetchNotes` | [ArchivedNotes.js](../client/src/components/ArchivedNotes.js) |
| `PATCH` | `/archive/:id` | [NotePanal.js](../client/src/components/NotePanal.js) (archive button) |
| `PATCH` | `/archive/:id/restore` | [ArchivedNotes.js](../client/src/components/ArchivedNotes.js) (restore button) |
| `DELETE` | `/archive/:id` | [ArchivedNotes.js](../client/src/components/ArchivedNotes.js) (move to trash button) |
| `GET` | `/archive/fetchTranslations` | [ArchivedTranslations.js](../client/src/components/ArchivedTranslations.js) |
| `PATCH` | `/archive/translation/:id` | [TranslationPanal.js](../client/src/components/TranslationPanal.js) (archive button) |
| `PATCH` | `/archive/translation/:id/restore` | [ArchivedTranslations.js](../client/src/components/ArchivedTranslations.js) (restore button) |
| `DELETE` | `/archive/translation/:id` | [ArchivedTranslations.js](../client/src/components/ArchivedTranslations.js) (move to trash button) |

---

### 1.1. GET `/archive/fetchNotes`

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
| `trashExpiredArchivedNotes(userId)` | Moves this user's notes archived more than 60 days ago to the trash first, so they never show here ([1.8](#18-the-60-day-archive-rule)) |
| `find({...})` | The user's notes that are archived **and** not in the trash |
| `.select('-__v')` | Leaves out Mongoose's internal version key. The `-` means "exclude". |
| `.populate('notebook', 'name colour')` | Replaces the notebook ObjectId with `{ _id, name, colour }`, so the UI can show a coloured notebook badge ([3.1.3](#313-notebook-schema)) |
| `.populate('tags', 'name')` | Replaces each tag ObjectId with `{ _id, name }` ([3.1.2](#312-tag-schema)) |
| `.sort({ archivedAt: -1, updatedAt: -1 })` | Most recently **archived** first. `updatedAt` breaks ties and orders older notes archived before `archivedAt` existed. |
| `.lean()` | Returns plain JS objects instead of full Mongoose documents. It's faster and uses less memory, and is fine because the data is only being sent, not modified and saved. |

The populate fields match `/notes/fetchNotes`, so **the same note card component** can display both lists. The compound index `{ user, isArchived, deletedAt, archivedAt }` in `noteSchema` covers this filter and sort.

#### Response (200)

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

### 1.2. GET `/archive/fetchTranslations`

**Purpose:** Fill the archived translations list.

```js
await trashExpiredArchivedTranslations(userId);

const translations = await Translation.find({ user: userId, isArchived: true, deletedAt: null })
    .select('-__v')
    .populate('note', 'title')
    .sort({ archivedAt: -1, updatedAt: -1 })
    .lean();
```

The same steps as [1.1](#11-get-archivefetchnotes), except:

| Step | What It Does |
|---|---|
| `.populate('note', 'title')` | Replaces the linked note ObjectId with `{ _id, title }`, like `/translation/fetch`. It stays `null` for free text that wasn't translated from a note. |

`textHash` has `select: false` in the schema, so it's never sent. The index `{ user, isArchived, deletedAt, archivedAt }` in `translationSchema` covers this query.

#### Response (200)

`{ "translations": [ ... ] }`. An empty archive returns `{ "translations": [] }`.

---

### 1.3. PATCH `/archive/:id`

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

#### Response (200)

```json
{ "message": "Note archived", "note": { "_id": "...", "title": "Old meeting notes", "isArchived": true, "archivedAt": "2026-11-13T09:00:00.000Z" } }
```

The response shows the note **after** the update ([4.3.4](#434-returning-the-updated-document)), so the frontend can use `isArchived` and `archivedAt` directly.

**404:** "Note not found or already archived". This covers: the note doesn't exist, it isn't yours, it's already archived, or it's in the trash.

---

### 1.4. PATCH `/archive/:id/restore`

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

#### Response (200)

```json
{ "message": "Note restored", "note": { "_id": "...", "title": "Old meeting notes" } }
```

**404:** "Archived note not found".

**Route matching:** `/:id/restore` doesn't clash with `/:id`. Express matches the whole path, and `/:id` matches only **one** segment, so `/abc/restore` never matches `/:id`.

---

### 1.5. DELETE `/archive/:id`

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
| `isArchived: false` | So a trash restore returns it to the main list ([1.7](#17-lifecycle)) |
| `isPinned: false` | Already false from archiving. Setting it again is a harmless safety net. |
| `archivedAt: null` | The note has left the archive, so the countdown no longer applies |

**Why `DELETE` and not `PATCH`?** From the user's point of view this *is* a delete, so the HTTP verb matches what the user is doing, even though the server only updates fields. Permanent deletion belongs in the trash routes.

#### Response (200)

```json
{ "message": "Note moved to trash", "note": { "_id": "...", "title": "Old meeting notes" } }
```

**404:** "Archived note not found". This route only trashes **archived** notes. Active notes are trashed through `DELETE /notes/:id`.

---

### 1.6. TRANSLATION ROUTES

The three translation update routes mirror the note routes, under `/archive/translation/...`. Only the differences are listed here.

| Route | Filter | Sets | Response (200) | 404 Message |
|---|---|---|---|---|
| `PATCH /archive/translation/:id` | `isArchived: { $ne: true }` | `isArchived: true`, `archivedAt: now` | `{ message: 'Translation archived', translation: { _id, sourceText, isArchived, archivedAt } }` | "Translation not found or already archived" |
| `PATCH /archive/translation/:id/restore` | `isArchived: true` | `isArchived: false`, `archivedAt: null` | `{ message: 'Translation restored', translation: { _id, sourceText } }` | "Archived translation not found" |
| `DELETE /archive/translation/:id` | `isArchived: true` | `deletedAt: now`, `isArchived: false`, `archivedAt: null` | `{ message: 'Translation moved to trash', translation: { _id, sourceText } }` | "Archived translation not found" |

All three also filter on `_id`, `user: userId` and `deletedAt: null` ([4.3.3](#433-ownership-and-state-in-a-single-filter)) and pass `{ returnDocument: 'after' }` ([4.3.4](#434-returning-the-updated-document)).

**Differences from notes:**

- Translations have no `isPinned`, so nothing is unpinned.
- The archive filter uses `isArchived: { $ne: true }` instead of `isArchived: false`. `$ne: true` also matches older translations saved before the field existed.
- The 400 message is "Invalid translation id".
- Active translations are trashed through `DELETE /translation/:id`; archived ones only through this router.

**Route matching:** `/translation/:id` has two segments and `/:id` has one, so `PATCH /archive/translation/abc` never reaches the note route. Likewise `/translation/:id/restore` (three segments) never matches `/:id/restore` (two).

---

### 1.7. LIFECYCLE

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

### 1.8. THE 60-DAY ARCHIVE RULE

An archived item is moved to the trash **60 days** (`ARCHIVE_DAYS`) after `archivedAt`. A TTL index can only delete documents, not change them, so a sweep in [archiveUtil.js](../server/util/archiveUtil.js) does the move instead ([3.2](#32-utility-functions)).

The sweep sets the same fields as the `DELETE` routes (`deletedAt: now`, `isArchived: false`, `archivedAt: null`, and `isPinned: false` for notes). Items archived before `archivedAt` existed have no date, so `updatedAt` is used for them.

**When it runs:**

- For **one user**, at the start of `GET /archive/fetchNotes`, `GET /archive/fetchTranslations` and `GET /notes/trash`. The lists are always accurate, even between hourly sweeps.
- For **every user**, on server start and then every hour (`startArchiveSweep()` in `app.js`). The hourly sweep also deletes translations whose note was purged by the notes TTL index.

Once in the trash, the `deletedAt` TTL index purges the item **30 days** later.

---

<!-- SECTION 2 -->
## 2. IMPORTS AND SETUP

```js
const express = require('express');
const mongoose = require('mongoose');// Used to validate ObjectIds
const Note = require('../models/noteSchema');
const Translation = require('../models/translationSchema');
const { checkJwtToken } = require('../middleware/securityMiddleware');
const { trashExpiredArchivedNotes, trashExpiredArchivedTranslations } = require('../util/archiveUtil');
const router = express.Router();
```

`.env` is loaded once at the top of `app.js`, so this file doesn't call `dotenv` itself.

| Import | Used For |
|---|---|
| `express` | Creates the `router` |
| `mongoose` | Only `mongoose.Types.ObjectId.isValid()`, to check `:id` |
| `Note` | The Mongoose model for notes |
| `Translation` | The Mongoose model for translations |
| `checkJwtToken` | Verifies the JWT cookie and sets `req.user` |
| `trashExpiredArchived*` | The per-user 60-day sweep run before each GET ([1.8](#18-the-60-day-archive-rule)) |

---

<!-- SECTION 3: SCHEMAS AND UTILITY FUNCTIONS -->
## 3. SCHEMAS AND UTILITY FUNCTIONS

### 3.1. SCHEMAS

#### 3.1.1. NOTE SCHEMA

Defined in [noteSchema.js](../server/models/noteSchema.js). The fields this router reads or changes:

| Field | Type | Used By |
|---|---|---|
| `user` | ObjectId → User, required, indexed | Every route (ownership filter) |
| `isArchived` | Boolean, default `false` | Every note route (filter), PATCH and DELETE (set) |
| `archivedAt` | Date, default `null` | GET (sort), PATCH, restore and DELETE (set), the 60-day sweep |
| `deletedAt` | Date, default `null` | Every note route (filter), DELETE (set), the TTL purge |
| `isPinned` | Boolean, default `false` | PATCH and DELETE (cleared) |
| `notebook` | ObjectId → Notebook, default `null` | GET (populated) |
| `tags` | `[ObjectId]` → Tag | GET (populated) |
| `title` | String | PATCH, restore, DELETE (returned) |

**Indexes used by the archive**

| Index | Used For |
|---|---|
| `{ user: 1, isArchived: 1, deletedAt: 1, archivedAt: -1 }` | `GET /archive/fetchNotes` filter and sort |
| `{ isArchived: 1, archivedAt: 1 }` | The 60-day sweep |
| `{ deletedAt: 1 }`, TTL `THIRTY_DAYS_IN_SECONDS` | Purges trashed notes 30 days after `deletedAt` |

**Hooks**

| Hook | Effect here |
|---|---|
| `pre('findOneAndUpdate')` | Sets `runValidators: true` and `returnDocument: 'after'` on every note update, so the note routes return the **updated** note ([4.3.4](#434-returning-the-updated-document)) |
| `toJSON` transform | Removes `__v` |

#### 3.1.2. TAG SCHEMA

Defined in [tagSchema.js](../server/models/tagSchema.js). This router only reads tags, through `.populate('tags', 'name')` in `GET /fetchNotes`.

| Field | Used For |
|---|---|
| `name` | String, stored lowercase. Shown as the tag chips on each archived note. |

See [TAG_ROUTES.md](TAG_ROUTES.md) for the full schema.

#### 3.1.3. NOTEBOOK SCHEMA

Defined in [notebookSchema.js](../server/models/notebookSchema.js). This router only reads notebooks, through `.populate('notebook', 'name colour')` in `GET /fetchNotes`.

| Field | Used For |
|---|---|
| `name` | The notebook badge text |
| `colour` | The notebook badge colour (a hex code) |

A note with no notebook (or whose notebook was deleted) gets `notebook: null`. See [NOTEBOOK_ROUTES.md](NOTEBOOK_ROUTES.md) for the full schema.

#### 3.1.4. TRANSLATION SCHEMA

Defined in [translationSchema.js](../server/models/translationSchema.js). The fields this router reads or changes:

| Field | Type | Used By |
|---|---|---|
| `user` | ObjectId → User, required, indexed | Every route (ownership filter) |
| `isArchived` | Boolean, default `false` | Every translation route (filter), PATCH and DELETE (set) |
| `archivedAt` | Date, default `null` | GET (sort), PATCH, restore and DELETE (set), the 60-day sweep |
| `deletedAt` | Date, default `null` | Every translation route (filter), DELETE (set), the TTL purge |
| `note` | ObjectId → Note, default `null` | GET (populated with `title`) |
| `sourceText` | String | PATCH, restore, DELETE (returned) |
| `textHash` | String, `select: false` | Never sent: hidden by `select: false` and the `toJSON` transform |

**Indexes used by the archive:** the same three as notes: `{ user, isArchived, deletedAt, archivedAt }`, `{ isArchived, archivedAt }`, and the 30-day TTL on `deletedAt`.

Unlike `noteSchema`, it has **no** `pre('findOneAndUpdate')` hook, so the translation routes pass `{ returnDocument: 'after' }` themselves.

### 3.2. UTILITY FUNCTIONS

All in [archiveUtil.js](../server/util/archiveUtil.js), using `ARCHIVE_RETENTION_MS` (60 days) from [schemaUtil.js](../server/util/schemaUtil.js).

| Function | Used By | What it does |
|---|---|---|
| `trashExpiredArchivedNotes(userId?)` | `GET /fetchNotes`, `GET /notes/trash`, the hourly sweep | Moves expired archived notes to the trash (also clears `isPinned`) |
| `trashExpiredArchivedTranslations(userId?)` | `GET /fetchTranslations`, the hourly sweep | Moves expired archived translations to the trash |
| `removeOrphanedTranslations()` | The hourly sweep | Deletes translations whose note was purged by the notes TTL index |
| `startArchiveSweep()` | `app.js` | Runs all three for every user on start, then every hour. Errors are logged, never thrown. |

Both `trashExpired*` functions call one shared helper:

```js
const trashExpired = async (Model, extraSet, userId) => {
    const cutoff = new Date(Date.now() - ARCHIVE_RETENTION_MS);
    const filter = {
        isArchived: true,
        deletedAt: null,
        $or: [
            { archivedAt: { $lte: cutoff } },
            { archivedAt: null, updatedAt: { $lte: cutoff } }// Archived before archivedAt existed
        ]
    };
    if (userId) filter.user = new mongoose.Types.ObjectId(userId);

    // Same end state as the archive DELETE routes, so a trash restore returns it to the main list
    const result = await Model.updateMany(filter, {
        $set: { deletedAt: new Date(), isArchived: false, archivedAt: null, ...extraSet }
    });
    return result.modifiedCount;
};
```

| Detail | Why |
|---|---|
| `userId` is optional | With it, only that user's items are swept (before a GET). Without it, every user's are (the hourly sweep). |
| `extraSet` | Lets notes also clear `isPinned`; translations pass `{}` |
| One `updateMany` | Moves every expired item in a single database operation |

---

<!-- SECTION 4: ROUTER SECURITY -->
## 4. SECURITY

### 4.1. PACKAGES

| Package | Where | Security role |
|---|---|---|
| `jsonwebtoken` | `securityMiddleware.js` | Verifies the session JWT in `checkJwtToken` |
| `cookie-parser` | `app.js` | Reads the HTTP-only `token` cookie into `req.cookies` |
| `helmet` | `app.js` | Sets secure HTTP response headers for every route |

### 4.2. MIDDLEWARE

| Middleware | File | Routes | What it does |
|---|---|---|---|
| `checkJwtToken` | [securityMiddleware.js](../server/middleware/securityMiddleware.js) | All | **401** if the cookie is missing, the token is invalid or expired, the user no longer exists, or the session was signed out (`tokenVersion` changed). Sets `req.user`. |

These routes have **no rate limiter**. They only touch the user's own documents in MongoDB.

### 4.3. PATTERNS SHARED BY EVERY ROUTE

All eight routes use the same building blocks, so they're explained once here.

#### 4.3.1. The user ID comes from the token

```js
const userId = req.user.id;
```

`checkJwtToken` decodes the cookie and attaches the payload to `req.user`. Taking the user ID from the token (never from the body or the URL) means a user can only ever touch **their own** items.

#### 4.3.2. ObjectId validation (guard clause)

```js
if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid note id' });
}
```

If `:id` is something like `abc`, Mongoose can't convert it to an ObjectId and throws a `CastError`, which would land in the `catch` as a **500**. This check turns that into a proper **400 Bad Request**.

`isValid()` also accepts **any 12-character string** (e.g. `"aaaaaaaaaaaa"`), because those can be converted to an ObjectId. That's harmless: the query just finds nothing and returns 404.

#### 4.3.3. Ownership and state in a single filter

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

#### 4.3.4. Returning the updated document

By default, `findOneAndUpdate` returns the document **as it was before** the update. Every update route here returns it **after** the update:

- **Notes:** `noteSchema`'s `pre('findOneAndUpdate')` hook sets `returnDocument: 'after'` (and `runValidators`) for every note update, so the routes don't pass it themselves.
- **Translations:** `translationSchema` has no such hook, so each translation update route passes `{ returnDocument: 'after' }` itself.

`returnDocument: 'after'` is used instead of `{ new: true }`, which Mongoose 9 deprecates.

#### 4.3.5. Small projections

```js
.select('_id title')
```

The response only needs enough for the UI to confirm the action (e.g. a toast saying "'Shopping list' archived"), so the content, tags and so on aren't sent back. Translations return `_id` and `sourceText`.

#### 4.3.6. Consistent error handling

Every route follows the same pattern:

```
invalid id ──► 400
no match ────► 404
success ─────► 200 { message, note | translation }
exception ───► 500 { message: 'Internal Server Error' }
```

Internal error details are never sent to the client. The logs use `[SUCCESS/ERROR: archiveRoutes.js, <METHOD> <path>]`, so you can grep by route.

---

<!-- SECTION 5 -->
## 5. STATUS CODE REFERENCES

| Code | Route(s) | When |
|---|---|---|
| `200` | all | Success (including an empty archive list) |
| `400` | all with `:id` | `:id` isn't a valid ObjectId |
| `401` | all | (From `checkJwtToken`) No token, or an invalid, expired or signed-out one |
| `404` | PATCH `/:id`, PATCH `/translation/:id` | Not found, not yours, already archived, or in the trash |
| `404` | restore, DELETE (notes and translations) | Not found, not yours, not archived, or in the trash |
| `500` | all | Unexpected server or database error (for the GETs, this includes a failed 60-day sweep) |

---

<!-- SECTION 6 -->
## 6. KNOWN GAPS AND HOUSE KEEPING

### 6.1. GAPS

These gaps were found in an earlier review and have now been fixed.

| Gap | Fix | Where |
|---|---|---|
| 1. `findOneAndUpdate` returned the old document, so `PATCH /archive/:id` answered `isArchived: false` | Notes: `noteSchema`'s `findOneAndUpdate` hook sets `returnDocument: 'after'`, so every note update returns the new document. Translations: all three update routes pass `{ returnDocument: 'after' }`. The translation archive route used `{ new: true }`, which Mongoose 9 deprecates. | `noteSchema.js`, `archiveRoutes.js` translation routes |
| 2. "Most recently archived" really meant "most recently updated" | Added `archivedAt`, set on archive and cleared on restore/trash. Both lists sort by `{ archivedAt: -1, updatedAt: -1 }`. `archivedAt` also drives the 60-day rule. | `noteSchema.js`, `translationSchema.js`, `archiveRoutes.js` |
| 5. No index for the list query | Added `{ user: 1, isArchived: 1, deletedAt: 1, archivedAt: -1 }` to `noteSchema`, matching the one `translationSchema` already had | `noteSchema.js` |

**Still open:**

| Item | Notes |
|---|---|
| 3. One 404 message covers several cases | By design ([4.3.3](#433-ownership-and-state-in-a-single-filter)). The UI only shows each button on items in the right state, so a 404 normally means another tab already acted, and the list refreshes. Friendlier messages would need a second lookup after a miss, which must still filter by `user: userId`. |
| 4. Route order (future-proofing) | `GET /fetchNotes` and `GET /fetchTranslations` are the only GETs, so nothing clashes. If you add `GET /:id`, it must go **after** them, otherwise Express treats `fetchNotes` as an `:id` and the ObjectId check returns 400. |
| A failed sweep fails the GET | The per-user sweep runs inside the GET's `try`, so if it throws, the archive list returns 500 instead of the (possibly slightly stale) list. The hourly sweep would still catch up. Wrapping it in its own `try/catch` that only logs would keep the list available; it's left as is because a DB error during the sweep usually means the `find` would fail too. |

### 6.2. HOUSE KEEPING

**Done:**

| Issue | What changed |
|---|---|
| Unused `dotenv` import | Removed (`app.js` loads it) |
| Three overlapping comments above `PATCH /:id` | Now one block comment |
| Comments said "Conditional rendering" | Changed to "Guard clause" |
| Response comments | Now mention the returned note |
| DELETE section header said "remove an item from the database" | Now says the routes move items to the trash (soft delete) |
| Missing semicolons and trailing whitespace | Added after the `Translation` import and `express.Router()`; whitespace removed from the `PATCH /translation/:id` comment |

**Still to do:**

| Issue | Where | Change |
|---|---|---|
| Note and translation routes are interleaved within each verb section | `archiveRoutes.js` | Group the note routes and the translation routes. It doesn't affect matching ([1.6](#16-translation-routes)), but makes the file easier to scan. |
| Missing semicolons after each route's closing `})` | `archiveRoutes.js`: all eight `router.get` / `router.patch` / `router.delete` calls | Add `;` |

---

<!-- SECTION 7: REFERENCES -->
## 7. REFERENCES

**Project files**

- [archiveRoutes.js](../server/routes/archiveRoutes.js)
- [noteSchema.js](../server/models/noteSchema.js), [translationSchema.js](../server/models/translationSchema.js), [tagSchema.js](../server/models/tagSchema.js), [notebookSchema.js](../server/models/notebookSchema.js)
- [archiveUtil.js](../server/util/archiveUtil.js), [schemaUtil.js](../server/util/schemaUtil.js), [securityMiddleware.js](../server/middleware/securityMiddleware.js)
- [ArchivedNotes.js](../client/src/components/ArchivedNotes.js), [ArchivedTranslations.js](../client/src/components/ArchivedTranslations.js), [NotePanal.js](../client/src/components/NotePanal.js), [TranslationPanal.js](../client/src/components/TranslationPanal.js)
- [NOTE_ROUTES.md](NOTE_ROUTES.md), [TRANSLATION_ROUTES.md](TRANSLATION_ROUTES.md), [TAG_ROUTES.md](TAG_ROUTES.md), [NOTEBOOK_ROUTES.md](NOTEBOOK_ROUTES.md), [GLOSSARY.md](../GLOSSARY.md)

**External documentation**

- [Express: Routing](https://expressjs.com/en/guide/routing.html)
- [Mongoose: Queries](https://mongoosejs.com/docs/queries.html)
- [Mongoose: `findOneAndUpdate()`](https://mongoosejs.com/docs/tutorials/findoneandupdate.html)
- [Mongoose: Populate](https://mongoosejs.com/docs/populate.html)
- [Mongoose: Middleware (hooks)](https://mongoosejs.com/docs/middleware.html)
- [Mongoose: Lean](https://mongoosejs.com/docs/tutorials/lean.html)
- [MongoDB. sort](https://www.mongodb.com/docs/drivers/rust/current/crud/query/specify-documents/#sort)
- [MongoDB: TTL Indexes](https://www.mongodb.com/docs/manual/core/index-ttl/)
- [MongoDB: Compound Indexes](https://www.mongodb.com/docs/manual/core/indexes/index-types/index-compound/)
- [MDN: HTTP response status codes](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status)
