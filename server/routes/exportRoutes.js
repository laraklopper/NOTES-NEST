// exportRoutes.js
/*mounted at /export by app.js
GET - '/' - Download the user's notes or translations as a .csv or .xlsx file
    Query: type = 'notes' | 'translations' (required), format = 'csv' | 'xlsx' (required)
    Optional filters (the same ones the lists use, so a filtered list exports as shown):
      notes:        language (code), notebook (ObjectId), tag (ObjectId)
      translations: sourceLanguage (code), targetLanguage (code)
    Limited to MAX_EXPORT_ROWS rows (X-Export-Truncated: true when cut short) and rate-limited per IP (exportLimiter)
*/
// IMPORT REQUIRED MODULES AND PACKAGES
const express = require('express');//Express framework for building web applications
const mongoose = require('mongoose');// Used to validate ObjectIds
const XLSX = require('xlsx');// Builds the .xlsx workbook
const { stringify } = require('csv-stringify/sync');// Builds the .csv text
// IMPORT SCHEMAS
const Note = require('../models/noteSchema');// Import the Note model
const Translation = require('../models/translationSchema');// Import the Translation model
// IMPORT CUSTOM MIDDLEWARE
const { checkJwtToken } = require('../middleware/securityMiddleware');// Import the JWT middleware
const { exportLimiter } = require('../middleware/rateLimitMiddleware');// Limits exports per IP
const { languageCodeRegex } = require('../util/schemaUtil');// Used to validate the language filters
const { languageData } = require('../util/languageData');// Used to show language names instead of codes
const { MAX_EXPORT_ROWS, EXPORT_TIME_ZONE } = require('../util/apiUtil');// The row cap and the time zone for dates
const router = express.Router();// Create Express router instance

const EXCEL_MAX_CELL_CHARS = 32767;// Excel's per-cell maximum; longer text makes Excel report the .xlsx as damaged
const UTF8_BOM = '﻿';// Byte order mark, so Excel opens accented/non-Latin CSV text as UTF-8

// Language code -> name, e.g. 'af' -> 'Afrikaans' (unknown codes are shown as-is)
const LANGUAGE_NAMES = Object.fromEntries(languageData.map(({ code, name }) => [code, name]));
const languageName = (code) => (code ? (LANGUAGE_NAMES[code] || code) : '');

/* Date and time in South African time, e.g. "2026-11-09 16:03:22".
The sv-SE locale formats dates as YYYY-MM-DD HH:mm:ss, which spreadsheet apps recognise and sort correctly */
const formatDate = (date) => (date ? new Date(date).toLocaleString('sv-SE', { timeZone: EXPORT_TIME_ZONE }) : '');
const todayDate = () => new Date().toLocaleDateString('sv-SE', { timeZone: EXPORT_TIME_ZONE });// e.g. "2026-11-13", for the filename

/* Stops spreadsheet apps running cell text as a formula (CSV/formula injection).
A value starting with = + - @ (or tab/carriage return) gets a leading apostrophe.
Only CSV needs this: .xlsx cells are stored as text and never run as formulas */
const safeCell = (value) => {
    if (typeof value !== 'string') return value;
    return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
};

// Cuts text to Excel's cell limit (.xlsx only; a CSV keeps the full text)
const capCell = (value) => (typeof value === 'string' && value.length > EXCEL_MAX_CELL_CHARS
    ? value.slice(0, EXCEL_MAX_CELL_CHARS)
    : value);

/*──────────────────────────── FILTER HELPERS ─────────────────────────────────
   Same rules as the list routes; used by each buildFilter below
────────────────────────────────────────────────────────────────────────────────*/
// Optional single language code; '' or missing means "any"
const isValidLanguage = (value) => value === undefined || value === ''
    || (typeof value === 'string' && languageCodeRegex.test(value));
// Optional single ObjectId; '' or missing means "any"
const isValidId = (value) => value === undefined || value === ''
    || (typeof value === 'string' && mongoose.Types.ObjectId.isValid(value));

/*──────────────────────────── EXPORT DEFINITIONS ─────────────────────────────
   One entry per `type`. Each one:
     - buildFilter(userId, query): the Mongo filter (same rules as the list routes)
     - fetch(filter, limit):       the rows from the database
     - columns:                    [header, (doc) => cell value]
────────────────────────────────────────────────────────────────────────────────*/
const EXPORTS = {
    notes: {
        sheetName: 'Notes',
        // Same filter as GET /notes/fetchNotes: never archived or trashed notes
        buildFilter: (userId, { language, notebook, tag }) => {
            if (!isValidLanguage(language)) return { error: 'Invalid language code' };
            if (!isValidId(notebook)) return { error: 'Invalid notebook id' };
            if (!isValidId(tag)) return { error: 'Invalid tag id' };
            const filter = { user: userId, isArchived: false, deletedAt: null };
            if (language) filter.language = language;
            if (notebook) filter.notebook = notebook;
            if (tag) filter.tags = tag;// Matches notes whose tags array contains the id
            return { filter };
        },
        fetch: (filter, limit) => Note.find(filter)
            .sort({ isPinned: -1, updatedAt: -1 })// Same order as the NotesList table
            .limit(limit)
            .select('title plainText language notebook tags isPinned createdAt updatedAt')
            .populate('notebook', 'name')
            .populate('tags', 'name')
            .lean(),
        columns: [
            ['Title', (n) => n.title],
            ['Content', (n) => n.plainText],// Plain text rather than the editor's HTML
            ['Language', (n) => languageName(n.language)],
            ['Notebook', (n) => n.notebook?.name || ''],
            ['Tags', (n) => (n.tags || []).map((t) => t?.name).filter(Boolean).join(', ')],
            ['Pinned', (n) => (n.isPinned ? 'Yes' : 'No')],
            ['Date Added', (n) => formatDate(n.createdAt)],
            ['Last Updated', (n) => formatDate(n.updatedAt)],
        ],
    },
    translations: {
        sheetName: 'Translations',
        // Same filter as GET /translation/fetch
        buildFilter: (userId, { sourceLanguage, targetLanguage }) => {
            if (!isValidLanguage(sourceLanguage) || !isValidLanguage(targetLanguage)) {
                return { error: 'Invalid language code' };
            }
            const filter = { user: userId, isArchived: { $ne: true }, deletedAt: null };// Never archived or trashed translations ($ne also matches older docs without the field)
            if (sourceLanguage) filter.sourceLanguage = sourceLanguage;
            if (targetLanguage) filter.targetLanguage = targetLanguage;
            return { filter };
        },
        fetch: (filter, limit) => Translation.find(filter)
            .sort({ createdAt: -1 })// Same order as the TranslationsList table
            .limit(limit)
            .select('sourceText translatedText sourceLanguage targetLanguage characterCount note createdAt')
            .populate('note', 'title')
            .lean(),
        columns: [
            ['Source Text', (t) => t.sourceText],
            ['Source Language', (t) => languageName(t.sourceLanguage)],
            ['Translated Text', (t) => t.translatedText],
            ['Target Language', (t) => languageName(t.targetLanguage)],
            ['Note', (t) => t.note?.title || ''],
            ['Characters', (t) => t.characterCount ?? ''],
            ['Date Added', (t) => formatDate(t.createdAt)],
        ],
    },
};

/*──────────────────────────── FILE BUILDERS ─────────────────────────────────*/
/* Header row followed by one row per document. cleanCell is applied to every
data cell: safeCell for CSV, capCell for .xlsx */
const toRows = (docs, columns, cleanCell) => [
    columns.map(([header]) => header),
    ...docs.map((doc) => columns.map(([, getValue]) => cleanCell(getValue(doc) ?? ''))),
];

const buildCsv = (rows) => Buffer.from(UTF8_BOM + stringify(rows), 'utf8');// Buffer, so Content-Length is in bytes

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

/* One entry per supported `format`: the single source of truth for which formats
are allowed, how each cell is cleaned, how the file is built and its MIME type */
const FILE_FORMATS = {
    csv: {
        contentType: 'text/csv; charset=utf-8',
        cleanCell: safeCell,
        build: (rows) => buildCsv(rows),
    },
    xlsx: {
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        cleanCell: capCell,
        build: (rows, sheetName) => buildXlsx(rows, sheetName),
    },
};

/*──────────────────────────── GET ROUTES ─────────────────────────────────
   GET: READ — Used to fetch information from the database
───────────────────────────────────────────────────────────────────────────*/
/* GET: /export : Sends the user's notes or translations as a file download.
Responds with the file and a Content-Disposition header, e.g.
note-nest-notes-2026-11-09.xlsx (or note-nest-notes-filtered-2026-11-09.csv) */
router.get('/', exportLimiter, checkJwtToken, async (req, res) => {
    try {
        const userId = req.user.id;// Get the authenticated user's ID from the JWT token
        const { type, format } = req.query;

        // Guard clause: check the type and format are supported (hasOwn ignores inherited keys like 'toString')
        const exportType = typeof type === 'string' && Object.hasOwn(EXPORTS, type) ? EXPORTS[type] : null;
        if (!exportType) {
            console.error(`[ERROR: exportRoutes.js, GET /] Invalid export type: ${type}`);// Log an error message in the console for debugging purposes
            return res.status(400).json({ message: 'Invalid export type' });// Return a 400 (Bad Request) status code with a message
        }
        const fileFormat = typeof format === 'string' && Object.hasOwn(FILE_FORMATS, format) ? FILE_FORMATS[format] : null;
        if (!fileFormat) {
            console.error(`[ERROR: exportRoutes.js, GET /] Invalid export format: ${format}`);// Log an error message in the console for debugging purposes
            return res.status(400).json({ message: 'Invalid export format' });// Return a 400 (Bad Request) status code with a message
        }

        // Guard clause: check the filters are valid
        const { filter, error } = exportType.buildFilter(userId, req.query);
        if (error) {
            console.error(`[ERROR: exportRoutes.js, GET /] ${error}`);// Log an error message in the console for debugging purposes
            return res.status(400).json({ message: error });// Return a 400 (Bad Request) status code with a message
        }

        // Fetch one extra row: if it comes back, there were more rows than the cap
        const fetched = await exportType.fetch(filter, MAX_EXPORT_ROWS + 1);
        const truncated = fetched.length > MAX_EXPORT_ROWS;
        const docs = truncated ? fetched.slice(0, MAX_EXPORT_ROWS) : fetched;

        const rows = toRows(docs, exportType.columns, fileFormat.cleanCell);
        const file = fileFormat.build(rows, exportType.sheetName);

        // Mark the filename when filters were applied (anything beyond user + the fixed state flags)
        const filtered = Object.keys(filter).some((key) => !['user', 'isArchived', 'deletedAt'].includes(key));
        const filename = `note-nest-${type}${filtered ? '-filtered' : ''}-${todayDate()}.${format}`;

        console.log(`[SUCCESS: exportRoutes.js, GET /] Exported ${docs.length} ${type} as ${format}${truncated ? ` (truncated at ${MAX_EXPORT_ROWS})` : ''}`);//Log a message in the console for debugging purposes
        res.set({
            'Content-Type': fileFormat.contentType,
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Content-Length': file.length,
            'Cache-Control': 'no-store',// The file holds the user's private data
            'X-Export-Rows': String(docs.length),// How many rows are in the file
            'X-Export-Truncated': String(truncated),// 'true' when there were more than MAX_EXPORT_ROWS rows
        });
        return res.status(200).send(file);// Send a 200 (OK) status code with the file
    } catch (error) {
        console.error('[ERROR: exportRoutes.js, GET /]', error.message);// Log an error message in the console for debugging purposes
        return res.status(500).json({ message: 'Internal Server Error' });// Return a 500 (Internal Server Error) status code with a message
    }
});

module.exports = router;// Export the router to be used in other parts of the application
