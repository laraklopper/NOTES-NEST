// apiUtil.js

const LANGBLY_PATH = '/language/translate/v2';// Base path shared by every Langbly endpoint this file calls
const LANGBLY_TIMEOUT_MS = 15000;// Give up on Langbly after 15 seconds (used by AbortSignal.timeout in langblyRequest)
const LANGUAGES_CACHE_MS = 1000 * 60 * 60 * 24;// The language list rarely changes, so cache it for 24 hours (ms * s * min * h)
 

const DEFAULT_LIMIT = 10;// Translations per page when no limit is sent
const MAX_LIMIT = 50;// Upper bound on the page size so one request can't pull the whole collection

const MAX_EXPORT_ROWS = 10000;// Upper bound so one export can't pull an unbounded amount of data
const FORMATS = ['csv', 'xlsx'];//Allowed Export formats

/* Stops spreadsheet apps running cell text as a formula (CSV/formula injection).
A value starting with = + - @ (or tab/carriage return) gets a leading apostrophe */
const safeCell = (value) => {
    if (typeof value !== 'string') return value;
    return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
};

/*──────────────────────────── FILE BUILDERS ─────────────────────────────────*/
// Header row followed by one row per document
const toRows = (docs, columns) => [
    columns.map(([header]) => header),
    ...docs.map((doc) => columns.map(([, getValue]) => safeCell(getValue(doc) ?? ''))),
];

const buildCsv = (rows) => Buffer.from(
    '﻿' + stringify(rows),// BOM so Excel opens accented/non-Latin text as UTF-8
    'utf8'
);

const buildXlsx = (rows, sheetName) => {
    const sheet = XLSX.utils.aoa_to_sheet(rows);
    // Column widths based on the longest value in each column (capped so long text doesn't stretch forever)
    sheet['!cols'] = rows[0].map((_, col) => ({
        wch: Math.min(Math.max(...rows.map((row) => String(row[col] ?? '').length), 10), 60),
    }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
};

const CONTENT_TYPES = {
    csv: 'text/csv; charset=utf-8',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

module.exports = {
    LANGBLY_PATH, LANGBLY_TIMEOUT_MS, 
    LANGUAGES_CACHE_MS,
    DEFAULT_LIMIT,
    MAX_LIMIT,
    MAX_EXPORT_ROWS,
    FORMATS,
    toRows,
    buildCsv,
    buildXlsx,
    CONTENT_TYPES
}