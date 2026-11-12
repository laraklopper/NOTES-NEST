// exportRoutes.js
/*mounted at /export by app.js
GET - '/' - Download the user's notes or translations as a .csv or .xlsx file
    Query: type = 'notes' | 'translations' (required), format = 'csv' | 'xlsx' (required)
    Optional filters (the same ones the lists use, so a filtered list exports as shown):
      notes:        language (code), notebook (ObjectId), tag (ObjectId)
      translations: sourceLanguage (code), targetLanguage (code)
*/
/* Load environment variables from a .env
file using the dotenv package*/
require('dotenv').config()
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
const {FORMATS, MAX_EXPORT_ROWS} = require('../util/apiUtil')
const router = express.Router()// Create Express router instance


// Language code -> name, e.g. 'af' -> 'Afrikaans' (unknown codes are shown as-is)
const LANGUAGE_NAMES = Object.fromEntries(languageData.map(({ code, name }) => [code, name]));
const languageName = (code) => (code ? (LANGUAGE_NAMES[code] || code) : '');

// ISO date and time without the milliseconds, e.g. "2026-11-09 14:03:22"
const formatDate = (date) => (date ? new Date(date).toISOString().replace('T', ' ').slice(0, 19) : '');

/* Stops spreadsheet apps running cell text as a formula (CSV/formula injection).
A value starting with = + - @ (or tab/carriage return) gets a leading apostrophe */
const safeCell = (value) => {
    if (typeof value !== 'string') return value;
    return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
};

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
     - fetch(filter):              the rows from the database
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
        fetch: (filter) => Note.find(filter)
            .sort({ isPinned: -1, updatedAt: -1 })// Same order as the NotesList table
            .limit(MAX_EXPORT_ROWS)
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
            const filter = { user: userId };
            if (sourceLanguage) filter.sourceLanguage = sourceLanguage;
            if (targetLanguage) filter.targetLanguage = targetLanguage;
            return { filter };
        },
        fetch: (filter) => Translation.find(filter)
            .sort({ createdAt: -1 })// Same order as the TranslationsList table
            .limit(MAX_EXPORT_ROWS)
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

        // Conditional rendering to check the type and format are supported
        const exportType = typeof type === 'string' && Object.hasOwn(EXPORTS, type) ? EXPORTS[type] : null;
        if (!exportType) {
            console.error(`[ERROR: exportRoutes.js, GET /] Invalid export type: ${type}`);// Log an error message in the console for debugging purposes
            return res.status(400).json({ message: 'Invalid export type' });// Return a 400 (Bad Request) status code with a message
        }
        if (!FORMATS.includes(format)) {
            console.error(`[ERROR: exportRoutes.js, GET /] Invalid export format: ${format}`);// Log an error message in the console for debugging purposes
            return res.status(400).json({ message: 'Invalid export format' });// Return a 400 (Bad Request) status code with a message
        }

        const { filter, error } = exportType.buildFilter(userId, req.query);
        if (error) {
            console.error(`[ERROR: exportRoutes.js, GET /] ${error}`);// Log an error message in the console for debugging purposes
            return res.status(400).json({ message: error });// Return a 400 (Bad Request) status code with a message
        }

        const docs = await exportType.fetch(filter);
        const rows = toRows(docs, exportType.columns);
        const file = format === 'csv' ? buildCsv(rows) : buildXlsx(rows, exportType.sheetName);

        // Mark the filename when filters were applied (anything beyond user + the fixed note flags)
        const filtered = Object.keys(filter).some((key) => !['user', 'isArchived', 'deletedAt'].includes(key));
        const date = new Date().toISOString().slice(0, 10);
        const filename = `note-nest-${type}${filtered ? '-filtered' : ''}-${date}.${format}`;

        console.log(`[SUCCESS: exportRoutes.js, GET /] Exported ${docs.length} ${type} as ${format}`);//Log a message in the console for debugging purposes
        res.set({
            'Content-Type': CONTENT_TYPES[format],
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Content-Length': file.length,
            'Cache-Control': 'no-store',// The file holds the user's private data
        });
        return res.status(200).send(file);// Send a 200 (OK) status code with the file
    } catch (error) {
        console.error('[ERROR: exportRoutes.js, GET /]', error.message);// Log an error message in the console for debugging purposes
        return res.status(500).json({ message: 'Internal Server Error' });// Return a 500 (Internal Server Error) status code with a message
    }
})

module.exports = router;
