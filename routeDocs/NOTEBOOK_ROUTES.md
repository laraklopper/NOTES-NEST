# NOTEBOOK_ROUTES.md — `notebookRoutes.js` Breakdown

`notebookRoutes.js` is the Express router for **notebooks**, the coloured folders that group notes. Users can list their notebooks (with how many notes each holds), create, rename or recolour them, and delete them. Deleting a notebook **never deletes its notes**. They move to "No notebook".

The relationship is **one-to-many by reference**: a note stores its notebook's ID, and the notebook knows nothing about its notes.

```
Notebook { _id, user, name, colour }
    ▲
    │ note.notebook = notebook._id   (or null = "No notebook")
    │
Note { _id, user, notebook, ... }
```

---

## Table of Contents

1. [Route Summary](#1-route-summary)
2. [Imports & Setup](#2-imports--setup)
3. [notebookSaveError() Helper](#3-notebooksaveerror-helper)
4. [GET /notebooks](#4-get-notebooks)
5. [POST /notebooks](#5-post-notebooks)
6. [PATCH /notebooks/:id](#6-patch-notebooksid)
7. [DELETE /notebooks/:id](#7-delete-notebooksid)
8. [How Other Routers Use Notebooks](#8-how-other-routers-use-notebooks)
9. [Status Code Reference](#9-status-code-reference)
10. [Resolved Gaps & Remaining Housekeeping](#10-resolved-gaps--remaining-housekeeping)

---

## 1. Route Summary

The router is mounted at **`/notebooks`** in `app.js`. Every route requires a valid JWT (`checkJwtToken`).

| Method | Full Path | Purpose |
|---|---|---|
| `GET` | `/notebooks` | List the user's notebooks A–Z (ignoring case), each with a count of active notes |
| `POST` | `/notebooks` | Create a notebook |
| `PATCH` | `/notebooks/:id` | Rename and/or recolour a notebook |
| `DELETE` | `/notebooks/:id` | Delete a notebook; its notes move to "No notebook" |

This is a **RESTful** layout: one resource path (`/notebooks`), with the HTTP method saying what happens.

Notebook names are **unique per user, ignoring case**: a user can't have both `Work` and `work` (409).

---

## 2. Imports & Setup

```js
const express = require('express');
const mongoose = require('mongoose');
const Notebook = require('../models/notebookSchema');
const Note = require('../models/noteSchema');
const { checkJwtToken } = require('../middleware/securityMiddleware');
const { DEFAULT_NOTEBOOK_COLOUR, NAME_COLLATION } = require('../util/schemaUtil');
const router = express.Router();
```

| Import | Used For |
|---|---|
| `express` | Creates the `router` |
| `mongoose` | `ObjectId.isValid()` for `:id`, and `new ObjectId(userId)` in the aggregation |
| `Notebook` | The model this router manages |
| `Note` | Counting notes per notebook in `GET /`, and the moved-notes count in `DELETE /:id` |
| `checkJwtToken` | Auth on every route; sets `req.user.id` |
| `DEFAULT_NOTEBOOK_COLOUR` | `'#1F4E79'`. PATCH resets to it on a blank colour. The schema default uses the same constant. |
| `NAME_COLLATION` | `{ locale: 'en', strength: 2 }`. Case-insensitive sorting in `GET /`. The unique index uses the same collation. |

`dotenv` isn't imported. `app.js` loads it before any router is required.

### What the routes rely on in `notebookSchema`

The routes depend on these schema features (they aren't defined in this file):

| Schema Feature | Used By |
|---|---|
| `name` with `trim: true`, `required` and `maxlength: 80` | POST, PATCH |
| `colour` with `default: DEFAULT_NOTEBOOK_COLOUR` and a `hexColourRegex` match | POST, PATCH |
| A unique compound index `{ user: 1, name: 1 }` with `NAME_COLLATION` (named `user_1_name_1_ci`) | The 409 duplicate-name error, and the case-insensitive A–Z sort in GET |
| A `post('findOneAndDelete')` hook that sets `notebook: null` on the notebook's notes | DELETE |

---

## 3. notebookSaveError() Helper

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

## 4. GET `/notebooks`

**Purpose:** Fill the notebook sidebar, the notebook dropdowns, and the notebook filter, each with a note count.

### Step 1: Fetch the notebooks and the counts **in parallel**

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

### Step 2: The aggregation counts notes per notebook in **one** query

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

### Step 3: Merge the counts into the notebooks

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

### Response (200)

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

## 5. POST `/notebooks`

**Purpose:** Create a notebook from the AddNoteBook form on the NotePad page.

### Request body

```json
{ "name": "Work", "colour": "#4F46E5" }
```

| Field | Required | Rules |
|---|---|---|
| `name` | ✅ | A non-empty string, up to 80 characters. It must be unique among **this user's** notebooks, ignoring case. |
| `colour` | ❌ | A hex code string. `null`, `''` or missing → the default `#1F4E79`. |

### Validation

```js
if (typeof name !== 'string' || !name.trim()) → 400 "Notebook name is required"
if (colour !== undefined && colour !== null && typeof colour !== 'string') → 400
```

The string check blocks `{ "name": { "$gt": "" } }`-style injection. The **format** of the hex colour is left to the schema's `hexColourRegex`.

### Create

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

**Response (201):**

```json
{ "message": "Notebook saved successfully", "notebook": { "_id": "...", "user": "...", "name": "Work", "colour": "#4F46E5", "createdAt": "...", "updatedAt": "..." } }
```

**Errors:** `400` (validation), `409` (duplicate name, including a different case like `work`), `500`.

---

## 6. PATCH `/notebooks/:id`

**Purpose:** Rename and/or recolour a notebook. **Only the fields that are sent change.**

### Request body (one or both)

```json
{ "name": "Work 2026" }
{ "colour": "#059669" }
{ "colour": "" }
{ "name": "Work 2026", "colour": "#059669" }
```

### Building the update

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

POST and PATCH now treat a blank or `null` colour the same way: both give the default colour.

### The update

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

A rename to an existing name (in any case) hits the unique index → `11000` → **409** through `notebookSaveError`. Changing only the case of the notebook's **own** name (`work` → `Work`) is allowed, because it's the same document.

Renaming a notebook **doesn't** touch any notes, because notes store the notebook's **ID**, not its name. Every note in it shows the new name straight away through `populate`.

**Response (200):** `{ "message": "Notebook updated successfully", "notebook": { ...updated } }`

---

## 7. DELETE `/notebooks/:id`

**Purpose:** Delete a notebook **without losing its notes**, and say how many notes moved.

```js
const movedNotes = await Note.countDocuments({ notebook: id, user: userId });
const notebook = await Notebook.findOneAndDelete({ _id: id, user: userId });
```

The route counts the notes, then deletes the notebook. The **schema hook** moves the notes:

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

The hook in `notebookSchema`:

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

| Detail | Why |
|---|---|
| Count **before** deleting | Once the hook has run, the notes no longer point at the notebook, so they can't be counted afterwards. The count covers the same notes the hook moves (active, archived and trashed). |
| `timestamps: false` | Without it, every moved note would get a new `updatedAt` and jump to the top of the Notes list |
| A hook, not code in the route | Putting the cleanup **next to the model** means any code that deletes a notebook with `findOneAndDelete` (or `findByIdAndDelete`, which calls it) gets the cleanup automatically |

If the notebook isn't found (or isn't the user's), the count is simply `0` and the route returns 404, so nothing leaks.

**Response (200):**

```json
{ "message": "Notebook deleted", "notebook": { "_id": "6733...", "name": "Work" }, "movedNotes": 7 }
```

`NoteBookList.js` uses `movedNotes` in its confirmation: `Notebook "Work" successfully deleted. 7 notes were moved to "No notebook".`

---

## 8. How Other Routers Use Notebooks

| Router | Uses |
|---|---|
| `noteRoutes.js` | `checkNotebook()`: before a note is put into a notebook, it checks that the notebook **exists and belongs to the user** |
| `noteRoutes.js`, `archiveRoutes.js` | `.populate('notebook', 'name colour')`, so notes show the notebook name and colour badge |
| `noteRoutes.js` | `GET /fetchNotes?notebook=<id>` filters notes by notebook |
| `exportRoutes.js` | The "Notebook" column, and the `notebook` export filter |
| `userRoutes.js` | Admin user removal deletes the user's notebooks with `deleteMany`, together with all their notes |

---

## 9. Status Code Reference

| Code | Route(s) | When |
|---|---|---|
| `200` | GET, PATCH, DELETE | Success |
| `201` | POST | Notebook created |
| `400` | POST, PATCH | Missing or blank name, wrong field types, invalid hex colour, name over 80 characters, no changes sent |
| `400` | PATCH, DELETE | `:id` isn't a valid ObjectId |
| `401` | all | (From `checkJwtToken`) No token, or an invalid or expired one |
| `404` | PATCH, DELETE | Notebook not found, or not the user's |
| `409` | POST, PATCH | The user already has a notebook with that name (ignoring case) |
| `500` | all | Unexpected error |

---

## 10. Resolved Gaps & Remaining Housekeeping

These gaps were found in an earlier review and have now been fixed.

| Gap | Fix | Where |
|---|---|---|
| 1. A–Z sorting and duplicate names were case-sensitive | `GET /` sorts with `NAME_COLLATION` (`{ locale: 'en', strength: 2 }`). The unique `{ user, name }` index uses the same collation, so `Work` and `work` count as the same name (409). | `notebookRoutes.js` GET `/`, `notebookSchema.js`, `util/schemaUtil.js` |
| 2. Colour rules differed between POST and PATCH, and a colour couldn't be reset | PATCH accepts `null`, and a blank or `null` colour resets to the default. The default lives in one place, `DEFAULT_NOTEBOOK_COLOUR`, shared by the schema and the route. | `notebookRoutes.js` PATCH `/:id`, `notebookSchema.js`, `util/schemaUtil.js` |
| 4. The two queries in GET ran one after the other | They run together with `Promise.all`. The notebooks use `.lean()` (with `.select('-__v')`), so the `toJSON()` call is gone. | `notebookRoutes.js` GET `/` |
| 5. Duplicate errors were logged twice | The `console.error` is removed from `notebookSaveError`. The helper only builds the response; the route does the logging. | `notebookRoutes.js` |
| 6. DELETE didn't report how many notes moved | The route counts the notebook's notes before deleting and returns `movedNotes`. `NoteBookList.js` shows it in the confirmation. | `notebookRoutes.js` DELETE `/:id`, `NoteBookList.js` |

The housekeeping comments are fixed too:
- The unused `require('dotenv').config()` is removed (`app.js` loads it).
- The `mongoose` import has a comment saying what it's used for.
- The GET section header says "from the database" (there's no provider here).
- The header block mentions that names are unique per user, ignoring case (409).
- "Conditional rendering" is now "Guard clause".
- The DELETE response comment mentions the deleted notebook's id and name and the moved-notes count.
- The missing semicolons after `express.Router()` and `notebookSaveError` are added.

### One-time database step for Gap 1

The new index is named `user_1_name_1_ci`, so it doesn't clash with the old case-sensitive `user_1_name_1` index. MongoDB builds it on the next server start. After that:

1. **Drop the old `user_1_name_1` index** (in Atlas or Compass, or with `Notebook.syncIndexes()`). Both indexes are unique, so nothing breaks while both exist; the old one is just redundant.
2. **If the new index fails to build**, a user already has two notebooks whose names differ only by case (e.g. `Work` and `work`). Mongoose logs the index error at startup. Rename or merge one of them, then restart the server.

### Still open

| Item | Notes |
|---|---|
| 3. The cleanup only runs for `findOneAndDelete` | Mongoose query hooks are tied to a **specific method**, so `deleteOne` and `deleteMany` don't move the notes. Today the only other place that deletes notebooks is admin user removal in `userRoutes.js`, and it deletes all of the user's notes at the same time, so no notes are left pointing at a deleted notebook. If notebooks are ever deleted with `deleteOne` / `deleteMany` elsewhere, add matching hooks or use `findOneAndDelete`. Even then it fails gracefully: `populate` returns `null` for a missing notebook, and the frontend and export already handle it (`n.notebook?.name \|\| ''`). |
| The moved-notes count isn't atomic | A note added to the notebook between the count and the delete would be moved but not counted. That only affects the number in the message, never the notes themselves. |
