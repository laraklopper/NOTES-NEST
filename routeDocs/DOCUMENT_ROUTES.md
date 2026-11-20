# DOCUMENT ROUTES - [`/docTranslateRoutes.js`](../server/routes/docTranslateRoutes.js) BREAKDOWN

[`/docTranslateRoutes.js`](../server/routes/docTranslateRoutes.js) is the Express router for the user's **document translation history**: translating an uploaded document, then listing, saving, trashing, restoring and permanently deleting document translations. Only **PDF** documents (up to **5 MB** and **20 000 characters** of text) can be translated.

Unlike `translationRoutes.js`, this router **does** translate. `POST /document/translateDoc` reads the text out of the uploaded PDF with `pdf-parse` and sends it to Langbly through the same helpers `apiRoutes.js` uses ([`langblyUtil.js`](../server/util/langblyUtil.js)), so the API key never reaches the browser. Nothing is saved until the user presses **SAVE**, which sends the result to `POST /document/saveDoc`.

Archiving document translations is handled by a different router, [`archiveRoutes.js`](../server/routes/archiveRoutes.js) (see [`ARCHIVE_ROUTES.md`](../routeDocs/ARCHIVE_ROUTES.md)): `GET /archive/fetchDocuments`, `PATCH /archive/document/:id`, `PATCH /archive/document/:id/restore` and `DELETE /archive/document/:id`. This router only reads and resets the archive fields.

```
DocTranslator
   │ 1. POST /document/translateDoc          (this router → pdf-parse → Langbly)
   │    multipart: document (PDF), sourceLanguage, targetLanguage
   │    ← { fileName, sourceText, translatedText, ... }   nothing saved yet
   │
   │ 2. User clicks "SAVE"
   │    POST /document/saveDoc                (this router → MongoDB)
   │    ← 201 { document }   (or 200 if an identical one is already saved)
   ▼
DocTranslationList (table + details panal)
     GET    /document/fetchDocuments          (this router)
     GET    /document/fetchDoc/:id            (this router)
     DELETE /document/:id                     (this router: move to trash)
     PATCH  /archive/document/:id             (archiveRoutes.js: archive)
   ▼
TrashArchiveDocs (archived + trashed, one table with a STATUS column)
     GET    /archive/fetchDocuments           (archiveRoutes.js)
     PATCH  /archive/document/:id/restore     (archiveRoutes.js)
     DELETE /archive/document/:id             (archiveRoutes.js: move to trash)
     GET    /document/trash                   (this router)
     PATCH  /document/:id/restore             (this router)
     DELETE /document/:id/permanent           (this router)
```

Keeping **translate** and **save** as separate steps means the user can translate a document, check the result and only keep what they want. The PDF itself is **never stored**: it's held in memory while its text is read, then discarded.

## TABLE OF CONTENTS
1. [ROUTE SUMMARY](#1-route-summary)
    - [1.1. GET `/document/fetchDocuments`](#11-get-documentfetchdocuments)
    - [1.2. GET `/document/trash`](#12-get-documenttrash)
    - [1.3. GET `/document/fetchDoc/:id`](#13-get-documentfetchdocid)
    - [1.4. POST `/document/translateDoc`](#14-post-documenttranslatedoc)
    - [1.5. POST `/document/saveDoc`](#15-post-documentsavedoc)
    - [1.6. PATCH `/document/:id/restore`](#16-patch-documentidrestore)
    - [1.7. DELETE `/document/:id`](#17-delete-documentid)
    - [1.8. DELETE `/document/:id/permanent`](#18-delete-documentidpermanent)
2. [IMPORTS AND SETUP](#2-imports-and-setup)
3. [SCHEMAS AND UTILITY FUNCTIONS](#3-schemas-and-utility-functions)
    - [3.1. SCHEMAS](#31-schemas)
    - [3.2. UTILITY FUNCTIONS](#32-utility-functions)
4. [SECURITY](#4-security)
    - [4.1. PACKAGES](#41-packages)
    - [4.2. MIDDLEWARE](#42-middleware)
5. [STATUS CODE REFERENCES](#5-status-code-references)
6. [KNOWN GAPS AND HOUSE KEEPING](#6-known-gaps-and-house-keeping)
    - [6.1. GAPS](#61-gaps)
    - [6.2. HOUSE KEEPING](#62-house-keeping)
7. [REFERENCES](#7-references)

- *View [GLOSSARY.md](../GLOSSARY.md) for terminology*
---

## 1. ROUTE SUMMARY

The router is mounted at **`/document`** in `app.js`. Every route requires a valid JWT (`checkJwtToken`).

| Method | Full Path | Middleware | Purpose | NOTES |
|---|---|---|---|---|
| `GET` | `/document/fetchDocuments` | `checkJwtToken` | Lists the user's **active** document translations | Newest first, text omitted (query: `page`, `limit`) |
| `GET` | `/document/trash` | `checkJwtToken` | Lists the user's **trashed** document translations | Most recently deleted first, text omitted (query: `page`, `limit`) |
| `GET` | `/document/fetchDoc/:id` | `checkJwtToken` | Fetches one document translation **in full** | Any state (active, archived or trashed) |
| `POST` | `/document/translateDoc` | `translateLimiter`, `checkJwtToken`, `uploadDocument` | Translates an uploaded PDF | `multipart/form-data`; nothing is saved |
| `POST` | `/document/saveDoc` | `checkJwtToken` | Saves the translation on screen to the user's history | Returns the existing row if an identical one is saved |
| `PATCH` | `/document/:id/restore` | `checkJwtToken` | Moves a trashed document translation back to the main list | Trashed only |
| `DELETE` | `/document/:id` | `checkJwtToken` | Moves an active document translation to the trash (soft delete) | Active only |
| `DELETE` | `/document/:id/permanent` | `checkJwtToken` | Permanently deletes a document translation | Trashed only |

`GET /trash` and `GET /fetchDoc/:id` can't clash, because `/fetchDoc/:id` has two path segments. `DELETE /:id` can't clash with `DELETE /:id/permanent` for the same reason.

**Client side usage:**
| Method | Full Path | Frontend/Client side files |
|---|---|---|
| `GET` | `/document/fetchDocuments` | [DocTranslationList.js](../client/src/components/DocTranslationList.js) (on load, and when the page changes) |
| `GET` | `/document/trash` | [TrashArchiveDocs.js](../client/src/components/TrashArchiveDocs.js) (on load, on page change, and after each restore or delete; alongside `GET /archive/fetchDocuments`) |
| `GET` | `/document/fetchDoc/:id` | [DocTranslationList.js](../client/src/components/DocTranslationList.js) (VIEW button: loads the text for the details panal) |
| `POST` | `/document/translateDoc` | [DocTranslator.js](../client/src/components/DocTranslator.js) (TRANSLATE button / form submit) |
| `POST` | `/document/saveDoc` | [DocTranslator.js](../client/src/components/DocTranslator.js) (SAVE button) |
| `PATCH` | `/document/:id/restore` | [TrashArchiveDocs.js](../client/src/components/TrashArchiveDocs.js) (RESTORE on a row with status TRASH) |
| `DELETE` | `/document/:id` | [DocTranslationList.js](../client/src/components/DocTranslationList.js) (DELETE in the details panal) |
| `DELETE` | `/document/:id/permanent` | [TrashArchiveDocs.js](../client/src/components/TrashArchiveDocs.js) (DELETE on a row with status TRASH) |

`TrashArchiveDocs.js` also calls the archive routes: `PATCH /archive/document/:id/restore` (RESTORE) and `DELETE /archive/document/:id` (DELETE) on rows with status ARCHIVED. `DocTranslationList.js` calls `PATCH /archive/document/:id` (ARCHIVE in the details panal). Archived rows are listed first (the archive list isn't paged), then one page of trashed rows; the table's pagination pages through the trash only.

The client calls these with relative URLs (`/document/...`); the `proxy` in `client/package.json` forwards them to `http://localhost:3001`.

---

### 1.1. GET `/document/fetchDocuments`

**Purpose:** Fill the Document Translations table with the user's **active** document translations, one page at a time, newest first.

#### Query parameters (all optional)

| Param | Validation | Default |
|---|---|---|
| `page` | Whole number ≥ 1 | `1` |
| `limit` | 1 to `MAX_LIMIT` (`50`) | `DEFAULT_LIMIT` (`10`) |

```js
const filter = { userId, isArchived: { $ne: true }, deletedAt: null };

const [documents, total] = await Promise.all([
    DocTranslation.find(filter)
        .sort({ createdAt: -1 })// Uses the { userId, createdAt } index
        .skip(skip)
        .limit(pageSize)
        .select('-sourceText -translatedText -__v')// Text is only sent by GET /fetchDoc/:id
        .lean(),
    DocTranslation.countDocuments(filter)
]);
```

| Piece | Why |
|---|---|
| `isArchived: { $ne: true }` | Hides archived rows. `$ne: true` also matches rows saved before `isArchived` existed. |
| `deletedAt: null` | Hides trashed rows |
| `.select('-sourceText -translatedText')` | A document holds up to 20 000 characters on each side. Sending the text for every row would send megabytes to fill a table that only shows the file name and language pair. |
| `Promise.all` | The page and the total are independent, so they run at the same time |

#### Response (200)

```json
{
  "documents": [
    {
      "_id": "6740...",
      "userId": "6731...",
      "fileName": "Huurkontrak.pdf",
      "sourceLanguage": "af",
      "targetLanguage": "en",
      "provider": "langbly",
      "pageCount": 3,
      "characterCount": 8412,
      "isArchived": false,
      "archivedAt": null,
      "deletedAt": null,
      "createdAt": "2026-11-20T09:14:00.000Z",
      "updatedAt": "2026-11-20T09:14:00.000Z"
    }
  ],
  "pagination": { "page": 1, "limit": 10, "total": 1, "totalPages": 1 }
}
```

---

### 1.2. GET `/document/trash`

**Purpose:** List the user's trashed document translations, most recently deleted first.

```js
await trashExpiredArchivedDocuments(userId);// Apply the 60-day archive rule first

const filter = { userId, deletedAt: { $ne: null } };
// ...same find / countDocuments pair as /fetchDocuments, sorted by { deletedAt: -1 }
```

| Step | Why |
|---|---|
| `trashExpiredArchivedDocuments(userId)` | The global sweep only runs hourly. Running it for this user first means a document translation that passed the 60-day archive limit shows up in the trash **straight away**, and is included in `total`. |
| `deletedAt: { $ne: null }` | Anything with a deletion date is in the trash |
| `.sort({ deletedAt: -1 })` | The most recently trashed row is at the top |

Takes the same `page` / `limit` query parameters and returns the same `{ documents, pagination }` shape as `GET /fetchDocuments`. A trash page can show the days left before the purge as `deletedAt + 30 days`.

---

### 1.3. GET `/document/fetchDoc/:id`

**Purpose:** Fetch one document translation **with its text**, to fill the details panel when a row is opened.

```js
const document = await DocTranslation.findOne({
    _id: id,
    userId: req.user.id,// Scoped to the caller, so ids cannot be probed
}).select('-__v').lean();
```

There's no state filter, so the same route serves the main list, the archive list and the trash.

#### Response (200)

The full row, including `sourceText` and `translatedText`:

```json
{
  "_id": "6740...",
  "fileName": "Huurkontrak.pdf",
  "sourceText": "Hierdie ooreenkoms word aangegaan tussen...",
  "translatedText": "This agreement is entered into between...",
  "sourceLanguage": "af",
  "targetLanguage": "en",
  "pageCount": 3,
  "characterCount": 8412,
  "...": "..."
}
```

**400** "Invalid document id" if `:id` isn't a valid ObjectId. **404** "Document translation not found" if it doesn't exist or isn't the user's.

---

### 1.4. POST `/document/translateDoc`

**Purpose:** Read the text out of an uploaded PDF and translate it. **Nothing is saved.**

#### Request (`multipart/form-data`)

| Field | Required | Rules |
|---|---|---|
| `document` | ✅ | One PDF file, max 5 MB. Must start with the `%PDF-` signature. |
| `sourceLanguage` | ❌ | A language code, or `"auto"` / blank to let Langbly detect it |
| `targetLanguage` | ✅ | A language code (`languageCodeRegex`), different from `sourceLanguage` |

```js
const formData = new FormData();
formData.append('document', documentFile);
formData.append('sourceLanguage', sourceLang);// "auto" is a valid value here
formData.append('targetLanguage', targetLang);
fetch('/document/translateDoc', { method: 'POST', credentials: 'include', body: formData });
```

The client must **not** set `Content-Type`; `fetch` adds the multipart boundary itself.

#### Middleware order

```js
router.post('/translateDoc', translateLimiter, checkJwtToken, uploadDocument, async (req, res) => { ... })
```

The rate limit and the JWT check run **before** multer, so a flooding or anonymous client is turned away before its upload is read into memory.

`uploadDocument` wraps `upload.single('document')` so multer's errors come back as JSON instead of Express's HTML error page:

| Multer error | Response |
|---|---|
| `LIMIT_FILE_SIZE` | `413` "The document is too large. Please choose a PDF of 5 MB or less." |
| Any other `MulterError` (not a PDF, wrong field, too many files) | `400` "Only PDF documents can be translated. Please choose a .pdf file." |

#### Step 1: Check the upload and the languages

| Check | Response |
|---|---|
| No file under `document` | `400` "Choose a PDF document to translate." |
| First 5 bytes aren't `%PDF-` | `400` "Only PDF documents can be translated..." |
| Invalid `targetLanguage` | `400` "Please choose a valid target language" |
| Invalid `sourceLanguage` (when not auto) | `400` "Please choose a valid source language" |
| `sourceLanguage === targetLanguage` | `400` "Target language must differ from the source language" |

The `fileFilter` only checks the file **name and MIME type**, which the browser sets and the client controls. The `%PDF-` signature check confirms the **content** is really a PDF.

#### Step 2: Extract the text

```js
const parser = new PDFParse({ data: buffer });
const result = await parser.getText({ pageJoiner: '' });// No "-- 1 of 3 --" page markers
await parser.destroy();// Always, in a finally block
```

The text is then normalised by `normaliseText()` (see [3.2](#32-utility-functions)).

| Result | Response |
|---|---|
| Password-protected PDF | `400` "This PDF is password protected..." |
| Corrupt or unreadable PDF | `400` "This PDF could not be read..." |
| No text (a scanned PDF is only images) | `422` "No readable text was found in this PDF. Scanned documents are not supported." |
| More than `MAX_DOCUMENT_TEXT_LENGTH` (20 000) characters | `413` "This document has N characters. Documents can hold up to 20000 characters." |

The 20 000 limit matches the schema, so anything that translates successfully can also be saved.

#### Step 3: Translate in pieces

Langbly accepts at most `MAX_TRANSLATION_CHARS` (10 000) characters per request, so `splitIntoChunks()` splits longer text and the pieces are sent **one after another**:

```js
for (const chunk of chunks) {
    const data = await langblyRequest('', {
        method: 'POST',
        signal,// clientAbortSignal(res): stops if the browser leaves
        body: { q: chunk.text, target: targetLanguage, ...(resolvedSource ? { source: resolvedSource } : {}), format: 'text' },
    });
    if (!resolvedSource) {
        detectedLanguage = translation.detectedSourceLanguage || null;
        resolvedSource = detectedLanguage;// Later pieces use the detected language
    }
    translatedText += translation.translatedText + chunk.separator;
}
```

| Detail | Why |
|---|---|
| Sequential, not parallel | Keeps the request rate to Langbly low, and lets auto-detect decide the language once |
| With auto-detect, only the first piece is sent without `source` | Every piece is then translated **from the same language**, so one document can't come back as a mix |
| `chunk.separator` | Each piece remembers the break it was cut at (`\n\n`, `\n` or a space), so the translation keeps the document's layout |
| `clientAbortSignal(res)` | If the user closes the page, the remaining Langbly calls are cancelled instead of spending quota |

Each Langbly call has its own 15-second timeout (`LANGBLY_TIMEOUT_MS`). Langbly errors are mapped by `langblyRequest` and sent by `sendError`: **400** (text or language rejected), **429** (quota or rate limit), **502** (unreachable, timed out, bad API key, or no translation returned).

If auto-detect finds the document is **already in the target language**, the route returns `400` "This document is already in English. Choose a different target language." instead of a "translation" that's the same text.

#### Response (200)

```json
{
  "fileName": "Huurkontrak.pdf",
  "sourceText": "Hierdie ooreenkoms word aangegaan tussen...",
  "translatedText": "This agreement is entered into between...",
  "sourceLanguage": "af",
  "targetLanguage": "en",
  "detectedLanguage": "af",
  "detectedLanguageName": "Afrikaans",
  "provider": "langbly",
  "pageCount": 3,
  "characterCount": 8412
}
```

| Field | Notes |
|---|---|
| `sourceText` | Sent back so SAVE can store it **without uploading the PDF again** |
| `sourceLanguage` | The language actually translated from: the user's choice, or the detected language with auto-detect. `null` if auto-detect couldn't tell. |
| `detectedLanguage` / `detectedLanguageName` | Only set with auto-detect; `DocTranslator` shows "DETECTED: Afrikaans" |
| `fileName` | The original file name (UTF-8, cut to 255 characters). `DocTranslator` uses it to name the downloaded `.txt` file. |

---

### 1.5. POST `/document/saveDoc`

**Purpose:** Save the result of `POST /document/translateDoc` to the user's history.

#### Request body

```json
{
  "fileName": "Huurkontrak.pdf",
  "sourceText": "Hierdie ooreenkoms word aangegaan tussen...",
  "translatedText": "This agreement is entered into between...",
  "sourceLanguage": "af",
  "targetLanguage": "en",
  "pageCount": 3
}
```

| Field | Required | Rules |
|---|---|---|
| `fileName` | ✅ | A non-empty string, max 255 characters (schema) |
| `sourceText` | ✅ | A non-empty string, max 20 000 characters (schema) |
| `translatedText` | ✅ | A non-empty string, max 40 000 characters (schema) |
| `sourceLanguage` | ✅ | A non-empty string; format checked by the schema |
| `targetLanguage` | ✅ | A non-empty string; format and source ≠ target checked by the schema |
| `pageCount` | ❌ | A whole number ≥ 0, otherwise stored as `0` |

`DocTranslator` also sends `provider` and `characterCount`. Both are **ignored**: `provider` is always `"langbly"`, and `characterCount` is worked out from `sourceText` by a schema hook, so the client can't fake usage numbers.

#### Steps

1. **Required strings:** `fileName`, `sourceText`, `translatedText` and `targetLanguage` must be non-empty strings, otherwise `400` "Translate a document before saving". The `typeof` check also blocks operator injection.
2. **Source language:** checked on its own, because auto-detect can return `sourceLanguage: null` after a successful translation. `400` "Choose the source language before saving".
3. **Skip duplicates:** if an identical **non-trashed** row already exists (same file name, languages and text), it's returned with `200` instead of saving a second copy.
4. **Create:** the row is built from **named fields**, so the client can't set `userId`, `isArchived`, `deletedAt` or anything else.

#### Responses

**201**: a new document translation was saved.

```json
{
  "message": "Document translation saved to your history",
  "created": true,
  "documentTranslationId": "6740...",
  "document": { "_id": "6740...", "fileName": "Huurkontrak.pdf", "characterCount": 8412, "...": "..." }
}
```

**200**: an identical one was already saved.

```json
{ "message": "Document translation already saved", "created": false, "documentTranslationId": "6740...", "document": { "...": "..." } }
```

In both cases `document` leaves out the text, because it's already on the client's screen. `DocTranslator` shows `message` under the SAVE button and logs `documentTranslationId`.

| Error | Status |
|---|---|
| Missing or blank text, file name or target language | `400` "Translate a document before saving" |
| Missing source language | `400` "Choose the source language before saving" |
| `ValidationError` (bad language code, same source and target, text too long, etc.) | `400` + the first schema message |
| Anything else | `500` |

---

### 1.6. PATCH `/document/:id/restore`

**Purpose:** Move a trashed document translation back to the main list.

```js
const document = await DocTranslation.findOneAndUpdate(
    { _id: id, userId, deletedAt: { $ne: null } },// Must be the user's AND in the trash
    { $set: { deletedAt: null, isArchived: false, archivedAt: null } },
    { returnDocument: 'after' }
).select('_id fileName');
```

| Part | Why |
|---|---|
| `deletedAt: { $ne: null }` | Only a row that's actually in the trash can be restored |
| `deletedAt: null` | Takes it out of the trash **and** out of the 30-day TTL purge (the TTL index ignores `null`) |
| `isArchived: false, archivedAt: null` | Restores to the **main list**, never the archive |

**Response (200):** `{ "message": "Document translation restored", "document": { "_id": "6740...", "fileName": "Huurkontrak.pdf" } }`

**400** "Invalid document id". **404** "Document translation not found in trash" if it doesn't exist, isn't the user's, or isn't in the trash.

---

### 1.7. DELETE `/document/:id`

**Purpose:** Move an **active** document translation to the trash (soft delete). It can be restored for 30 days.

```js
const document = await DocTranslation.findOneAndUpdate(
    { _id: id, userId, isArchived: { $ne: true }, deletedAt: null },// The user's, active only
    { $set: { deletedAt: new Date(), isArchived: false, archivedAt: null } }
).select('_id fileName');
```

| Part | Why |
|---|---|
| `isArchived: { $ne: true }` | Archived rows are trashed through their own route, `DELETE /archive/document/:id` |
| `deletedAt: null` in the filter | A row that's already in the trash returns 404 instead of having its 30-day timer reset |
| `deletedAt: new Date()` | Moves it to the trash and starts the TTL countdown |

**Response (200):** `{ "message": "Document translation moved to trash", "document": { "_id": "6740...", "fileName": "Huurkontrak.pdf" } }`

**400** "Invalid document id". **404** "Document translation not found" if it doesn't exist, isn't the user's, is archived, or is already in the trash.

---

### 1.8. DELETE `/document/:id/permanent`

**Purpose:** Permanently delete one document translation from the trash.

```js
const document = await DocTranslation.findOneAndDelete(
    { _id: id, userId, deletedAt: { $ne: null } }// Must be the user's AND in the trash
).select('_id fileName');
```

Requiring `deletedAt: { $ne: null }` means an **active** row can't be wiped in one step. It has to go through the trash first, so a wrong click can always be undone.

**Response (200):** `{ "message": "Document translation permanently deleted", "document": { "_id": "6740...", "fileName": "Huurkontrak.pdf" } }`

**400** "Invalid document id". **404** "Document translation not found in trash" if it doesn't exist, isn't the user's, or isn't in the trash.

---

## 2. IMPORTS AND SETUP

```js
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const { PDFParse } = require('pdf-parse');
const DocTranslation = require('../models/docTranslateSchema');
const { MAX_DOCUMENT_TEXT_LENGTH } = require('../models/docTranslateSchema');
const { checkJwtToken } = require('../middleware/securityMiddleware');
const { translateLimiter } = require('../middleware/rateLimitMiddleware');
const { languageCodeRegex, MAX_TRANSLATION_CHARS } = require('../util/schemaUtil');
const { parsePagination, paginationInfo } = require('../util/apiUtil');
const { LANGUAGE_NAMES, LangblyError, langblyRequest, sendError, clientAbortSignal } = require('../util/langblyUtil');
const { trashExpiredArchivedDocuments } = require('../util/archiveUtil');
const router = express.Router()
```

| Import | Used For |
|---|---|
| `express` | `express.Router()` |
| `mongoose` | `ObjectId.isValid()` for `:id` |
| `multer` | Reads the `multipart/form-data` upload in `POST /translateDoc` |
| `PDFParse` | Extracts the text and page count from the PDF |
| `DocTranslation` | The model this router manages |
| `MAX_DOCUMENT_TEXT_LENGTH` | The 20 000-character limit, shared with the schema |
| `checkJwtToken` | Auth on every route; sets `req.user.id` |
| `translateLimiter` | Rate limit on `POST /translateDoc`, which spends Langbly quota |
| `languageCodeRegex` | Validates `sourceLanguage` and `targetLanguage` in `POST /translateDoc` |
| `MAX_TRANSLATION_CHARS` | The Langbly per-request limit used by `splitIntoChunks()` |
| `parsePagination`, `paginationInfo` | Paging for `GET /fetchDocuments` and `GET /trash` |
| Langbly helpers | Calling Langbly, mapping its errors, and cancelling when the browser leaves (see [3.2](#32-utility-functions)) |
| `trashExpiredArchivedDocuments` | `GET /trash`: applies the 60-day archive rule for this user before listing |

**Upload settings**

```js
const MAX_FILE_SIZE_MB = 5;// Matches MAX_FILE_SIZE_MB in client/src/util/formUtil.js

const upload = multer({
    storage: multer.memoryStorage(),// The PDF is never written to disk
    limits: { fileSize: MAX_FILE_SIZE_BYTES, files: 1, fields: 5 },
    defParamCharset: 'utf8',// Keeps names like "Résumé.pdf" readable
    fileFilter: /* .pdf name or application/pdf MIME type only */
});
```

The 5 MB limit is set in **two places**: here and in [formUtil.js](../client/src/util/formUtil.js). The client checks first so the user isn't made to wait for an upload the server would refuse; the server check is the one that's enforced.

---

## 3. SCHEMAS AND UTILITY FUNCTIONS

### 3.1. SCHEMAS

#### DOCUMENT TRANSLATION SCHEMA

Defined in [docTranslateSchema.js](../server/models/docTranslateSchema.js) (model name `DocumentTranslation`):

| Field | Type | Set By |
|---|---|---|
| `userId` | ObjectId → User | The route (from the token) |
| `fileName` | String, max 255 | The client (from `translateDoc`'s response) |
| `sourceText` | String, max 20 000 | The client (from `translateDoc`'s response) |
| `translatedText` | String, max 40 000 (translations can run longer than the source) | The client |
| `sourceLanguage` | Language code (`languageCodeRegex`) | The client |
| `targetLanguage` | Language code, must differ from `sourceLanguage` | The client |
| `provider` | String, default `"langbly"` | The route |
| `pageCount` | Number ≥ 0 | The client (checked by `toPageCount()`) |
| `characterCount` | Number ≥ 0 | **A schema hook** (`sourceText.length`) |
| `isArchived` | Boolean, default `false` | `archiveRoutes.js`; reset by this router |
| `archivedAt` | Date or `null` | `archiveRoutes.js`; reset by this router |
| `deletedAt` | Date or `null` (a date = in the trash) | This router (and the archive sweep) |
| `createdAt` / `updatedAt` | Date | `timestamps: true` |

> **Note:** the owner field is **`userId`**, not `user` as in the note and translation schemas. Every query in this router and in `archiveRoutes.js` uses `userId`, and `trashExpired()` in `archiveUtil.js` takes the owner field name as a parameter for this reason.

**Indexes**

| Index | Used For |
|---|---|
| `{ userId: 1 }` | Single-field owner lookups |
| `{ userId: 1, createdAt: -1 }` | `GET /fetchDocuments`: newest first |
| `{ userId: 1, isArchived: 1, deletedAt: 1, archivedAt: -1 }` | `GET /archive/fetchDocuments` |
| `{ isArchived: 1, archivedAt: 1 }` | The 60-day archive sweep |
| `{ deletedAt: 1 }` with `expireAfterSeconds: THIRTY_DAYS_IN_SECONDS` | **TTL purge**: MongoDB deletes a row 30 days after it was trashed |

**Hooks**

| Name | What it does |
|---|---|
| `pre('validate')` | Sets `characterCount` from `sourceText` whenever the text changes |
| `toJSON` transform | Removes `__v` from documents sent with `res.json()` |

##### Lifecycle

A document translation is always in exactly one of three states:

| State | `isArchived` | `deletedAt` | Shown In |
|---|---|---|---|
| **Active** | `false` (or missing) | `null` | `GET /document/fetchDocuments` |
| **Archived** | `true` | `null` | `GET /archive/fetchDocuments` |
| **Trashed** | `false` | a date | `GET /document/trash` |

```
            saveDoc                 PATCH /archive/document/:id
   ──────────────► ACTIVE ◄──────────────────────────────────────► ARCHIVED
                   │  ▲      PATCH /archive/document/:id/restore      │
       DELETE /:id │  │ PATCH /:id/restore                            │ DELETE /archive/document/:id
                   ▼  │                                               │ or 60 days after archiving (sweep)
                   TRASHED ◄──────────────────────────────────────────┘
                     │
                     │ DELETE /:id/permanent, or 30 days later (TTL index)
                     ▼
                   gone
```

Every route that moves a row into or out of the trash also sets `isArchived: false, archivedAt: null`, so a trashed row is never "archived" as well, and restoring it always returns it to the **main list**.

### 3.2. UTILITY FUNCTIONS

**Defined in this router**

| Function | Used By | What it does |
|---|---|---|
| `uploadDocument(req, res, next)` | `POST /translateDoc` | Runs `upload.single('document')` and turns multer errors into JSON `400` / `413` responses |
| `normaliseText(text)` | `extractPdfText()` | `\r\n` → `\n`, removes trailing spaces, collapses 3+ newlines to one blank line, trims |
| `splitIntoChunks(text, max)` | `POST /translateDoc` | Splits text into pieces of at most `MAX_TRANSLATION_CHARS`, cutting at a paragraph break, then a line break, then a space. Each piece keeps its separator. |
| `extractPdfText(buffer)` | `POST /translateDoc` | Returns `{ text, pageCount }`. Throws a `400`-flagged error for password-protected or unreadable PDFs, and always calls `parser.destroy()` |
| `toPageCount(value)` | `POST /saveDoc` | A whole number ≥ 0, otherwise `0` |

`splitIntoChunks()` only cuts at a break if it's in the **second half** of the allowed length, so pieces aren't made needlessly small. If there's no break at all, it cuts at the limit.

**Shared**

| Function | File | Used By | What it does |
|---|---|---|---|
| `langblyRequest(path, options)` | [langblyUtil.js](../server/util/langblyUtil.js) | `POST /translateDoc` | Calls Langbly with the server's API key and a 15 s timeout; throws `LangblyError(400 / 429 / 502)` |
| `sendError(res, route, error, file)` | [langblyUtil.js](../server/util/langblyUtil.js) | `POST /translateDoc` | Sends a `LangblyError` with its status, anything else as `500` |
| `clientAbortSignal(res)` | [langblyUtil.js](../server/util/langblyUtil.js) | `POST /translateDoc` | An `AbortSignal` that fires if the browser disconnects |
| `LANGUAGE_NAMES` | [langblyUtil.js](../server/util/langblyUtil.js) | `POST /translateDoc` | Code → name, for `detectedLanguageName` and the "already in" message |
| `parsePagination`, `paginationInfo` | [apiUtil.js](../server/util/apiUtil.js) | `GET /fetchDocuments`, `GET /trash` | Safe `page` / `limit` numbers, and the `pagination` response object |
| `trashExpiredArchivedDocuments(userId)` | [archiveUtil.js](../server/util/archiveUtil.js) | `GET /trash` (and the hourly sweep) | Moves rows archived more than 60 days ago to the trash |
| `languageCodeRegex` | [schemaUtil.js](../server/util/schemaUtil.js) | `POST /translateDoc`, schema | `/^[a-z]{2,3}(-[A-Za-z]{2,4})?$/`, e.g. `en`, `af`, `zh-CN` |

---

## 4. SECURITY

### 4.1. PACKAGES

| Package | Where | Security role |
|---|---|---|
| `jsonwebtoken` | `securityMiddleware.js` | Verifies the session JWT in `checkJwtToken` |
| `cookie-parser` | `app.js` | Reads the HTTP-only `token` cookie into `req.cookies` |
| `helmet` | `app.js` | Sets secure HTTP response headers for every route |
| `express-rate-limit` | `rateLimitMiddleware.js` | `translateLimiter` on `POST /translateDoc` |
| `multer` | This router | Enforces the 5 MB, one-file, five-field limits while the upload is read, and keeps the file in memory only |
| `pdf-parse` | This router | Reads the PDF's text. Only the text is kept; the file is discarded. |

### 4.2. MIDDLEWARE

| Middleware | File | Routes | What it does |
|---|---|---|---|
| `checkJwtToken` | [securityMiddleware.js](../server/middleware/securityMiddleware.js) | All | **401** if the cookie is missing, the token is invalid or expired, the user no longer exists, or the session was signed out. Sets `req.user`. |
| `translateLimiter` | [rateLimitMiddleware.js](../server/middleware/rateLimitMiddleware.js) | `POST /translateDoc` | **429** after 100 requests per 15 minutes per IP. It's the **same limiter instance** as `POST /api/language/translate/v2`, so text and document translations share one budget. |
| `uploadDocument` | This router | `POST /translateDoc` | Runs multer and returns JSON errors (see [1.4](#14-post-documenttranslatedoc)) |

Only `POST /translateDoc` has a rate limiter, because it's the only route that spends Langbly quota. The others only touch the user's own rows in MongoDB.

**Patterns shared by every route**

| Pattern | Why |
|---|---|
| `userId` comes from `req.user.id`, never the request | A user can't act on someone else's data by sending a different ID |
| `mongoose.Types.ObjectId.isValid(id)` before querying | Turns a `CastError` (500) into a clean 400 |
| `typeof ... === 'string'` on body values | Blocks operator injection such as `{ "fileName": { "$ne": "" } }` |
| Ownership **and** state in one filter | Another user's row returns **404**, not 403, so IDs can't be probed |
| Auth runs **before** the upload is read | Anonymous clients can't make the server buffer files |
| `%PDF-` signature check | The file name and MIME type are chosen by the client; the content check isn't |
| Rows built from **named fields** in `POST /saveDoc` | The client can't set `userId`, `characterCount`, `provider`, `isArchived` or `deletedAt` |
| Permanent delete only works on trashed rows | A wrong click can always be undone |
| `try / catch` → `500 "Internal Server Error"` | Internal error details aren't sent to the client |

---

## 5. STATUS CODE REFERENCES

| Code | Route(s) | When |
|---|---|---|
| `200` | fetchDocuments, trash, fetchDoc, translateDoc, restore, delete, permanent | Success (including an empty list) |
| `200` | saveDoc | An identical document translation was already saved (`created: false`) |
| `201` | saveDoc | Document translation saved (`created: true`) |
| `400` | fetchDoc, restore, delete, permanent | `:id` isn't a valid ObjectId |
| `400` | translateDoc | No file, not a PDF, invalid or matching languages, password-protected or unreadable PDF, already in the target language, or Langbly rejected the text |
| `400` | saveDoc | A missing or blank field, a missing source language, schema validation |
| `401` | all | (From `checkJwtToken`) Not logged in, or the token is invalid, expired or signed out |
| `404` | fetchDoc | Not found, or not the user's |
| `404` | delete | Not found, not the user's, archived, or already in the trash |
| `404` | restore, permanent | Not found, not the user's, or not in the trash |
| `413` | translateDoc | File over 5 MB, or text over 20 000 characters |
| `422` | translateDoc | The PDF has no readable text (scanned document) |
| `429` | translateDoc | `translateLimiter` reached, or Langbly's quota or rate limit reached |
| `500` | all | Unexpected error |
| `502` | translateDoc | Langbly is unreachable, timed out, rejected the API key, or returned no translation |

---

## 6. KNOWN GAPS AND HOUSE KEEPING

### 6.1. GAPS

#### Gap 1: Deleting an account left the user's document translations behind (fixed)

`DELETE /user/deleteUser/:id` in [userRoutes.js](../server/routes/userRoutes.js) now runs `DocTranslation.deleteMany({ userId: id })` in the same `Promise.all` as the notes, notebooks, tags and translations, and includes the count in its log line.

#### Gap 2: No client pages for the history routes (fixed)

[DocTranslationList.js](../client/src/components/DocTranslationList.js) and [TrashArchiveDocs.js](../client/src/components/TrashArchiveDocs.js) now call every history route (see the **Client side usage** table in [1. ROUTE SUMMARY](#1-route-summary)).

#### Gap 3: The duplicate check in `POST /saveDoc` compares full text

The duplicate check filters on `userId` and `fileName` first, then compares `sourceText` and `translatedText` in full (up to 60 000 characters). That's fine for a small history, but `translationSchema` solved the same problem with a `textHash` field and a `{ user, textHash }` index (see [TRANSLATION_ROUTES.md](TRANSLATION_ROUTES.md)). The same approach would work here.

#### Gap 4: `sourceText` and `pageCount` are trusted from the client on save

`POST /saveDoc` stores what the client sends. The values come from `translateDoc`'s response, but a direct API call could save text that never came from a PDF, or a wrong `pageCount`. This only affects the caller's own history, and the schema still enforces the length limits, so it isn't a security risk. It matches how `POST /translation/save` works.

#### Gap 5: Document translations aren't in the export

`exportRoutes.js` exports `notes` and `translations` only.

### 6.2. HOUSE KEEPING

| Issue | Where | Change |
|---|---|---|
| Missing semicolon | `docTranslateRoutes.js`: `const router = express.Router()` | Add `;` to match the other lines |
| `5 MB` limit is defined twice | `docTranslateRoutes.js` and `client/src/util/formUtil.js` | Keep them in step if one changes |
| Label points at the wrong id | `DocTranslator.js`: `htmlFor='docSouceLang'` | `htmlFor='docSourceLang'` (the label isn't linked to the select, which affects screen readers) |
| Typo in a field name | `DocTranslator.js`: `name='sourceLangauge'` | `name='sourceLanguage'` |
| Log prefix names the wrong file | `DocTranslator.js`: `[SUCCESS: TranslateDocument.js]` | `[SUCCESS: DocTranslator.js]` |
| Header comment doesn't mention document translations | `archiveUtil.js`, top comment | Add `GET /document/trash` and `GET /archive/fetchDocuments` as per-user callers |

---

## 7. REFERENCES

**Project files**

- [docTranslateRoutes.js](../server/routes/docTranslateRoutes.js), [archiveRoutes.js](../server/routes/archiveRoutes.js)
- [docTranslateSchema.js](../server/models/docTranslateSchema.js)
- [langblyUtil.js](../server/util/langblyUtil.js), [apiUtil.js](../server/util/apiUtil.js), [archiveUtil.js](../server/util/archiveUtil.js), [schemaUtil.js](../server/util/schemaUtil.js)
- [securityMiddleware.js](../server/middleware/securityMiddleware.js), [rateLimitMiddleware.js](../server/middleware/rateLimitMiddleware.js)
- [DocTranslator.js](../client/src/components/DocTranslator.js), [DocTranslationList.js](../client/src/components/DocTranslationList.js), [TrashArchiveDocs.js](../client/src/components/TrashArchiveDocs.js), [formUtil.js](../client/src/util/formUtil.js)
- [API_ROUTES.md](API_ROUTES.md), [ARCHIVE_ROUTES.md](ARCHIVE_ROUTES.md), [TRANSLATION_ROUTES.md](TRANSLATION_ROUTES.md), [GLOSSARY.md](../GLOSSARY.md)

**External documentation**

- [Express: Routing](https://expressjs.com/en/guide/routing.html)
- [Multer](https://github.com/expressjs/multer)
- [pdf-parse](https://www.npmjs.com/package/pdf-parse)
- [Mongoose: Queries](https://mongoosejs.com/docs/queries.html)
- [Mongoose: Middleware (hooks)](https://mongoosejs.com/docs/middleware.html)
- [MongoDB: TTL Indexes](https://www.mongodb.com/docs/manual/core/index-ttl/)
- [MDN: Using FormData objects](https://developer.mozilla.org/en-US/docs/Web/API/FormData/Using_FormData_Objects)
- [MDN: HTTP response status codes](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status)
