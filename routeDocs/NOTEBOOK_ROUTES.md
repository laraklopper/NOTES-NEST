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
10. [Known Gaps & Housekeeping](#10-known-gaps--housekeeping)

---

## 1. Route Summary

The router is mounted at **`/notebooks`** in `app.js`. Every route requires a valid JWT (`checkJwtToken`).

| Method | Full Path | Purpose |
|---|---|---|
| `GET` | `/notebooks` | List the user's notebooks A–Z, each with a count of active notes |
| `POST` | `/notebooks` | Create a notebook |
| `PATCH` | `/notebooks/:id` | Rename and/or recolour a notebook |
| `DELETE` | `/notebooks/:id` | Delete a notebook; its notes move to "No notebook" |

This is a **RESTful** layout: one resource path (`/notebooks`), with the HTTP method saying what happens.

---

## 2. Imports & Setup

```js
require('dotenv').config()
const express = require('express');
const mongoose = require('mongoose');
const Notebook = require('../models/notebookSchema');
const Note = require('../models/noteSchema');
const { checkJwtToken } = require('../middleware/securityMiddleware');
const router = express.Router()
```

| Import | Used For |
|---|---|
| `dotenv` | Loads `.env`. It isn't used directly in this file. |
| `express` | Creates the `router` |
| `mongoose` | `ObjectId.isValid()` for `:id`, and `new ObjectId(userId)` in the aggregation |
| `Notebook` | The model this router manages |
| `Note` | Only used to **count** notes per notebook in `GET /` |
| `checkJwtToken` | Auth on every route; sets `req.user.id` |

### What the routes rely on in `notebookSchema`

The routes depend on these schema features (they aren't defined in this file):

| Schema Feature | Used By |
|---|---|
| `name` with `trim: true` and `required` | POST, PATCH |
| `colour` with `default: '#1F4E79'` and a `hexColourRegex` match | POST, PATCH |
| A unique compound index `{ user: 1, name: 1 }` | The 409 duplicate-name error |
| A `findOneAndDelete` hook that sets `notebook: null` on the notebook's notes | DELETE |

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
}
```

POST and PATCH can fail in the same two ways, so this helper turns the error into a response in **one place**.

| Error | Comes From | Returns |
|---|---|---|
| `ValidationError` | Schema rules (missing name, bad hex colour, too long) | `400` + the first schema message |
| `code === 11000` | MongoDB's **unique index** on `{ user, name }` | `409 Conflict` |
| Anything else | A bug, or the database being down | `null`, so the route sends a **500** |

The route uses it like this:

```js
const saveError = notebookSaveError(error);
if (saveError) return res.status(saveError.status).json({ message: saveError.message });
return res.status(500).json({ message: 'Internal Server Error' });// Unexpected
```

**Why rely on the unique index rather than checking for duplicates first?** A "find, then create" check has a **race condition**: two quick clicks could both pass the check before either saves. A unique index is enforced by MongoDB itself, so the second insert **always** fails with `11000`.

---

## 4. GET `/notebooks`

**Purpose:** Fill the notebook sidebar, the notebook dropdowns, and the notebook filter, each with a note count.

### Step 1: Fetch the notebooks

```js
const notebooks = await Notebook.find({ user: userId }).sort({ name: 1 });// A–Z
```

### Step 2: Count notes per notebook in **one** query

```js
const counts = await Note.aggregate([
    { $match: { user: new mongoose.Types.ObjectId(userId), isArchived: false, deletedAt: null, notebook: { $ne: null } } },
    { $group: { _id: '$notebook', count: { $sum: 1 } } }
]);
```

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
    ...notebook.toJSON(),// Mongoose doc -> plain object
    noteCount: countMap.get(notebook._id.toString()) || 0// Notebooks with no notes aren't in counts, so default to 0
}));
```

| Detail | Why |
|---|---|
| `Map` | A fast lookup by ID, rather than searching the `counts` array for every notebook |
| `.toString()` on both sides | ObjectIds are **objects**, so two ObjectIds with the same value are **not** `===`. Converting both to strings makes them comparable as `Map` keys. |
| `.toJSON()` | Converts the Mongoose document to a plain object, so `...spread` copies only the data and not Mongoose internals |
| `\|\| 0` | An empty notebook has no group in the aggregation, so `get()` returns `undefined` |

### Response (200)

```json
{
  "notebooks": [
    { "_id": "6732...", "user": "6731...", "name": "Personal", "colour": "#E11D48", "noteCount": 4, "createdAt": "...", "updatedAt": "..." },
    { "_id": "6733...", "user": "6731...", "name": "Work", "colour": "#1F4E79", "noteCount": 0, "createdAt": "...", "updatedAt": "..." }
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
| `name` | ✅ | A non-empty string. It must be unique among **this user's** notebooks. |
| `colour` | ❌ | A hex code string. `null`, `''` or missing → the schema default `#1F4E79`. |

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

**Errors:** `400` (validation), `409` (duplicate name), `500`.

---

## 6. PATCH `/notebooks/:id`

**Purpose:** Rename and/or recolour a notebook. **Only the fields that are sent change.**

### Request body (one or both)

```json
{ "name": "Work 2026" }
{ "colour": "#059669" }
{ "name": "Work 2026", "colour": "#059669" }
```

### Building the update

```js
const updates = {};
if (name !== undefined) {
    if (!name.trim()) → 400 "Notebook name is required"// Can't rename to blank
    updates.name = name.trim();
}
if (colour !== undefined && colour.trim()) {
    updates.colour = colour.trim();// A blank colour is ignored (no change)
}
if (Object.keys(updates).length === 0) → 400 "No changes were sent"
```

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
| `returnDocument: 'after'` | Returns the **updated** notebook. The default would be the old one. |
| `runValidators: true` | **Update queries skip schema validators by default.** Without this, an invalid colour like `"blue"` would be saved. |

A rename to an existing name hits the unique index → `11000` → **409** through `notebookSaveError`.

Renaming a notebook **doesn't** touch any notes, because notes store the notebook's **ID**, not its name. Every note in it shows the new name straight away through `populate`.

**Response (200):** `{ "message": "Notebook updated successfully", "notebook": { ...updated } }`

---

## 7. DELETE `/notebooks/:id`

**Purpose:** Delete a notebook **without losing its notes**.

```js
const notebook = await Notebook.findOneAndDelete({ _id: id, user: userId });
```

The route itself only deletes the notebook. The **schema hook** handles the notes:

```
DELETE /notebooks/:id
      │
      ▼
Notebook.findOneAndDelete({ _id, user })
      │
      ├─► notebookSchema findOneAndDelete hook
      │       Note.updateMany({ notebook: id }, { $set: { notebook: null } })
      │       → every note in it (active, archived and trashed) moves to "No notebook"
      ▼
200 { message, notebook: { _id, name } }
```

A typical version of the hook in `notebookSchema` looks like this:

```js
notebookSchema.post('findOneAndDelete', async function (doc) {
    if (doc) {
        await mongoose.model('Note').updateMany(
            { notebook: doc._id, user: doc.user },// This notebook's notes, for this user
            { $set: { notebook: null } }// Move them to "No notebook"
        );
    }
});
```

**Why a hook rather than code in the route?** Putting the cleanup **next to the model** means any code that deletes a notebook with `findOneAndDelete` gets the cleanup automatically. But see [Gap 3](#gap-3-the-cleanup-only-runs-for-findoneanddelete).

**Response (200):**

```json
{ "message": "Notebook deleted", "notebook": { "_id": "6733...", "name": "Work" } }
```

Only `_id` and `name` are returned, enough for a toast like "'Work' deleted".

---

## 8. How Other Routers Use Notebooks

| Router | Uses |
|---|---|
| `noteRoutes.js` | `checkNotebook()`: before a note is put into a notebook, it checks that the notebook **exists and belongs to the user** |
| `noteRoutes.js`, `archiveRoutes.js` | `.populate('notebook', 'name colour')`, so notes show the notebook name and colour badge |
| `noteRoutes.js` | `GET /fetchNotes?notebook=<id>` filters notes by notebook |
| `exportRoutes.js` | The "Notebook" column, and the `notebook` export filter |

---

## 9. Status Code Reference

| Code | Route(s) | When |
|---|---|---|
| `200` | GET, PATCH, DELETE | Success |
| `201` | POST | Notebook created |
| `400` | POST, PATCH | Missing or blank name, wrong field types, invalid hex colour, no changes sent |
| `400` | PATCH, DELETE | `:id` isn't a valid ObjectId |
| `401` | all | (From `checkJwtToken`) No token, or an invalid or expired one |
| `404` | PATCH, DELETE | Notebook not found, or not the user's |
| `409` | POST, PATCH | The user already has a notebook with that name |
| `500` | all | Unexpected error |

---

## 10. Known Gaps & Housekeeping

### Gap 1: A–Z sorting is case-sensitive

`.sort({ name: 1 })` sorts by **character code**, and every uppercase letter comes before every lowercase one:

```
Sorted:   "Personal", "Work", "ideas", "recipes"
Expected: "ideas", "Personal", "recipes", "Work"
```

**Fix:** add a **collation** so MongoDB sorts the way people read:

```js
Notebook.find({ user: userId }).collation({ locale: 'en', strength: 2 }).sort({ name: 1 });// strength 2 = ignore case
```

**Related:** the unique index `{ user, name }` is also case-sensitive (unless the schema lowercases names), so a user can create both `Work` and `work`. To block that, give the index the same collation:

```js
notebookSchema.index({ user: 1, name: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });// "Work" = "work"
```

Rebuild the index after changing it (drop the old one in Atlas or Compass, or call `Notebook.syncIndexes()`).

### Gap 2: Colour rules differ between POST and PATCH

| Input | POST | PATCH |
|---|---|---|
| `colour: null` | ✅ Uses the default | ❌ **400** "Invalid notebook details" |
| `colour: ''` | ✅ Uses the default | Ignored, **no change** |

So once a notebook has a custom colour, there's **no way to reset it** to the default. If you want "reset to default" in the UI, treat blank or `null` in PATCH as the default:

```js
if (colour !== undefined) {
    updates.colour = colour?.trim() || '#1F4E79';// Blank/null resets to the default colour
}
// ...and allow null in the type check: (colour !== undefined && colour !== null && typeof colour !== 'string')
```

Better still, export the default from `schemaUtil` (e.g. `DEFAULT_NOTEBOOK_COLOUR`), so the schema and the route share one value.

### Gap 3: The cleanup only runs for `findOneAndDelete`

Mongoose query hooks are tied to a **specific method**. The notes are only moved to "No notebook" when a notebook is deleted with `findOneAndDelete`. `findByIdAndDelete` is covered, because it calls `findOneAndDelete` internally. But `deleteOne` and `deleteMany` (e.g. in a future "delete my account" feature) **won't run the hook**. Those notes keep pointing at a deleted notebook.

The good news is that this fails **gracefully**: `populate` returns `null` for a missing notebook, and the frontend and export already handle it (`n.notebook?.name || ''`). Still, either:
- always delete notebooks with `findOneAndDelete`, or
- add matching `deleteOne` / `deleteMany` hooks.

### Gap 4: The two queries in GET run one after the other

`Notebook.find()` and `Note.aggregate()` don't depend on each other, so they can run **in parallel**, the same way `/notes/fetchNotes` does:

```js
const [notebooks, counts] = await Promise.all([
    Notebook.find({ user: userId }).sort({ name: 1 }).lean(),// lean: plain objects, so no toJSON() is needed
    Note.aggregate([/* same pipeline */])
]);
// ...then: ...notebook instead of ...notebook.toJSON()
```

Using `.lean()` here also makes the `toJSON()` call unnecessary, because the results are already plain objects.

### Gap 5: Duplicate errors are logged twice

`notebookSaveError` logs the 409 **inside the helper**, and then the route logs it **again**. Remove the `console.error` from the helper, so it only turns errors into responses and the route does all the logging.

### Gap 6: DELETE doesn't report how many notes moved

The UI could say "'Work' deleted, 7 notes moved to No notebook", but the hook's `updateMany` result isn't passed back to the route. If you want that message, do the update **in the route** instead of the hook (and return `modifiedCount`), or count the notes before deleting.

### Housekeeping

| Line(s) | Issue | Suggestion |
|---|---|---|
| 10 | `require('dotenv').config()` isn't used in this file | Load it once in `app.js` |
| 12 | The `mongoose` import has no comment | `// Used to validate ObjectIds and cast the user id for aggregate()` |
| 38 | GET section header: "from the **provider** and the database" | There's no provider here. "from the database". |
| 2–7 | The header doesn't mention the 409 duplicate-name rule | Add "Names are unique per user (409 on duplicates)" |
| 78, 83, 122, 128, 138, 149, 162, 191, 199 | "Conditional rendering" | That's a React UI term. These are **guard clauses** / validation checks. |
| 206 | "Send a 200 (OK) status code with a message", but the response also includes `notebook` | "...with a message and the deleted notebook's id and name" |
