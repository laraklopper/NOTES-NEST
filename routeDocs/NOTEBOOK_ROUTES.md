# NOTEBOOK_ROUTES — [`notebookRoutes.js`](../server/routes/notebookRoutes.js) BREAKDOWN

[`notebookRoutes.js`](../server/routes/notebookRoutes.js) is the Express router for **notebooks**, the coloured folders that group notes. Users can list their notebooks (with how many notes each holds), create, rename or recolour them, and delete them. Deleting a notebook **never deletes its notes**. They move to "No notebook".

The relationship is **one-to-many by reference**: a note stores its notebook's ID, and the notebook knows nothing about its notes.

```
Notebook { _id, user, name, colour }
    ▲
    │ note.notebook = notebook._id   (or null = "No notebook")
    │
Note { _id, user, notebook, ... }
```

---

## TABLE OF CONTENTS
1. [ROUTE SUMMARY](#1-route-summary)
     - [1.1. GET `/notebooks`](#11-get-notebooks)
     - [1.2. POST `/notebooks`](#12-post-notebooks)
     - [1.3. PATCH `/notebooks/:id`](#13-patch-notebooksid)
     - [1.4. DELETE `/notebooks/:id`](#14-delete-notebooksid)
2. [HOW OTHER ROUTERS USE NOTEBOOKS](#2-how-other-routers-use-notebooks)
3. [IMPORTS AND SETUP](#3-imports-and-setup)
4. [SCHEMAS AND UTILITY FUNCTIONS](#4-schemas-and-utility-functions)
     - [4.1. SCHEMAS](#41-schemas)
          - [4.1.1. NOTEBOOK SCHEMA](#411-notebook-schema)
          - [4.1.2. NOTE SCHEMA](#412-note-schema)
     - [4.2. UTILITY FUNCTIONS](#42-utility-functions)
          - [4.2.1. `notebookSaveError()`](#421-notebooksaveerror)
5. [SECURITY](#5-security)
     - [5.1. PACKAGES](#51-packages)
     - [5.2. MIDDLEWARE](#52-middleware)
     - [5.3. PATTERNS SHARED BY EVERY ROUTE](#53-patterns-shared-by-every-route)
6. [STATUS CODE REFERENCES](#6-status-code-references)
7. [KNOWN GAPS AND HOUSE KEEPING](#7-known-gaps-and-house-keeping)
     - [7.1. GAPS](#71-gaps)
     - [7.2. HOUSE KEEPING](#72-house-keeping)
8. [REFERENCES](#8-references)

- *View [GLOSSARY.md](../GLOSSARY.md) for terminology*

---

<!-- SECTION 1 -->
## 1. ROUTE SUMMARY

The router is mounted at **`/notebooks`** in `app.js`. Every route requires a valid JWT (`checkJwtToken`).

| Method | Full Path | Middleware | Purpose |
|---|---|---|---|
| `GET` | `/notebooks` | `checkJwtToken` | List the user's notebooks A–Z (ignoring case), each with a count of active notes |
| `POST` | `/notebooks` | `checkJwtToken` | Create a notebook |
| `PATCH` | `/notebooks/:id` | `checkJwtToken` | Rename and/or recolour a notebook |
| `DELETE` | `/notebooks/:id` | `checkJwtToken` | Delete a notebook; its notes move to "No notebook" |

This is a **RESTful** layout: one resource path (`/notebooks`), with the HTTP method saying what happens.

Notebook names are **unique per user, ignoring case**: a user can't have both `Work` and `work` (409).

**Client side usage:**

| Method | Full Path | Frontend/Client side files |
|---|---|---|
| `GET` | `/notebooks` | [Notes.js](../client/src/pages/Notes.js) (passes the notebooks to [NoteBookList.js](../client/src/components/NoteBookList.js), [FilterNotes.js](../client/src/components/FilterNotes.js) and [EditNoteForm.js](../client/src/components/EditNoteForm.js)), [NotePad.js](../client/src/pages/NotePad.js) |
| `POST` | `/notebooks` | [NotePad.js](../client/src/pages/NotePad.js) (`addNotebook`, called by the [AddNoteBook.js](../client/src/components/AddNoteBook.js) form) |
| `PATCH` | `/notebooks/:id` | [NoteBookList.js](../client/src/components/NoteBookList.js) (edit) |
| `DELETE` | `/notebooks/:id` | [NoteBookList.js](../client/src/components/NoteBookList.js) (delete) |

---

### 1.1. GET `/notebooks`

**Purpose:** Fill the notebook sidebar, the notebook dropdowns, and the notebook filter, each with a note count.

#### Step 1: Fetch the notebooks and the counts **in parallel**

```js
const [notebooks, counts] = await Promise.all([
    Notebook.find({ user: userId })
        .select('-__v')
        .collation(NAME_COLLATION)
        .sort({ name: 1 })
        .lean(),
    Note.aggregate([
        { $match: { user: new mongoose.Types.ObjectId(userId), isArchived: false, deletedAt: null, notebook: { $ne: null } } },
        { $group: { _id: '$notebook', count: { $sum: 1 } } }
    ])
]);
```

The two queries don't depend on each other, so `Promise.all` runs them at the same time. The route waits for the slower one, not both added together.

| Detail | Why |
|---|---|
| `.collation(NAME_COLLATION)` | Sorts A–Z the way people read, ignoring case (see below). It matches the unique index's collation, so MongoDB can use that index for the sort. |
| `.lean()` | Returns plain objects instead of Mongoose documents. Faster, and no `toJSON()` is needed before spreading them. |
| `.select('-__v')` | `lean()` skips the schema's `toJSON` transform, so the version key is left out here instead |

**Why the collation?** Without it, `.sort({ name: 1 })` sorts by **character code**, and every uppercase letter comes before every lowercase one:

```
Without:  "Personal", "Work", "ideas", "recipes"
With:     "ideas", "Personal", "recipes", "Work"
```

`strength: 2` means "compare letters and accents, but not case".

#### Step 2: The aggregation counts notes per notebook in **one** query

An **aggregation pipeline** processes documents in stages, like an assembly line:

| Stage | Does | Output |
|---|---|---|
| `$match` | Keeps only this user's **active** notes that **have** a notebook | The filtered notes |
| `$group` | Groups them by `notebook` and adds 1 per note | `[{ _id: notebookId, count: 7 }, ...]` |

**Example:**

```
Notes:  [nb=A] [nb=A] [nb=B] [nb=null] [nb=A, archived]
$match → [nb=A] [nb=A] [nb=B]
$group → [{ _id: A, count: 2 }, { _id: B, count: 1 }]
```

**Why `new mongoose.Types.ObjectId(userId)`?** `find()` **casts** strings to ObjectIds automatically using the schema. **`aggregate()` doesn't.** The pipeline is sent to MongoDB as is. `req.user.id` from the JWT is a **string**, and in MongoDB the string `"6732..."` ≠ `ObjectId("6732...")`, so without the conversion `$match` would match **nothing** and every count would be 0.

**Why one aggregation and not one count per notebook?** With 10 notebooks, separate `countDocuments()` calls would be **10 database round trips** (the "N+1 query" problem). The aggregation is **always 1**, however many notebooks there are.

#### Step 3: Merge the counts into the notebooks

```js
const countMap = new Map(counts.map((c) => [c._id.toString(), c.count]));// notebookId -> count

const notebooksWithCounts = notebooks.map((notebook) => ({
    ...notebook,
    noteCount: countMap.get(notebook._id.toString()) || 0// Empty notebooks aren't in counts
}));
```

| Detail | Why |
|---|---|
| `Map` | A fast lookup by ID, rather than searching the `counts` array for every notebook |
| `.toString()` on both sides | ObjectIds are **objects**, so two ObjectIds with the same value are **not** `===`. Converting both to strings makes them comparable as `Map` keys. |
| `...notebook` | The notebooks are already plain objects (`lean()`), so spreading copies only the data |
| `\|\| 0` | An empty notebook has no group in the aggregation, so `get()` returns `undefined` |

#### Response (200)

```json
{
  "notebooks": [
    { "_id": "6732...", "user": "6731...", "name": "ideas", "colour": "#059669", "noteCount": 2, "createdAt": "...", "updatedAt": "..." },
    { "_id": "6733...", "user": "6731...", "name": "Personal", "colour": "#E11D48", "noteCount": 4, "createdAt": "...", "updatedAt": "..." },
    { "_id": "6734...", "user": "6731...", "name": "Work", "colour": "#1F4E79", "noteCount": 0, "createdAt": "...", "updatedAt": "..." }
  ]
}
```

`noteCount` counts **active notes only**, so it matches what the user sees in the Notes list when filtering by that notebook.

---

### 1.2. POST `/notebooks`

**Purpose:** Create a notebook from the AddNoteBook form on the NotePad page.

#### Request body

```json
{ "name": "Work", "colour": "#4F46E5" }
```

| Field | Required | Rules |
|---|---|---|
| `name` | ✅ | A non-empty string, up to 80 characters. It must be unique among **this user's** notebooks, ignoring case. |
| `colour` | ❌ | A hex code string. `null`, `''` or missing → the default `#1F4E79`. |

#### Validation

```js
if (typeof name !== 'string' || !name.trim()) → 400 "Notebook name is required"
if (colour !== undefined && colour !== null && typeof colour !== 'string') → 400
```

The string check blocks `{ "name": { "$gt": "" } }`-style injection. The **format** of the hex colour is left to the schema's `hexColourRegex`.

#### Create

```js
const newNotebook = await Notebook.create({
    user: userId,// From the token, never the body
    name,// The schema trims it
    colour: colour?.trim() || undefined// Blank → undefined → schema default
});
```

| Detail | Why |
|---|---|
| `colour?.trim()` | `?.` handles `null` / `undefined` without crashing |
| `\|\| undefined` | Mongoose applies a default **only** for `undefined`. `''` or `null` would be saved as is, or fail the regex. |
| Named fields only | Protects against **mass assignment**: the client can't set `user` to someone else's ID |

#### Response (201)

```json
{ "message": "Notebook saved successfully", "notebook": { "_id": "...", "user": "...", "name": "Work", "colour": "#4F46E5", "createdAt": "...", "updatedAt": "..." } }
```

#### Errors

`400` (validation), `409` (duplicate name, including a different case like `work`), `500`. See [`notebookSaveError()`](#421-notebooksaveerror).

---

### 1.3. PATCH `/notebooks/:id`

**Purpose:** Rename and/or recolour a notebook. **Only the fields that are sent change.**

#### Request body (one or both)

```json
{ "name": "Work 2026" }
{ "colour": "#059669" }
{ "colour": "" }
{ "name": "Work 2026", "colour": "#059669" }
```

#### Building the update

```js
if ((name !== undefined && typeof name !== 'string') ||
    (colour !== undefined && colour !== null && typeof colour !== 'string')) → 400 "Invalid notebook details"

const updates = {};
if (name !== undefined) {
    if (!name.trim()) → 400 "Notebook name is required"// Can't rename to blank
    updates.name = name.trim();
}
if (colour !== undefined) {
    updates.colour = colour?.trim() || DEFAULT_NOTEBOOK_COLOUR;// Blank or null resets to the default
}
if (Object.keys(updates).length === 0) → 400 "No changes were sent"
```

| `colour` sent | Result |
|---|---|
| Missing | Colour unchanged |
| A hex code | New colour (checked by the schema's regex) |
| `''` or `null` | **Reset** to the default `#1F4E79` |
| Anything else (number, object) | 400 |

POST and PATCH treat a blank or `null` colour the same way: both give the default colour.

#### The update

```js
const notebook = await Notebook.findOneAndUpdate(
    { _id: id, user: userId },// Ownership in the filter
    { $set: updates },
    { returnDocument: 'after', runValidators: true }
);
```

| Option | Why |
|---|---|
| `{ _id: id, user: userId }` | Another user's notebook returns **404**, not 403, so IDs can't be probed |
| `$set` | Only the sent fields change |
| `returnDocument: 'after'` | Returns the **updated** notebook. The default would be the old one. (`new: true` is deprecated in Mongoose 9.) |
| `runValidators: true` | **Update queries skip schema validators by default.** Without this, an invalid colour like `"blue"` would be saved. |

A rename to an existing name (in any case) hits the unique index → `11000` → **409** through [`notebookSaveError()`](#421-notebooksaveerror). Changing only the case of the notebook's **own** name (`work` → `Work`) is allowed, because it's the same document.

Renaming a notebook **doesn't** touch any notes, because notes store the notebook's **ID**, not its name. Every note in it shows the new name straight away through `populate`.

#### Response (200)

`{ "message": "Notebook updated successfully", "notebook": { ...updated } }`

---

### 1.4. DELETE `/notebooks/:id`

**Purpose:** Delete a notebook **without losing its notes**, and say how many notes moved.

```js
const movedNotes = await Note.countDocuments({ notebook: id, user: userId });
const notebook = await Notebook.findOneAndDelete({ _id: id, user: userId });
```

The route counts the notes, then deletes the notebook. The **schema hook** ([4.1.1](#411-notebook-schema)) moves the notes:

```
DELETE /notebooks/:id
      │
      ├─► Note.countDocuments({ notebook: id, user })   → movedNotes
      │
      ▼
Notebook.findOneAndDelete({ _id, user })
      │
      ├─► notebookSchema post('findOneAndDelete') hook
      │       Note.updateMany({ notebook: id }, { $set: { notebook: null } }, { timestamps: false })
      │       → every note in it (active, archived and trashed) moves to "No notebook"
      ▼
200 { message, notebook: { _id, name }, movedNotes }
```

| Detail | Why |
|---|---|
| Count **before** deleting | Once the hook has run, the notes no longer point at the notebook, so they can't be counted afterwards. The count covers the same notes the hook moves (active, archived and trashed). |
| A hook, not code in the route | Putting the cleanup **next to the model** means any code that deletes a notebook with `findOneAndDelete` (or `findByIdAndDelete`, which calls it) gets the cleanup automatically |

If the notebook isn't found (or isn't the user's), the count is simply `0` and the route returns 404, so nothing leaks.

#### Response (200)

```json
{ "message": "Notebook deleted", "notebook": { "_id": "6733...", "name": "Work" }, "movedNotes": 7 }
```

`NoteBookList.js` uses `movedNotes` in its confirmation: `Notebook "Work" successfully deleted. 7 notes were moved to "No notebook".`

---

<!-- SECTION 2 -->
## 2. HOW OTHER ROUTERS USE NOTEBOOKS

| Router | Uses |
|---|---|
| `noteRoutes.js` | `checkNotebook()`: before a note is put into a notebook, it checks that the notebook **exists and belongs to the user** |
| `noteRoutes.js`, `archiveRoutes.js` | `.populate('notebook', 'name colour')`, so notes show the notebook name and colour badge |
| `noteRoutes.js` | `GET /fetchNotes?notebook=<id>` filters notes by notebook |
| `exportRoutes.js` | The "Notebook" column, and the `notebook` export filter |
| `userRoutes.js` | Admin user removal deletes the user's notebooks with `deleteMany`, together with all their notes |

---

<!-- SECTION 3 -->
## 3. IMPORTS AND SETUP

```js
const express = require('express');
const mongoose = require('mongoose');// Used to validate ObjectIds and cast the user id for aggregate()
const Notebook = require('../models/notebookSchema');
const Note = require('../models/noteSchema');
const { checkJwtToken } = require('../middleware/securityMiddleware');
const { DEFAULT_NOTEBOOK_COLOUR, NAME_COLLATION } = require('../util/schemaUtil');
const router = express.Router();
```

`.env` is loaded once at the top of `app.js`, so this file doesn't call `dotenv` itself.

| Import | Used For |
|---|---|
| `express` | Creates the `router` |
| `mongoose` | `ObjectId.isValid()` for `:id`, and `new ObjectId(userId)` in the aggregation |
| `Notebook` | The model this router manages |
| `Note` | Counting notes per notebook in `GET /`, and the moved-notes count in `DELETE /:id` |
| `checkJwtToken` | Auth on every route; sets `req.user.id` |
| `DEFAULT_NOTEBOOK_COLOUR` | `'#1F4E79'`. PATCH resets to it on a blank colour. The schema default uses the same constant. |
| `NAME_COLLATION` | `{ locale: 'en', strength: 2 }`. Case-insensitive sorting in `GET /`. The unique index uses the same collation. |

---

<!-- SECTION 4: SCHEMAS AND UTILITY FUNCTIONS -->
## 4. SCHEMAS AND UTILITY FUNCTIONS

### 4.1. SCHEMAS

#### 4.1.1. NOTEBOOK SCHEMA

Defined in [notebookSchema.js](../server/models/notebookSchema.js):

| Field | Type | Set By |
|---|---|---|
| `user` | ObjectId → User, required, indexed | The route (from the token) |
| `name` | String, required, `trim`, max 80 characters | The client (`POST /`, `PATCH /:id`) |
| `colour` | String, `default: DEFAULT_NOTEBOOK_COLOUR`, must match `hexColourRegex` (`#1F4E79` or `#fff`) | The client, or the default |
| `createdAt` / `updatedAt` | Date | `timestamps: true` |

**Indexes**

| Index | Used For |
|---|---|
| `{ user: 1, name: 1 }`, **unique**, with `NAME_COLLATION`, named `user_1_name_1_ci` | One notebook name per user, ignoring case (the **409** error), and the case-insensitive A–Z sort in `GET /` |

**Hooks**

| Hook | Runs On | What it does |
|---|---|---|
| `post('findOneAndDelete')` | `DELETE /notebooks/:id` | Sets `notebook: null` on every note in the deleted notebook |
| `toJSON` transform | `res.json()` with a document | Removes `__v` |

```js
notebookSchema.post('findOneAndDelete', async function (notebook) {
  if (!notebook) return;// Nothing was deleted
  await mongoose.model('Note').updateMany(
    { notebook: notebook._id },
    { $set: { notebook: null } },// Move notes to "No notebook"
    { timestamps: false }// Moving a note isn't an edit, so keep its updatedAt (and list order)
  );
});
```

`{ timestamps: false }` stops every moved note from getting a new `updatedAt` and jumping to the top of the Notes list. `mongoose.model('Note')` is looked up at call time, which avoids a circular `require` between the two schema files.

#### 4.1.2. NOTE SCHEMA

Defined in [noteSchema.js](../server/models/noteSchema.js). This router only **reads** notes (to count them); the notebook hook is what changes them. The fields involved:

| Field | Used By | Why |
|---|---|---|
| `notebook` | `GET /`, `DELETE /:id`, the notebook hook | `ObjectId` with `ref: 'Notebook'`, `default: null` (`null` = "No notebook"). Grouped for the count, set to `null` on delete. |
| `user` | `GET /`, `DELETE /:id` | Only the user's own notes are counted |
| `isArchived`, `deletedAt` | `GET /` | Only **active** notes are counted |
| `updatedAt` | The notebook hook | Kept unchanged by `{ timestamps: false }` |

### 4.2. UTILITY FUNCTIONS

| Function / Constant | File | Used By | What it does |
|---|---|---|---|
| `notebookSaveError(error)` | [notebookRoutes.js](../server/routes/notebookRoutes.js) | POST, PATCH | Turns a save error into `{ status, message }`, or `null` for a 500 |
| `DEFAULT_NOTEBOOK_COLOUR` | [schemaUtil.js](../server/util/schemaUtil.js) | `notebookSchema.js`, PATCH | The default colour, `#1F4E79` |
| `NAME_COLLATION` | [schemaUtil.js](../server/util/schemaUtil.js) | `notebookSchema.js` index, `GET /` | Case-insensitive compare and sort |
| `hexColourRegex` | [schemaUtil.js](../server/util/schemaUtil.js) | `notebookSchema.js` | Checks the colour is a 3- or 6-digit hex code |

#### 4.2.1. `notebookSaveError()`

```js
const notebookSaveError = (error) => {
    if (error.name === 'ValidationError') {
        const firstMessage = Object.values(error.errors)[0]?.message;
        return { status: 400, message: firstMessage || 'Invalid notebook details' };
    }
    if (error.code === 11000) {
        return { status: 409, message: 'You already have a notebook with that name' };
    }
    return null;
};
```

POST and PATCH can fail in the same two ways, so this helper turns the error into a response in **one place**. It doesn't log anything; the route logs every error once.

| Error | Comes From | Returns |
|---|---|---|
| `ValidationError` | Schema rules (missing name, bad hex colour, too long) | `400` + the first schema message |
| `code === 11000` | MongoDB's **unique index** on `{ user, name }` | `409 Conflict` |
| Anything else | A bug, or the database being down | `null`, so the route sends a **500** |

The route uses it like this:

```js
const saveError = notebookSaveError(error);
if (saveError) {
    console.error('[ERROR: notebookRoutes.js, POST /]', saveError.message);
    return res.status(saveError.status).json({ message: saveError.message });
}
return res.status(500).json({ message: 'Internal Server Error' });// Unexpected
```

**Why rely on the unique index rather than checking for duplicates first?** A "find, then create" check has a **race condition**: two quick clicks could both pass the check before either saves. A unique index is enforced by MongoDB itself, so the second insert **always** fails with `11000`.

---

<!-- SECTION 5: ROUTER SECURITY -->
## 5. SECURITY

### 5.1. PACKAGES

| Package | Where | Security role |
|---|---|---|
| `jsonwebtoken` | `securityMiddleware.js` | Verifies the session JWT in `checkJwtToken` |
| `cookie-parser` | `app.js` | Reads the HTTP-only `token` cookie into `req.cookies` |
| `helmet` | `app.js` | Sets secure HTTP response headers for every route |

### 5.2. MIDDLEWARE

| Middleware | File | Routes | What it does |
|---|---|---|---|
| `checkJwtToken` | [securityMiddleware.js](../server/middleware/securityMiddleware.js) | All | **401** if the cookie is missing, the token is invalid or expired, the user no longer exists, or the session was signed out (`tokenVersion` changed). Sets `req.user`. |

These routes have **no rate limiter**. They only touch the user's own documents in MongoDB.

### 5.3. PATTERNS SHARED BY EVERY ROUTE

| Pattern | Why |
|---|---|
| `userId` comes from `req.user.id`, never the request | A user can't create, edit or delete someone else's notebooks |
| Named fields only in `create()` / `$set` | Protects against **mass assignment**: the client can't set `user` |
| `typeof name !== 'string'` / `typeof colour !== 'string'` before using them | Blocks operator injection such as `{ "name": { "$gt": "" } }` |
| `mongoose.Types.ObjectId.isValid(id)` before querying | Turns a `CastError` (500) into a clean 400 |
| Ownership in the same filter as the ID (`{ _id, user }`) | Another user's notebook returns **404**, not 403, so IDs can't be probed |
| The unique `{ user, name }` index, not a "find then create" check | Duplicates are blocked even when two requests arrive at once |
| `runValidators: true` on PATCH | The length limit and hex colour check apply to updates too |
| `GET /` only counts the user's own notes | `$match` on `user` stops counts from leaking other users' data |
| `try / catch` → `500 "Internal Server Error"` | Internal error details aren't sent to the client |

---

<!-- SECTION 6 -->
## 6. STATUS CODE REFERENCES

| Code | Route(s) | When |
|---|---|---|
| `200` | GET, PATCH, DELETE | Success |
| `201` | POST | Notebook created |
| `400` | POST, PATCH | Missing or blank name, wrong field types, invalid hex colour, name over 80 characters, no changes sent |
| `400` | PATCH, DELETE | `:id` isn't a valid ObjectId |
| `401` | all | (From `checkJwtToken`) No token, or an invalid, expired or signed-out one |
| `404` | PATCH, DELETE | Notebook not found, or not the user's |
| `409` | POST, PATCH | The user already has a notebook with that name (ignoring case) |
| `500` | all | Unexpected error |

---

<!-- SECTION 7 -->
## 7. KNOWN GAPS AND HOUSE KEEPING

### 7.1. GAPS

These gaps were found in an earlier review and have now been fixed.

| Gap | Fix | Where |
|---|---|---|
| 1. A–Z sorting and duplicate names were case-sensitive | `GET /` sorts with `NAME_COLLATION` (`{ locale: 'en', strength: 2 }`). The unique `{ user, name }` index uses the same collation, so `Work` and `work` count as the same name (409). | `notebookRoutes.js` GET `/`, `notebookSchema.js`, `util/schemaUtil.js` |
| 2. Colour rules differed between POST and PATCH, and a colour couldn't be reset | PATCH accepts `null`, and a blank or `null` colour resets to the default. The default lives in one place, `DEFAULT_NOTEBOOK_COLOUR`, shared by the schema and the route. | `notebookRoutes.js` PATCH `/:id`, `notebookSchema.js`, `util/schemaUtil.js` |
| 4. The two queries in GET ran one after the other | They run together with `Promise.all`. The notebooks use `.lean()` (with `.select('-__v')`), so the `toJSON()` call is gone. | `notebookRoutes.js` GET `/` |
| 5. Duplicate errors were logged twice | The `console.error` is removed from `notebookSaveError`. The helper only builds the response; the route does the logging. | `notebookRoutes.js` |
| 6. DELETE didn't report how many notes moved | The route counts the notebook's notes before deleting and returns `movedNotes`. `NoteBookList.js` shows it in the confirmation. | `notebookRoutes.js` DELETE `/:id`, `NoteBookList.js` |

**One-time database step for Gap 1**

The new index is named `user_1_name_1_ci`, so it doesn't clash with the old case-sensitive `user_1_name_1` index. MongoDB builds it on the next server start. After that:

1. **Drop the old `user_1_name_1` index** (in Atlas or Compass, or with `Notebook.syncIndexes()`). Both indexes are unique, so nothing breaks while both exist; the old one is just redundant.
2. **If the new index fails to build**, a user already has two notebooks whose names differ only by case (e.g. `Work` and `work`). Mongoose logs the index error at startup. Rename or merge one of them, then restart the server.

**Still open:**

| Item | Notes |
|---|---|
| 3. The cleanup only runs for `findOneAndDelete` | Mongoose query hooks are tied to a **specific method**, so `deleteOne` and `deleteMany` don't move the notes. Today the only other place that deletes notebooks is admin user removal in `userRoutes.js`, and it deletes all of the user's notes at the same time, so no notes are left pointing at a deleted notebook. If notebooks are ever deleted with `deleteOne` / `deleteMany` elsewhere, add matching hooks (as `tagSchema.js` does) or use `findOneAndDelete`. Even then it fails gracefully: `populate` returns `null` for a missing notebook, and the frontend and export already handle it (`n.notebook?.name \|\| ''`). |
| The moved-notes count isn't atomic | A note added to the notebook between the count and the delete would be moved but not counted. That only affects the number in the message, never the notes themselves. |

### 7.2. HOUSE KEEPING

**Done:**

| Issue | What changed |
|---|---|
| Unused `dotenv` import | Removed (`app.js` loads it) |
| `mongoose` import had no comment | Now says what it's used for |
| GET section header mentioned a provider | Now says "from the database" |
| Header block | Mentions that names are unique per user, ignoring case (409) |
| Comments said "Conditional rendering" | Changed to "Guard clause" |
| DELETE response comment | Now mentions the deleted notebook's id and name and the moved-notes count |
| Missing semicolons | Added after `express.Router()` and `notebookSaveError` |

**Still to do:**

| Issue | Where | Change |
|---|---|---|
| Missing semicolons after each route's closing `})` | `notebookRoutes.js`: `router.get`, `router.post`, `router.patch`, `router.delete` | Add `;` |

---

<!-- SECTION 8: REFERENCES -->
## 8. REFERENCES

**Project files**

- [notebookRoutes.js](../server/routes/notebookRoutes.js)
- [notebookSchema.js](../server/models/notebookSchema.js), [noteSchema.js](../server/models/noteSchema.js)
- [schemaUtil.js](../server/util/schemaUtil.js), [securityMiddleware.js](../server/middleware/securityMiddleware.js)
- [Notes.js](../client/src/pages/Notes.js), [NotePad.js](../client/src/pages/NotePad.js), [NoteBookList.js](../client/src/components/NoteBookList.js), [AddNoteBook.js](../client/src/components/AddNoteBook.js), [FilterNotes.js](../client/src/components/FilterNotes.js), [EditNoteForm.js](../client/src/components/EditNoteForm.js)
- [NOTE_ROUTES.md](NOTE_ROUTES.md), [TAG_ROUTES.md](TAG_ROUTES.md), [GLOSSARY.md](../GLOSSARY.md)

**External documentation**

- [Express: Routing](https://expressjs.com/en/guide/routing.html)
- [Mongoose: Queries](https://mongoosejs.com/docs/queries.html)
- [Mongoose: Populate](https://mongoosejs.com/docs/populate.html)
- [Mongoose: Middleware (hooks)](https://mongoosejs.com/docs/middleware.html)
- [Mongoose: Validation (update validators)](https://mongoosejs.com/docs/validation.html#update-validators)
- [MongoDB: Aggregation Pipeline](https://www.mongodb.com/docs/manual/core/aggregation-pipeline/)
- [MongoDB: Collation](https://www.mongodb.com/docs/manual/reference/collation/)
- [MongoDB: Unique Indexes](https://www.mongodb.com/docs/manual/core/index-unique/)
- [MDN: `Promise.all()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all)
- [MDN: HTTP response status codes](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status)
