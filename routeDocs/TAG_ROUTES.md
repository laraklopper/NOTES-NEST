# TAG_ROUTES — [`tagRoutes.js`](../server/routes/tagRoutes.js) BREAKDOWN

[`tagRoutes.js`](../server/routes/tagRoutes.js) is the Express router for **tags**, the labels a user attaches to notes (e.g. `work`, `urgent`, `recipes`). Users can list their tags (with how many active notes use each one), create a tag, rename a tag, and delete a tag. Deleting a tag **removes it from every note** but never deletes the notes.

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
     - [1.1. GET `/tag/fetchTags`](#11-get-tagfetchtags)
     - [1.2. POST `/tag/addTag`](#12-post-tagaddtag)
     - [1.3. PUT `/tag/:id`](#13-put-tagid)
     - [1.4. DELETE `/tag/:id`](#14-delete-tagid)
2. [IMPORTS AND SETUP](#2-imports-and-setup)
3. [SCHEMAS AND UTILITY FUNCTIONS](#3-schemas-and-utility-functions)
     - [3.1. SCHEMAS](#31-schemas)
          - [3.1.1. TAG SCHEMA](#311-tag-schema)
          - [3.1.2. NOTE SCHEMA](#312-note-schema)
     - [3.2. UTILITY FUNCTIONS](#32-utility-functions)
4. [SECURITY](#4-security)
5. [STATUS CODE REFERENCES](#5-status-code-references)
6. [KNOWN GAPS AND HOUSE KEEPING](#6-known-gaps-and-house-keeping)
     - [6.1. GAPS](#61-gaps)
     - [6.2. HOUSE KEEPING](#62-house-keeping)
7. [REFERENCES](#7-references)

- *View [GLOSSARY.md](../GLOSSARY.md) for terminology*

---

<!-- SECTION 1 -->
## 1. ROUTE SUMMARY

The router is mounted at **`/tag`** in `app.js`. Every route requires a valid JWT (`checkJwtToken`).

| Method | Full Path | Middleware | Purpose |
|---|---|---|---|
| `GET` | `/tag/fetchTags` | `checkJwtToken` | List the user's tags A–Z, each with a note count |
| `POST` | `/tag/addTag` | `checkJwtToken` | Create a tag |
| `PUT` | `/tag/:id` | `checkJwtToken` | Rename a tag |
| `DELETE` | `/tag/:id` | `checkJwtToken` | Delete a tag and remove it from every note |

`PUT /:id` and `DELETE /:id` share a path but not a method, so they can't clash. `/fetchTags` and `/addTag` are only used with `GET` and `POST`, so they're never read as an `:id`.

**Client side usage:**

| Method | Full Path | Frontend/Client side files |
|---|---|---|
| `GET` | `/tag/fetchTags` | [Notes.js](../client/src/pages/Notes.js) (passes the tags to [TagsList.js](../client/src/components/TagsList.js), [FilterNotes.js](../client/src/components/FilterNotes.js) and [EditNoteForm.js](../client/src/components/EditNoteForm.js)), [NotePad.js](../client/src/pages/NotePad.js) (passes them to [NotePadForm.js](../client/src/components/NotePadForm.js)) |
| `POST` | `/tag/addTag` | [NotePad.js](../client/src/pages/NotePad.js) (`addTag`, called by the [AddTag.js](../client/src/components/AddTag.js) form) |
| `PUT` | `/tag/:id` | [TagsList.js](../client/src/components/TagsList.js) (edit button) |
| `DELETE` | `/tag/:id` | [TagsList.js](../client/src/components/TagsList.js) (delete button) |

---

### 1.1. GET `/tag/fetchTags`

**Purpose:** Fill the TagsList on the Notes page, the tag filter, and tag suggestions, each with a usage count.

#### Steps 1 & 2: Fetch the tags and count notes per tag, **in parallel**

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

#### Step 3: Merge the counts into the tags

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

#### Response (200)

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

### 1.2. POST `/tag/addTag`

**Purpose:** Create a tag from the AddTag form on the NotePad page.

#### Request body

```json
{ "name": "Recipes" }
```

#### Validation

```js
if (typeof name !== 'string' || !name.trim()) → 400 "Tag name is required"
```

| Check | Blocks |
|---|---|
| `typeof name !== 'string'` | `{ "name": { "$gt": "" } }` (NoSQL injection), numbers, arrays |
| `!name.trim()` | `''` and whitespace-only names |

The length limit and the formatting (trim, lowercase) are left to the **schema**.

#### Create

```js
const newTag = await Tag.create({ user: userId, name });// The schema trims + lowercases: " Recipes " → "recipes"
```

`user` comes from the **token**, never the body, so a client can't create tags for someone else.

**Response (201):**

```json
{ "message": "Tag saved successfully", "tag": { "_id": "...", "user": "...", "name": "recipes", "createdAt": "...", "updatedAt": "..." } }
```

The response has the **saved** name (`recipes`), not what was typed (`Recipes`), so the UI should display `tag.name` from the response.

#### Errors

| Error | Status | Message |
|---|---|---|
| Missing, blank or non-string name | `400` | "Tag name is required" |
| `ValidationError` (e.g. too long) | `400` | The first schema message |
| `code === 11000` (the user already has this name) | `409` | "You already have a tag with that name" |
| Anything else | `500` | "Internal Server Error" |

The **unique index** catches duplicates, rather than a "find first, then create" check, so two quick clicks can't create the same tag twice.

#### Two ways tags get created

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
| Normalising | Schema (trim + lowercase) | The route (`normaliseTagNames`) **and** the schema |
| Length check | Schema (`MAX_TAG_LENGTH`) | The route **and** the schema (both use `MAX_TAG_LENGTH`) |

Both end up storing the **same** document shape, so the tag list doesn't care how a tag was created.

---

### 1.3. PUT `/tag/:id`

**Purpose:** Rename a tag from the TagsList on the Notes page.

#### Request body

```json
{ "name": "Meetings" }
```

#### Validation

```js
if (!mongoose.Types.ObjectId.isValid(id)) → 400 "Invalid tag id"
if (typeof name !== 'string' || !name.trim()) → 400 "Tag name is required"
```

#### Update

```js
const tag = await Tag.findOneAndUpdate(
    { _id: id, user: userId },// Only a tag the user owns
    { $set: { name: name.trim().toLowerCase() } },// Same format the schema stores
    { returnDocument: 'after', runValidators: true }// Return the renamed tag and check the length limit
);
```

| Part | Why |
|---|---|
| `user: userId` in the filter | Another user's tag returns **404**, not 403, so IDs can't be probed |
| `name.trim().toLowerCase()` | Stores the name in the same format as `POST /addTag`, so the unique index compares like with like |
| `returnDocument: 'after'` | The response has the **new** name |
| `runValidators: true` | Update queries skip schema validators by default; this applies `maxlength` |

Because notes store tag **IDs**, a rename only updates the tag document, and every note shows the new name through `populate`.

**Response (200):**

```json
{ "message": "Tag updated successfully", "tag": { "_id": "6734...", "user": "6731...", "name": "meetings", "createdAt": "...", "updatedAt": "..." } }
```

#### Errors

| Error | Status | Message |
|---|---|---|
| `:id` isn't a valid ObjectId | `400` | "Invalid tag id" |
| Missing, blank or non-string name | `400` | "Tag name is required" |
| `ValidationError` (e.g. too long) | `400` | The first schema message |
| Tag not found, or not the user's | `404` | "Tag not found" |
| `code === 11000` (the user already has this name) | `409` | "You already have a tag with that name" |
| Anything else | `500` | "Internal Server Error" |

---

### 1.4. DELETE `/tag/:id`

**Purpose:** Delete a tag from the TagsList and remove it from every note that uses it.

```js
const tag = await Tag.findOneAndDelete({ _id: id, user: userId });
```

| Part | Why |
|---|---|
| `isValid(id)` check first | Turns a `CastError` (500) into a clean **400** |
| `user: userId` in the filter | Another user's tag returns **404**, not 403, so IDs can't be probed |
| `findOneAndDelete` | Returns the deleted tag (for the response), **and** triggers the schema hook that removes it from notes (see [3.1.1. TAG SCHEMA](#311-tag-schema)) |

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

**400** "Invalid tag id" if `:id` isn't a valid ObjectId. **404** "Tag not found" if it doesn't exist or isn't the user's.

---

<!-- SECTION 2: IMPORTS AND SETUP -->
## 2. IMPORTS AND SETUP

```js
const express = require('express');
const mongoose = require('mongoose');// Used to validate ObjectIds and cast the user id for aggregate()
const Tag = require('../models/tagSchema');
const Note = require('../models/noteSchema');
const { checkJwtToken } = require('../middleware/securityMiddleware');
const router = express.Router()
```

`.env` is loaded once at the top of `app.js`, so this file doesn't call `dotenv` itself.

| Import | Used For |
|---|---|
| `express` | Creates the `router` |
| `mongoose` | `ObjectId.isValid()` for `:id`, and `new ObjectId(userId)` in the aggregation |
| `Tag` | The model this router manages |
| `Note` | Only used to **count** notes per tag in `GET /fetchTags` |
| `checkJwtToken` | Auth on every route; sets `req.user.id` |

---

<!-- SECTION 3: SCHEMAS AND UTILITY FUNCTIONS -->
## 3. SCHEMAS AND UTILITY FUNCTIONS

### 3.1. SCHEMAS

#### 3.1.1. TAG SCHEMA

Defined in [tagSchema.js](../server/models/tagSchema.js):

| Field | Type | Set By |
|---|---|---|
| `user` | ObjectId → User, required | The route (from the token) |
| `name` | String, required, `trim`, **`lowercase`**, max `MAX_TAG_LENGTH` (30) | The client (`POST /addTag`, `PUT /:id`) or the note routes |
| `createdAt` / `updatedAt` | Date | `timestamps: true` |

Because names are **lowercased by the schema**, `Work`, `WORK` and `work` are all the same tag. So the unique index and the A–Z sort are effectively **case-insensitive** here, unlike notebooks.

**Indexes**

| Index | Used For |
|---|---|
| `{ user: 1, name: 1 }`, **unique** | One tag name per user (the **409** error), and `GET /fetchTags` (filter by `user`, sort by `name`) |

**Hooks**

| Hook | Runs On | What it does |
|---|---|---|
| `post('findOneAndDelete')` | `DELETE /tag/:id` | `$pull`s the deleted tag's ID from every note |
| `pre(['deleteOne', 'deleteMany'])` (query hook) | Bulk deletes, e.g. `Tag.deleteMany({ user: id })` when a user is deleted (`userRoutes.js`) | Finds the tags about to be deleted, then `$pull`s them from every note |
| `toJSON` transform | `res.json()` with a document | Removes `__v` |

```js
tagSchema.post('findOneAndDelete', async function (tag) {
    if (!tag) return;// Nothing was deleted
    await pullTagsFromNotes([tag._id]);
});

tagSchema.pre(['deleteOne', 'deleteMany'], { document: false, query: true }, async function () {
    const tags = await this.model.find(this.getFilter()).select('_id').lean();// The tags about to be deleted
    if (tags.length === 0) return;
    await pullTagsFromNotes(tags.map((tag) => tag._id));
});
```

The route only deletes the tag; the hooks clean up the notes, so no delete path can leave dead tag IDs on notes.

#### 3.1.2. NOTE SCHEMA

Defined in [noteSchema.js](../server/models/noteSchema.js). This router only **reads** notes (to count them); the tag hooks are what change them. The fields involved:

| Field | Used By | Why |
|---|---|---|
| `tags` | `GET /fetchTags`, the tag hooks | `[ObjectId]` with `ref: 'Tag'`: unwound for the count, `$pull`ed on delete |
| `user` | `GET /fetchTags` | Only the user's own notes are counted |
| `isArchived`, `deletedAt` | `GET /fetchTags` | Only **active** notes are counted |
| `updatedAt` | The tag hooks | Kept unchanged by `{ timestamps: false }` |

**How other routers use tags:**

| Router | Uses |
|---|---|
| `noteRoutes.js` | `normaliseTagNames()` + `findOrCreateTagIds()`: notes send tag **names**, and the server turns them into IDs |
| `noteRoutes.js`, `archiveRoutes.js` | `.populate('tags', 'name')`, so notes show tag names |
| `noteRoutes.js` | `GET /fetchNotes?tag=<id>` filters notes whose `tags` array **contains** that ID |
| `exportRoutes.js` | The "Tags" column (`work, urgent`), and the `tag` export filter |
| `userRoutes.js` | `Tag.deleteMany({ user: id })` when a user is deleted |

### 3.2. UTILITY FUNCTIONS

| Function / Constant | File | Used By | What it does |
|---|---|---|---|
| `pullTagsFromNotes(tagIds)` | [tagSchema.js](../server/models/tagSchema.js) | The tag delete hooks | Removes the given tag IDs from every note that has them |
| `normaliseTagNames(tags)` | [noteRoutes.js](../server/routes/noteRoutes.js) | Note create and update | Trims, lowercases, drops blanks and removes duplicates |
| `findOrCreateTagIds(userId, tagNames)` | [noteRoutes.js](../server/routes/noteRoutes.js) | Note create and update | Upserts each tag by name and returns the IDs |
| `MAX_TAG_LENGTH` | [schemaUtil.js](../server/util/schemaUtil.js) | `tagSchema.js`, `noteRoutes.js` | The tag name length limit (30) |

**`pullTagsFromNotes()`**

```js
const pullTagsFromNotes = (tagIds) => mongoose.model('Note').updateMany(
    { tags: { $in: tagIds } },// Notes that contain any of these tags
    { $pull: { tags: { $in: tagIds } } },// Remove them from their tags array
    { timestamps: false }// Removing a tag isn't an edit, so keep updatedAt as it is
);
```

`{ timestamps: false }` stops Mongoose from setting `updatedAt` on every changed note, so deleting a tag doesn't make its notes jump to the top of the Notes and Archive lists. The `notebookSchema` delete hook uses the same option. `mongoose.model('Note')` is looked up at call time, which avoids a circular `require` between the two schema files.

**`normaliseTagNames()` and `findOrCreateTagIds()`**

```js
const normaliseTagNames = (tags) => [...new Set(tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean))];

const findOrCreateTagIds = async (userId, tagNames) => {
    const tagDocs = await Promise.all(tagNames.map((name) => Tag.findOneAndUpdate(
        { user: userId, name },
        { $setOnInsert: { user: userId, name } },// Only set when the tag is created
        { upsert: true, returnDocument: 'after', runValidators: true }
    ).exec()));
    return tagDocs.map((tag) => tag._id);
};
```

```
["Work", " work ", "", "New-Idea"]  →  normaliseTagNames  →  ["work", "new-idea"]  →  findOrCreateTagIds  →  [id1, id2]
```

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

| Pattern | Why |
|---|---|
| `userId` comes from `req.user.id`, never the request | A user can't create, rename or delete someone else's tags |
| `typeof name !== 'string'` before using `name` | Blocks operator injection such as `{ "name": { "$gt": "" } }` |
| `mongoose.Types.ObjectId.isValid(id)` before querying | Turns a `CastError` (500) into a clean 400 |
| Ownership in the same filter as the ID (`{ _id, user }`) | Another user's tag returns **404**, not 403, so IDs can't be probed |
| The unique `{ user, name }` index, not a "find then create" check | Duplicates are blocked even when two requests arrive at once |
| `runValidators: true` on the rename | The length limit applies to updates too |
| `GET /fetchTags` only counts the user's own notes | `$match` on `user` stops counts from leaking other users' data |
| `try / catch` → `500 "Internal Server Error"` | Internal error details aren't sent to the client |

---

<!-- SECTION 5 -->
## 5. STATUS CODE REFERENCES

| Code | Route(s) | When |
|---|---|---|
| `200` | GET, PUT, DELETE | Success |
| `201` | POST | Tag created |
| `400` | POST, PUT | Missing, blank or non-string name; schema validation (e.g. too long) |
| `400` | PUT, DELETE | `:id` isn't a valid ObjectId |
| `401` | all | (From `checkJwtToken`) Not logged in, or the token is invalid, expired or signed out |
| `404` | PUT, DELETE | Tag not found, or not the user's |
| `409` | POST, PUT | The user already has a tag with that name |
| `500` | all | Unexpected error |

---

<!-- SECTION 6 -->
## 6. KNOWN GAPS AND HOUSE KEEPING

### 6.1. GAPS

These gaps were found in an earlier review and have now been fixed.

| Gap | Fix | Where |
|---|---|---|
| 1. Tag counts included archived notes | `$match` now has `isArchived: false`, the same as the notebook count and `/notes/fetchNotes`, so a tag's count matches what filtering by it shows | `tagRoutes.js` GET `/fetchTags` |
| 2. Deleting a tag (or notebook) changed notes' "Last Updated" order | The cleanup `updateMany` calls pass `{ timestamps: false }` | `tagSchema.js`, `notebookSchema.js` |
| 3. No rename route | `PUT /tag/:id`, used by the edit button in `TagsList.js` | `tagRoutes.js` |
| 4. The cleanup only ran for `findOneAndDelete` | `pre('deleteOne' / 'deleteMany')` query hooks run the same `$pull` cleanup | `tagSchema.js` |
| 5. The two GET queries ran one after the other | `Promise.all` + `.lean()` | `tagRoutes.js` GET `/fetchTags` |
| 6. The tag length limit was hardcoded in several places | One `MAX_TAG_LENGTH` constant, used by the schema and both note routes | `util/schemaUtil.js` |

**Still open:**

| Item | Notes |
|---|---|
| Route naming style | The router is mounted at `/tag` (singular) with action-style paths (`/fetchTags`, `/addTag`), while `notebookRoutes.js` uses REST style (`/notebooks`, `GET /`, `POST /`). Changing this means updating every frontend call (`Notes.js`, `NotePad.js`, `TagsList.js`), so it's left as is for now. |
| Client length limit | `TagsList.js` has `maxLength={30}` on the input. The client can't import the server's `schemaUtil.js`, so keep it in step with `MAX_TAG_LENGTH` by hand. |

### 6.2. HOUSE KEEPING

**Done:**

| Issue | What changed |
|---|---|
| Unused `dotenv` import | Removed |
| `mongoose` import and the GET header comment were inaccurate | Now describe what they're used for |
| Comments said "Conditional rendering" | Changed to "Guard clause" in POST and DELETE |
| DELETE response comment | Now mentions the returned tag |

**Still to do:**

| Issue | Where | Change |
|---|---|---|
| The PUT checks are commented "Check the id..." / "Check the name..." / "Check the tag was found" | `tagRoutes.js`, `PUT /:id` | Start them with "Guard clause:" to match the other routes |
| A stray "The $set operator replaces..." comment on its own line inside the `findOneAndUpdate` call | `tagRoutes.js`, `PUT /:id` | Move it onto the `$set` line or remove it |
| Missing semicolon | `tagRoutes.js`: `const router = express.Router()` | Add `;` |

---

<!-- SECTION 7: REFERENCES -->
## 7. REFERENCES

**Project files**

- [tagRoutes.js](../server/routes/tagRoutes.js)
- [tagSchema.js](../server/models/tagSchema.js), [noteSchema.js](../server/models/noteSchema.js)
- [noteRoutes.js](../server/routes/noteRoutes.js), [schemaUtil.js](../server/util/schemaUtil.js)
- [securityMiddleware.js](../server/middleware/securityMiddleware.js)
- [Notes.js](../client/src/pages/Notes.js), [NotePad.js](../client/src/pages/NotePad.js), [TagsList.js](../client/src/components/TagsList.js), [AddTag.js](../client/src/components/AddTag.js), [FilterNotes.js](../client/src/components/FilterNotes.js)
- [NOTE_ROUTES.md](NOTE_ROUTES.md), [NOTEBOOK_ROUTES.md](NOTEBOOK_ROUTES.md), [GLOSSARY.md](../GLOSSARY.md)

**External documentation**

- [Express: Routing](https://expressjs.com/en/guide/routing.html)
- [Mongoose: Queries](https://mongoosejs.com/docs/queries.html)
- [Mongoose: Populate](https://mongoosejs.com/docs/populate.html)
- [Mongoose: Middleware (hooks)](https://mongoosejs.com/docs/middleware.html)
- [Mongoose: Validation (update validators)](https://mongoosejs.com/docs/validation.html#update-validators)
- [MongoDB: `$unwind`](https://www.mongodb.com/docs/manual/reference/operator/aggregation/unwind/)
- [MongoDB: `$pull`](https://www.mongodb.com/docs/manual/reference/operator/update/pull/)
- [MongoDB: Unique Indexes](https://www.mongodb.com/docs/manual/core/index-unique/)
- [MDN: HTTP response status codes](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status)
