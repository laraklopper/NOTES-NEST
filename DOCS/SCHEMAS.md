# MONGOOSE SCHEMAS

The server stores its data in MongoDB through five **Mongoose models**, defined in [`server/models/`](../server/models/).
Shared validation rules and constants (regular expressions, length limits, retention periods) live in [`server/util/schemaUtil.js`](../server/util/schemaUtil.js), so the schemas, the route validators and the client all use the same values.

Every schema uses `timestamps: true`, which adds `createdAt` and `updatedAt` automatically.

## TABLE OF CONTENTS
1. [RELATIONSHIPS](#1-relationships)
2. [USER](#2-user)
3. [NOTE](#3-note)
4. [NOTEBOOK](#4-notebook)
5. [TAG](#5-tag)
6. [TRANSLATION](#6-translation)
7. [SHARED RULES (schemaUtil.js)](#7-shared-rules-schemautiljs)
8. [ARCHIVE AND TRASH LIFECYCLE](#8-archive-and-trash-lifecycle)

## 1. RELATIONSHIPS

```
User ─┬─< Notebook
      ├─< Tag
      ├─< Note >── Notebook (optional)
      │     └──>< Tag (many-to-many)
      └─< Translation >── Note (optional)
```

- Every Notebook, Tag, Note and Translation has a required `user` field. Every query is filtered by that owner.
- A Note can belong to at most one Notebook. `notebook: null` means "No notebook".
- Notes and Tags are linked many-to-many through the Note's `tags` array.
- A Translation can point to the Note it came from. `note: null` means the text was typed into the translate form.
- MongoDB automatically creates a `_id` field in each document and assigns a unique BSON ObjectId to the field.

## 2. USER

**File:** [`server/models/userSchema.js`](../server/models/userSchema.js) · **Model:** `User`

Stores accounts, login data and per-user language preferences.

| Field | Type | Rules / purpose |
|---|---|---|
| `username` | String | Required, unique, 3–30 characters, letters, digits and `_` only. Lowercased before validation. |
| `fullName.firstName` | String | Required, 2–50 characters. |
| `fullName.lastName` | String | Required, 3–50 characters. |
| `contactDetails.email` | String | Required, lowercased, must match `emailRegex`. |
| `contactDetails.contactNumber` | String | Required, unique, must be a South African mobile number (`phoneRegex`). Stored as `+27…`. |
| `dateOfBirth` | Date | Required. Can't be in the future, and the user must be at least 13. |
| `defaultLanguages.defaultSourceLanguage` | String | Default `auto`. A supported language code, or `auto` to let the provider detect it. |
| `defaultLanguages.defaultTargetLanguage` | String | Default `fr`. A supported language code (`auto` is not allowed). |
| `defaultLanguages.defaultNoteLanguage` | String | Default `en`. A supported language code. |
| `password` | String | Required, 8–1024 characters. `select: false`: queries don't return it unless they ask for it. |
| `adminDataConsent` | Boolean | Required and must be `true` to register. |
| `admin` | Boolean | Default `false`. Grants administrative privileges. |
| `tokenVersion` | Number | Default `0`. Copied into every JWT. Increasing it (for example on a password change) signs out every existing session. |

**Language codes:** the allowed codes come from `languageData` (the Langbly language list), so the enums update automatically when that list changes. An empty string is treated as "not set", so the default applies.

**Virtuals** (included in JSON output):

| Virtual | Returns |
|---|---|
| `fullNameString` | `"First Last"` |
| `contactDetailsString` | `"Email: …, Phone: …"` |

**Hooks:**
- `pre('validate')` trims and lowercases `username` and `email`, and normalizes `contactNumber` to `+27…`. This makes the uniqueness checks compare like with like (`082 123 4567` and `+27821234567` count as the same number).

## 3. NOTE

**File:** [`server/models/noteSchema.js`](../server/models/noteSchema.js) · **Model:** `Note`

The main content model.

| Field | Type | Rules / purpose |
|---|---|---|
| `user` | ObjectId → `User` | Required, indexed. |
| `notebook` | ObjectId → `Notebook` | Default `null` ("No notebook"). |
| `title` | String | At most 200 characters. Default `Untitled`. |
| `content` | String (HTML) | The note body. Sanitized before saving. |
| `plainText` | String | Generated from `content`. Used for search and translation. |
| `language` | String | Required, must match `languageCodeRegex`. The controller defaults it to the user's `defaultNoteLanguage`. |
| `tags` | [ObjectId → `Tag`] | The note's tags. |
| `isPinned` | Boolean | Default `false`. Pinned notes show at the top of the list. |
| `isArchived` | Boolean | Default `false`. Archived notes are hidden from the main list and can't be translated. |
| `archivedAt` | Date | When the note was archived. Default `null`. |
| `deletedAt` | Date | Soft-delete marker. A date means the note is in the trash. Default `null`. |

**HTML sanitizing:** `content` may only contain these tags:
`p, br, strong, em, u, s, h1, h2, h3, ul, ol, li, blockquote, code, pre, hr, a, div, span`.
The only attributes kept are `href`, `target` and `rel` on links, and links may only use `http`, `https` or `mailto`. This blocks stored XSS, including `javascript:` links.

**Indexes:**

| Index | Purpose |
|---|---|
| Text index on `title` (weight 3) and `plainText` (weight 1) | Full-text search. Title matches rank higher. |
| `{ user, isPinned: -1, updatedAt: -1 }` | Dashboard sort: pinned first, then newest. |
| `{ deletedAt }` with `expireAfterSeconds` of 30 days | TTL index: MongoDB permanently deletes a note 30 days after it goes to the trash. |
| `{ user, isArchived, deletedAt, archivedAt: -1 }` | Archive list filter and sort (`GET /archive/fetchNotes`). |
| `{ isArchived, archivedAt }` | The 60-day archive sweep in `util/archiveUtil.js`. |

**Hooks:**
- `pre('validate')`: on create and `.save()`, if `content` changed, sanitizes it and rebuilds `plainText`.
- `pre('findOneAndUpdate')`: does the same for updates (`PATCH /notes/:id`), whether `content` is sent directly or inside `$set`. It also turns on validators for the update and returns the updated document.
- `post('findOneAndDelete')`: deletes any translations of the deleted note. `DELETE /notes/:id/permanent` already removes them first, so this is a safety net.
- `toJSON` removes `__v` from API responses.

## 4. NOTEBOOK

**File:** [`server/models/notebookSchema.js`](../server/models/notebookSchema.js) · **Model:** `Notebook`

Groups notes into folders.

| Field | Type | Rules / purpose |
|---|---|---|
| `user` | ObjectId → `User` | Required, indexed. |
| `name` | String | Required, at most 80 characters. |
| `colour` | String | Hex colour (`#1F4E79` or `#fff`). Default `#1F4E79`. |

**Indexes:**
- `{ user, name }`, unique, named `user_1_name_1_ci`, with a case-insensitive collation. A user can't have two notebooks whose names differ only in case ("Work" and "work"). A duplicate returns **409**. The same index lets `GET /notebooks` sort A–Z without regard to case. The older case-sensitive index `user_1_name_1` can be dropped.

**Hooks:**
- `post('findOneAndDelete')`: deleting a notebook **keeps its notes**. They move to "No notebook" (`notebook: null`). This runs with `timestamps: false`, so the notes' `updatedAt` and list order don't change.
- `toJSON` removes `__v`.

## 5. TAG

**File:** [`server/models/tagSchema.js`](../server/models/tagSchema.js) · **Model:** `Tag`

Labels that belong to one user and can be attached to many notes.

| Field | Type | Rules / purpose |
|---|---|---|
| `user` | ObjectId → `User` | Required. |
| `name` | String | Required, trimmed, lowercased, at most `MAX_TAG_LENGTH` (30) characters. `"React"`, `" react "` and `"REACT"` are all stored as `"react"`. |

**Indexes:**
- `{ user, name }`, unique. Each user can have each tag name only once. A duplicate returns **409**.

**Hooks:**
- `post('findOneAndDelete')` and `pre('deleteOne' / 'deleteMany')` (query middleware): remove the deleted tag IDs from every note that uses them. This covers deleting a single tag, deleting an account and removing unused tags, so notes never keep IDs of tags that no longer exist. The notes' `updatedAt` stays the same.
- `toJSON` removes `__v`.

## 6. TRANSLATION

**File:** [`server/models/translationSchema.js`](../server/models/translationSchema.js) · **Model:** `Translation`

Saved translations made through the Langbly provider, either of a note or of free text.

| Field | Type | Rules / purpose |
|---|---|---|
| `user` | ObjectId → `User` | Required, indexed. |
| `note` | ObjectId → `Note` | Default `null` (free text). When set, the controller checks that the note belongs to the user and isn't archived. Indexed. |
| `sourceText` | String | Required, at most `MAX_TRANSLATION_CHARS` (10,000). A copy of the note's `plainText` at the time of translation. |
| `translatedText` | String | Required, at most 20,000 characters, because a translation can be longer than its source. |
| `sourceLanguage` | String | Required, must match `languageCodeRegex`. The chosen language, or the one Langbly detected. |
| `targetLanguage` | String | Required, must match `languageCodeRegex` and must differ from `sourceLanguage`. |
| `textHash` | String | SHA-256 of `sourceText` and `translatedText`. Set automatically. `select: false` and removed from JSON. |
| `characterCount` | Number | Length of `sourceText`. Set automatically. Tracks usage against the free-tier quota. |
| `isArchived` | Boolean | Default `false`. Archived translations are hidden from the list and shown in the archive. |
| `archivedAt` | Date | When the translation was archived. Default `null`. |
| `deletedAt` | Date | Soft-delete marker. Default `null`. |

**Indexes:**

| Index | Purpose |
|---|---|
| `{ user, createdAt: -1 }` | Translations list, newest first. |
| `{ user, textHash }` | Duplicate check on `POST /save`. |
| `{ user, isArchived, deletedAt, archivedAt: -1 }` | Archive list filter and sort. |
| `{ isArchived, archivedAt }` | The 60-day archive sweep. |
| `{ deletedAt }` with `expireAfterSeconds` of 30 days | TTL purge 30 days after soft delete. |

**Statics:**

| Method | Returns |
|---|---|
| `Translation.hashText(sourceText, translatedText)` | The SHA-256 hex hash used for `textHash`. The texts are joined with a `\0` separator, so `"ab" + "c"` and `"a" + "bc"` hash differently. |
| `Translation.getMonthlyUsage(userId)` | Total `characterCount` for the user since the first day of the current month (`0` if none). |

**Hooks:**
- `pre('validate')`: sets `characterCount` when `sourceText` changes, and recomputes `textHash` when either text changes.
- `toJSON` removes `__v` and `textHash`.

## 7. SHARED RULES (schemaUtil.js)

| Export | Value | Used by |
|---|---|---|
| `emailRegex` | `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` | User email |
| `phoneRegex` | `/^(\+27\|0)[6-8][0-9]{8}$/` | User contact number |
| `normalizePhoneSA(phone)` | Removes spaces and turns a leading `0` into `+27` | User pre-validate hook |
| `languageCodeRegex` | `/^[a-z]{2,3}(-[A-Za-z]{2,4})?$/` (e.g. `en`, `zu`, `zh-CN`) | Note, Translation |
| `hexColourRegex` | `#RGB` or `#RRGGBB` | Notebook colour |
| `DEFAULT_NOTEBOOK_COLOUR` | `#1F4E79` | Notebook default; `PATCH /notebooks/:id` resets a blank colour to it |
| `NAME_COLLATION` | `{ locale: 'en', strength: 2 }` | Case-insensitive notebook names |
| `ADMIN_MIN_AGE` | `21` | Admin eligibility |
| `ADMIN_MIN_ACCOUNT_AGE_MS` | 90 days in production, 1 day in development | Admin eligibility |
| `THIRTY_DAYS_IN_SECONDS` | 30 days | Trash TTL indexes |
| `ARCHIVE_DAYS` / `ARCHIVE_RETENTION_MS` | 60 days | Archive sweep |
| `MAX_TRANSLATION_CHARS` | `10000` | Translation text limit (Langbly free tier, per request) |
| `MAX_TAG_LENGTH` | `30` | Tag name, `noteRoutes.js`, `TagsList.js` |

## 8. ARCHIVE AND TRASH LIFECYCLE

Notes and translations follow the same lifecycle:

```
Active ──archive──> Archived ──60 days (archive sweep)──> Trash ──30 days (TTL index)──> Permanently deleted
  │                                                         ^
  └────────────────────────delete───────────────────────────┘
```

- **Archived:** `isArchived: true`, `archivedAt` set. Hidden from the main list. Archived notes can't be translated.
- **Trash:** `deletedAt` set (soft delete). Can still be restored.
- **Permanently deleted:** MongoDB's TTL monitor removes the document 30 days after `deletedAt`. A user can also delete a note permanently before then.
