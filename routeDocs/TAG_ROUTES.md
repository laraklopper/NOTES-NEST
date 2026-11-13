# TAG_ROUTES.md — `tagRoutes.js` Breakdown

`tagRoutes.js` is the Express router for **tags**, the labels a user attaches to notes (e.g. `work`, `urgent`, `recipes`). Users can list their tags (with how many notes use each one), create a tag, and delete a tag. Deleting a tag **removes it from every note** but never deletes the notes.

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

## Table of Contents

1. [Route Summary](#1-route-summary)
2. [Imports & Setup](#2-imports--setup)
3. [GET /tag/fetchTags](#3-get-tagfetchtags)
4. [POST /tag/addTag](#4-post-tagaddtag)
5. [DELETE /tag/:id](#5-delete-tagid)
6. [Two Ways Tags Get Created](#6-two-ways-tags-get-created)
7. [How Other Routers Use Tags](#7-how-other-routers-use-tags)
8. [Status Code Reference](#8-status-code-reference)
9. [Known Gaps & Housekeeping](#9-known-gaps--housekeeping)

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
require('dotenv').config()
const express = require('express');
const mongoose = require('mongoose');
const Tag = require('../models/tagSchema');
const Note = require('../models/noteSchema');
const { checkJwtToken } = require('../middleware/securityMiddleware');
const router = express.Router()
```

| Import | Used For |
|---|---|
| `dotenv` | Loads `.env`. It isn't used directly in this file. |
| `express` | Creates the `router` |
| `mongoose` | `ObjectId.isValid()` for `:id`, and `new ObjectId(userId)` in the aggregation |
| `Tag` | The model this router manages |
| `Note` | Only used to **count** notes per tag in `GET /fetchTags` |
| `checkJwtToken` | Auth on every route; sets `req.user.id` |

### What the routes rely on in `tagSchema`

| Schema Feature | Used By |
|---|---|
| `name` with `trim: true` and **`lowercase: true`** | POST (and `noteRoutes`' find-or-create) |
| A `name` length limit (e.g. `maxlength: 30`) | POST validation |
| A unique compound index `{ user: 1, name: 1 }` | The 409 duplicate-name error |
| A `findOneAndDelete` hook that `$pull`s the tag from notes | DELETE |

Because names are **lowercased by the schema**, `Work`, `WORK` and `work` are all the same tag. So the unique index and the A–Z sort are effectively **case-insensitive** here, unlike notebooks.

---

## 3. GET `/tag/fetchTags`

**Purpose:** Fill the TagsList on the Notes page, the tag filter, and tag suggestions, each with a usage count.

### Step 1: Fetch the tags

```js
const tags = await Tag.find({ user: userId }).sort({ name: 1 });// A–Z (all lowercase, so the order is natural)
```

### Step 2: Count notes per tag in **one** query

```js
const counts = await Note.aggregate([
    { $match: { user: new mongoose.Types.ObjectId(userId), deletedAt: null } },
    { $unwind: '$tags' },
    { $group: { _id: '$tags', count: { $sum: 1 } } }
]);
```

This has one more stage than the notebook count, because `tags` is an **array**:

| Stage | Does |
|---|---|
| `$match` | This user's notes that **aren't in the trash** |
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
    ...tag.toJSON(),
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

A tag with `noteCount: 0` is **unused**, for example left over after its notes were deleted. The UI can use that to suggest cleaning it up.

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

The route only deletes the tag. The **`tagSchema` hook** removes the tag ID from the notes. It typically looks like this:

```js
tagSchema.post('findOneAndDelete', async function (doc) {
    if (doc) {
        await mongoose.model('Note').updateMany(
            { tags: doc._id, user: doc.user },// Notes that contain this tag
            { $pull: { tags: doc._id } }// Remove it from their tags array
        );
    }
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
| Length check | Schema | The route (`> 30`) **and** the schema |

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
| `200` | GET, DELETE | Success |
| `201` | POST | Tag created |
| `400` | POST | Missing, blank or non-string name; schema validation (e.g. too long) |
| `400` | DELETE | `:id` isn't a valid ObjectId |
| `401` | all | (From `checkJwtToken`) No token, or an invalid or expired one |
| `404` | DELETE | Tag not found, or not the user's |
| `409` | POST | The user already has a tag with that name |
| `500` | all | Unexpected error |

---

## 9. Known Gaps & Housekeeping

### Gap 1: Tag counts include archived notes

The comments say the count is of "**active** notes", but `$match` only excludes **trashed** notes:

```js
{ $match: { user: ..., deletedAt: null } }// isArchived isn't checked
```

| Router | Counts |
|---|---|
| `notebookRoutes.js` | Active only (`isArchived: false, deletedAt: null`) |
| `tagRoutes.js` | Active **+ archived** |

So a tag can show **"3 notes"**, but clicking it to filter the Notes list (which hides archived notes) shows **only 1**. **Fix:** match the notebook count:

```js
{ $match: { user: new mongoose.Types.ObjectId(userId), isArchived: false, deletedAt: null } },// Active notes only, same as /notes/fetchNotes
```

If counting archived notes is intended (e.g. "this tag is still in use somewhere"), update the comments to say "active and archived notes".

### Gap 2: Deleting a tag may change notes' "Last Updated" order

If the cleanup hook uses `updateMany` and `noteSchema` has `timestamps: true`, Mongoose **sets `updatedAt` on every note it changes**. Deleting a tag that's on 20 notes makes all 20 look "just edited":

- They jump to the top of the Notes list (sorted by `updatedAt`).
- They jump to the top of the Archive list (also sorted by `updatedAt`).
- Their "Last Updated" date changes even though the user didn't edit them.

**Fix:** tell Mongoose not to touch the timestamps for this cleanup:

```js
await mongoose.model('Note').updateMany(
    { tags: doc._id, user: doc.user },
    { $pull: { tags: doc._id } },
    { timestamps: false }// Removing a tag isn't an edit, so keep updatedAt as it is
);
```

The **same issue** applies to the `notebookSchema` delete hook (moving notes to "No notebook"), so add `{ timestamps: false }` there too.

### Gap 3: No rename route

Tags can be created and deleted, but not renamed. Renaming a tag now means deleting it (which removes it from every note), creating a new one, and re-tagging every note by hand. Because notes store tag **IDs**, a rename only needs to update the tag document:

```js
router.patch('/:id', checkJwtToken, async (req, res) => {
    // ...validate id + name (same checks as POST)
    const tag = await Tag.findOneAndUpdate(
        { _id: id, user: userId },// Ownership in the filter
        { $set: { name } },// The schema lowercases/trims (setters run on updates)
        { returnDocument: 'after', runValidators: true }// Return the new name + check the length
    );
    // !tag → 404; error.code 11000 → 409 "You already have a tag with that name"
});
```

Every note shows the new name straight away through `populate`.

### Gap 4: The cleanup only runs for `findOneAndDelete`

This is the same as notebooks. The `$pull` cleanup is attached to `findOneAndDelete`. If future code removes tags with `deleteOne` or `deleteMany` (e.g. a "delete my account" or "remove unused tags" feature), **the hook won't run**, and notes will keep IDs for tags that no longer exist. `populate` turns those into `null`, which the code already filters out (`.filter(Boolean)` in the export), so nothing breaks. But the note's `tags` array keeps growing with dead IDs.

### Gap 5: The two queries in GET run one after the other

`Tag.find()` and `Note.aggregate()` don't depend on each other, so they can run in parallel:

```js
const [tags, counts] = await Promise.all([
    Tag.find({ user: userId }).sort({ name: 1 }).lean(),// lean: plain objects, so no toJSON() needed
    Note.aggregate([/* pipeline */])
]);
// ...then spread `...tag` instead of `...tag.toJSON()`
```

### Gap 6: The tag length limit lives in several places

The 30-character limit is checked in `noteRoutes.js` (twice, hardcoded) and presumably as `maxlength` in `tagSchema`. `POST /addTag` relies on the schema only, so if the schema's limit differs from `30`, the same tag name could be accepted by one route and rejected by another. Export one constant from `schemaUtil` (e.g. `MAX_TAG_LENGTH`) and use it in all three places.

### Housekeeping

| Line(s) | Issue | Suggestion |
|---|---|---|
| 2 | Mounted at `/tag` (singular), with action-style paths (`/fetchTags`, `/addTag`) | `notebookRoutes.js` uses the REST style (`/notebooks`, `GET /`, `POST /`). Pick one style across the app (e.g. `GET /tags`, `POST /tags`). If you change it, update the frontend calls too. |
| 3–5 | The header says "usage counts" but doesn't say which notes count | Say "active and archived notes" (or fix [Gap 1](#gap-1-tag-counts-include-archived-notes)) |
| 7 | `require('dotenv').config()` isn't used in this file | Load it once in `app.js` |
| 9 | The `mongoose` import has no comment | `// Used to validate ObjectIds and cast the user id for aggregate()` |
| 16 | GET section header: "from the **provider** and the database" | There's no provider here. "from the database". |
| 19, 26 | Comments say "active notes" / "active (not soft-deleted)" | They don't match the query (see [Gap 1](#gap-1-tag-counts-include-archived-notes)) |
| 56, 99, 107 | "Conditional rendering" | That's a React UI term. These are **guard clauses** / validation checks. |
| 114 | "Send a 200 (OK) status code with a message", but the response also includes `tag` | "...with a message and the deleted tag's id and name" |
