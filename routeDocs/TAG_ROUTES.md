# TAG_ROUTES.md — `tagRoutes.js` Breakdown

`tagRoutes.js` is the Express router for **tags**, the labels a user attaches to notes (e.g. `work`, `urgent`, `recipes`). Users can list their tags (with how many active notes use each one), create a tag, rename a tag, and delete a tag. Deleting a tag **removes it from every note** but never deletes the notes.

The relationship is **many-to-many by reference**: a note stores an **array** of tag IDs, and a tag knows nothing about its notes.

```
Tag { _id, user, name }          (name stored lowercase)
    ▲
    │ note.tags = [tagId, tagId, ...]
    │
Note { _id, user, tags: [ObjectId], ... }
```

| | Notebooks | Tags |
|---|---|---|
| Per note | **One** (`notebook: ObjectId \| null`) | **Many** (`tags: [ObjectId]`) |
| On delete | Notes → `notebook: null` | Tag ID **`$pull`ed** from each note's array |
| Created by | `POST /notebooks` only | `POST /tag/addTag` **or** automatically when a note is saved with new tag names |

---

## TABLE OF CONTENTS

1. [ROUTE SUMMARY](#1-route-summary)
  - [1.1. GET /tag/fetchTags]
  - [1.2. POST /tag/addTag]
  - [1.3. DELETE /tag/:id]
2. [IMPORTS AND SETUP](#2-imports--setup)
3. [SCHEMAS AND UTILITY FUNCTIONS](#3-schemas-and-utility-functions)
- [3.1. SCHEMAS](#31-schemas)
  - [3.1.1. ]
- [3.2. UTILITY FUNCTIONS](#32-utility-functions)
4. [SECURITY](#4-security)
5. [STATUS CODE REFERERENCES]
<!-- 6. [KNOWN GAPS AND HOUSE KEEPING](REMOVE SECTION IF NONE EXISTS)  -->
<!-- [6.1. GAPS] -->
<!-- [6.2. HOUSEKEEPING] -->
7. [REFERENCES]
---

## 1. Route Summary

The router is mounted at **`/tag`** in `app.js`. Every route requires a valid JWT (`checkJwtToken`).

| Method | Full Path | Purpose |
|---|---|---|
| `GET` | `/tag/fetchTags` | List the user's tags A–Z, each with a note count |
| `POST` | `/tag/addTag` | Create a tag |
| `PUT` | `/tag/:id` | Rename a tag (body `{ "name": "..." }`; 400 invalid, 404 not found, 409 duplicate name) |
| `DELETE` | `/tag/:id` | Delete a tag and remove it from every note |

Because notes store tag **IDs**, a rename only updates the tag document, and every note shows the new name through `populate`.

---

## 2. Imports & Setup

```js
const express = require('express');
const mongoose = require('mongoose');// Used to validate ObjectIds and cast the user id for aggregate()
const Tag = require('../models/tagSchema');
const Note = require('../models/noteSchema');
const { checkJwtToken } = require('../middleware/securityMiddleware');
const router = express.Router()
```

| Import | Used For |
|---|---|
| `express` | Creates the `router` |
| `mongoose` | `ObjectId.isValid()` for `:id`, and `new ObjectId(userId)` in the aggregation |
| `Tag` | The model this router manages |
| `Note` | Only used to **count** notes per tag in `GET /fetchTags` |
| `checkJwtToken` | Auth on every route; sets `req.user.id` |

### What the routes rely on in `tagSchema`

| Schema Feature | Used By |
|---|---|
| `name` with `trim: true` and **`lowercase: true`** | POST, PUT (and `noteRoutes`' find-or-create) |
| `maxlength: MAX_TAG_LENGTH` (30, from `util/schemaUtil.js`) | POST and PUT validation |
| A unique compound index `{ user: 1, name: 1 }` | The 409 duplicate-name error |
| A `findOneAndDelete` hook that `$pull`s the tag from notes | DELETE |
| `deleteOne` / `deleteMany` hooks doing the same cleanup | Any future bulk delete |

Because names are **lowercased by the schema**, `Work`, `WORK` and `work` are all the same tag. So the unique index and the A–Z sort are effectively **case-insensitive** here, unlike notebooks.

---

## 3. GET `/tag/fetchTags`

**Purpose:** Fill the TagsList on the Notes page, the tag filter, and tag suggestions, each with a usage count.

### Steps 1 & 2: Fetch the tags and count notes per tag, **in parallel**

The two queries don't depend on each other, so they run together with `Promise.all`:

```js
const [tags, counts] = await Promise.all([
    Tag.find({ user: userId }).select('-__v').sort({ name: 1 }).lean(),// A–Z as plain objects
    Note.aggregate([
        { $match: { user: new mongoose.Types.ObjectId(userId), isArchived: false, deletedAt: null } },
        { $unwind: '$tags' },
        { $group: { _id: '$tags', count: { $sum: 1 } } }
    ])
]);
```

`.lean()` returns plain objects (faster, and no `toJSON()` needed). Because `lean()` skips the schema's `toJSON` transform, `.select('-__v')` hides the version key instead.

The aggregation has one more stage than the notebook count, because `tags` is an **array**:

| Stage | Does |
|---|---|
| `$match` | This user's **active** notes: not archived and not in the trash (the same notes `/notes/fetchNotes` shows) |
| `$unwind` | **Splits each note into one document per tag** |
| `$group` | Groups by tag ID and counts |

**`$unwind`, step by step:**

```
Before $unwind:
  { _id: N1, tags: [work, urgent] }
  { _id: N2, tags: [work] }
  { _id: N3, tags: [] }

After $unwind:
  { _id: N1, tags: work }
  { _id: N1, tags: urgent }
  { _id: N2, tags: work }
  (N3 disappears: an empty array produces no documents)

After $group:
  { _id: work,   count: 2 }
  { _id: urgent, count: 1 }
```

You can't `$group` directly by an array field, because it would group by the **whole array** (`[work, urgent]` as one key). `$unwind` turns each tag into a separate document so it can be counted on its own.

**Why `new mongoose.Types.ObjectId(userId)`?** `aggregate()` **doesn't cast** values using the schema the way `find()` does. `req.user.id` is a **string**, and the string `"6732..."` doesn't match the stored `ObjectId("6732...")`, so without the conversion every count would be 0.

### Step 3: Merge the counts into the tags

```js
const countMap = new Map(counts.map((c) => [c._id.toString(), c.count]));// tagId -> count

const tagsWithCounts = tags.map((tag) => ({
    ...tag,
    noteCount: countMap.get(tag._id.toString()) || 0// Unused tags aren't in counts
}));
```

This is the same merge pattern as `notebookRoutes.js`:
- **`Map`** gives a fast lookup by ID.
- **`.toString()`** on both sides, because two ObjectIds with the same value aren't `===`.
- **`|| 0`** handles tags that no note uses.

### Response (200)

```json
{
  "tags": [
    { "_id": "6734...", "user": "6731...", "name": "meetings", "noteCount": 3, "createdAt": "...", "updatedAt": "..." },
    { "_id": "6735...", "user": "6731...", "name": "urgent", "noteCount": 0, "createdAt": "...", "updatedAt": "..." }
  ]
}
```

A tag with `noteCount: 0` isn't on any **active** note (it may still be on archived or trashed notes), for example left over after its notes were deleted. The UI can use that to suggest cleaning it up.

---

## 4. POST `/tag/addTag`

**Purpose:** Create a tag from the AddTag form on the NotePad page.

### Request body

```json
{ "name": "Recipes" }
```

### Validation

```js
if (typeof name !== 'string' || !name.trim()) → 400 "Tag name is required"
```

| Check | Blocks |
|---|---|
| `typeof name !== 'string'` | `{ "name": { "$gt": "" } }` (NoSQL injection), numbers, arrays |
| `!name.trim()` | `''` and whitespace-only names |

The length limit and the formatting (trim, lowercase) are left to the **schema**.

### Create

```js
const newTag = await Tag.create({ user: userId, name });// The schema trims + lowercases: " Recipes " → "recipes"
```

`user` comes from the **token**, never the body, so a client can't create tags for someone else.

**Response (201):**

```json
{ "message": "Tag saved successfully", "tag": { "_id": "...", "user": "...", "name": "recipes", "createdAt": "...", "updatedAt": "..." } }
```

The response has the **saved** name (`recipes`), not what was typed (`Recipes`), so the UI should display `tag.name` from the response.

### Errors

| Error | Status | Message |
|---|---|---|
| `ValidationError` (e.g. too long) | `400` | The first schema message |
| `code === 11000` (the user already has this name) | `409` | "You already have a tag with that name" |
| Anything else | `500` | "Internal Server Error" |

The **unique index** catches duplicates, rather than a "find first, then create" check, so two quick clicks can't create the same tag twice.

---

## 5. DELETE `/tag/:id`

**Purpose:** Delete a tag from the TagsList and remove it from every note that uses it.

```js
const tag = await Tag.findOneAndDelete({ _id: id, user: userId });
```

| Part | Why |
|---|---|
| `isValid(id)` check first | Turns a `CastError` (500) into a clean **400** |
| `user: userId` in the filter | Another user's tag returns **404**, not 403, so IDs can't be probed |
| `findOneAndDelete` | Returns the deleted tag (for the response), **and** triggers the schema hook |

### The cleanup hook

The route only deletes the tag. The **`tagSchema` hook** removes the tag ID from the notes:

```js
const pullTagsFromNotes = (tagIds) => mongoose.model('Note').updateMany(
    { tags: { $in: tagIds } },// Notes that contain any of these tags
    { $pull: { tags: { $in: tagIds } } },// Remove them from their tags array
    { timestamps: false }// Removing a tag isn't an edit, so keep updatedAt as it is
);

tagSchema.post('findOneAndDelete', async function (tag) {
    if (!tag) return;
    await pullTagsFromNotes([tag._id]);
});
```

`{ timestamps: false }` stops Mongoose from setting `updatedAt` on every changed note, so deleting a tag doesn't make its notes jump to the top of the Notes and Archive lists. The `notebookSchema` delete hook uses the same option.

The same cleanup also runs before **`deleteOne`** and **`deleteMany`** queries, so a future bulk delete (e.g. "delete my account" or "remove unused tags") can't leave dead tag IDs on notes:

```js
tagSchema.pre(['deleteOne', 'deleteMany'], { document: false, query: true }, async function () {
    const tags = await this.model.find(this.getFilter()).select('_id').lean();// The tags about to be deleted
    if (tags.length === 0) return;
    await pullTagsFromNotes(tags.map((tag) => tag._id));
});
```

**`$pull`** removes **every** matching value from an array:

```
Before: note.tags = [work, urgent, recipes]
$pull:  { tags: urgent }
After:  note.tags = [work, recipes]
```

The notes themselves are untouched apart from their `tags` array. This applies to **all** notes that use the tag: active, archived and trashed.

**Response (200):**

```json
{ "message": "Tag deleted", "tag": { "_id": "6735...", "name": "urgent" } }
```

---

## 6. Two Ways Tags Get Created

```
1. Explicitly                           2. Automatically
   POST /tag/addTag                         POST /notes/addNote  { tags: ["Work", "new-idea"] }
   { name: "Recipes" }                      PATCH /notes/:id     { tags: [...] }
         │                                         │
         ▼                                         ▼
   Tag.create()                             findOrCreateTagIds()  (noteRoutes.js)
   → 409 if it already exists               → upsert: reuse it if it exists, create it if not
```

| | `POST /tag/addTag` | Note routes |
|---|---|---|
| Method | `Tag.create()` | `Tag.findOneAndUpdate(..., { upsert: true })` |
| Duplicate name | **409** error | **Reuses** the existing tag, with no error |
| Normalising | Schema (trim + lowercase) | The route **and** the schema |
| Length check | Schema (`MAX_TAG_LENGTH`) | The route **and** the schema (both use `MAX_TAG_LENGTH`) |

Both end up storing the **same** document shape, so the tag list doesn't care how a tag was created.

---

## 7. How Other Routers Use Tags

| Router | Uses |
|---|---|
| `noteRoutes.js` | `normaliseTagNames()` + `findOrCreateTagIds()`: notes send tag **names**, and the server turns them into IDs |
| `noteRoutes.js`, `archiveRoutes.js` | `.populate('tags', 'name')`, so notes show tag names |
| `noteRoutes.js` | `GET /fetchNotes?tag=<id>` filters notes whose `tags` array **contains** that ID |
| `exportRoutes.js` | The "Tags" column (`work, urgent`), and the `tag` export filter |

---

## 8. Status Code Reference

| Code | Route(s) | When |
|---|---|---|
| `200` | GET, PUT, DELETE | Success |
| `201` | POST | Tag created |
| `400` | POST, PUT | Missing, blank or non-string name; schema validation (e.g. too long) |
| `400` | PUT, DELETE | `:id` isn't a valid ObjectId |
| `401` | all | (From `checkJwtToken`) No token, or an invalid or expired one |
| `404` | PUT, DELETE | Tag not found, or not the user's |
| `409` | POST, PUT | The user already has a tag with that name |
| `500` | all | Unexpected error |

---

## 9. Resolved Gaps & Remaining Housekeeping

These gaps were found in an earlier review and have now been fixed.

| Gap | Fix | Where |
|---|---|---|
| 1. Tag counts included archived notes | `$match` now has `isArchived: false`, the same as the notebook count and `/notes/fetchNotes`, so a tag's count matches what filtering by it shows | `tagRoutes.js` GET `/fetchTags` |
| 2. Deleting a tag (or notebook) changed notes' "Last Updated" order | The cleanup `updateMany` calls pass `{ timestamps: false }` | `tagSchema.js`, `notebookSchema.js` |
| 3. No rename route | `PUT /tag/:id`, used by the edit button in `TagsList.js` | `tagRoutes.js` |
| 4. The cleanup only ran for `findOneAndDelete` | `pre('deleteOne' / 'deleteMany')` query hooks run the same `$pull` cleanup | `tagSchema.js` |
| 5. The two GET queries ran one after the other | `Promise.all` + `.lean()` | `tagRoutes.js` GET `/fetchTags` |
| 6. The tag length limit was hardcoded in several places | One `MAX_TAG_LENGTH` constant, used by the schema and both note routes | `util/schemaUtil.js` |

The housekeeping comments are fixed too: the unused `dotenv` import is gone, the `mongoose` import and the GET header are commented correctly, "Conditional rendering" is now "Guard clause", and the DELETE response comment mentions the returned tag.

### Still open

| Item | Notes |
|---|---|
| Route naming style | The router is mounted at `/tag` (singular) with action-style paths (`/fetchTags`, `/addTag`), while `notebookRoutes.js` uses REST style (`/notebooks`, `GET /`, `POST /`). Changing this means updating every frontend call (`Notes.js`, `AddTag.js`, `TagsList.js`, ...), so it's left as is for now. |
| Client length limit | `TagsList.js` has `maxLength={30}` on the input. The client can't import the server's `schemaUtil.js`, so keep it in step with `MAX_TAG_LENGTH` by hand. |
