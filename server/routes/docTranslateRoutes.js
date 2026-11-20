//docTranslateRoutes.js
/*mounted at '/document' by app.js
GET - /document/fetchDocuments - Lists the current user's saved document translations, newest first (text omitted) (query: page, limit)
GET - /document/trash - Lists trashed document translations (text omitted) (query: page, limit)
GET - /document/fetchDoc/:id - Fetches a single saved document translation in full
POST - /document/translateDoc - Translates an uploaded PDF (multipart form data, nothing is saved)
POST - /document/saveDoc - Saves the document translation on screen
PATCH - /document/:id/restore - Restore a document translation from the trash
DELETE - /document/:id - Soft delete (move to trash)
DELETE - /document/:id/permanent - Permanently delete a trashed translation*/
// IMPORT REQUIRED MODULES AND PACKAGES
const express = require('express');// Import the Express.js library
const mongoose = require('mongoose');// Used to validate ObjectIds
const multer = require('multer');// Reads the multipart/form-data upload
const { PDFParse } = require('pdf-parse');// Extracts the text from the PDF
// IMPORT SCHEMAS
const DocTranslation = require('../models/docTranslateSchema');// Import the DocumentTranslation model
const { MAX_DOCUMENT_TEXT_LENGTH } = require('../models/docTranslateSchema');// Longest text one document may hold
// IMPORT MIDDLEWARE
const { checkJwtToken } = require('../middleware/securityMiddleware');// Import the JWT middleware
const { translateLimiter } = require('../middleware/rateLimitMiddleware');// Same per-IP limit as text translation
// IMPORT UTILITY FUNCTIONS
const { languageCodeRegex, MAX_TRANSLATION_CHARS } = require('../util/schemaUtil');// Language-code pattern and the Langbly per-request limit
const { parsePagination, paginationInfo } = require('../util/apiUtil');// Shared pagination helpers (same as the notes and translations lists)
const { LANGUAGE_NAMES, LangblyError, langblyRequest, sendError, clientAbortSignal } = require('../util/langblyUtil');// Shared Langbly helpers
const { trashExpiredArchivedDocuments } = require('../util/archiveUtil');// 60-day archive rule
const router = express.Router()// Create a new router object using Express

//==============UPLOAD SETTINGS=====================
const MAX_FILE_SIZE_MB = 5;// Matches MAX_FILE_SIZE_MB in client/src/util/formUtil.js
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const PROVIDER = 'langbly';// Stored with every saved document translation

/* The PDF is kept in memory only: it is read once for its text and then
discarded, so nothing the user uploads is ever written to disk. */
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_FILE_SIZE_BYTES, files: 1, fields: 5 },// One PDF plus the two language fields
    defParamCharset: 'utf8',// Keep non-ASCII file names (e.g. "Résumé.pdf") readable
    fileFilter: (req, file, cb) => {
        const isPdf = file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf');
        if (!isPdf) return cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'document'));// Reported as "only PDF" below
        return cb(null, true);
    },
});

/* Runs multer for the single 'document' field and turns its errors into the
JSON responses the client shows, instead of Express's default HTML error page. */
const uploadDocument = (req, res, next) => {
    upload.single('document')(req, res, (error) => {
        if (!error) return next();
        if (error.code === 'LIMIT_FILE_SIZE') {
            console.error('[ERROR: docTranslateRoutes.js, POST /translateDoc] Upload too large');// Log an error message in the console for debugging purposes
            return res.status(413).json({ message: `The document is too large. Please choose a PDF of ${MAX_FILE_SIZE_MB} MB or less.` });// Return a 413 (Payload Too Large) status code with a message
        }
        if (error instanceof multer.MulterError) {
            console.error('[ERROR: docTranslateRoutes.js, POST /translateDoc] Upload rejected:', error.code);// Log an error message in the console for debugging purposes
            return res.status(400).json({ message: 'Only PDF documents can be translated. Please choose a .pdf file.' });// Return a 400 (Bad Request) status code with a message
        }
        console.error('[ERROR: docTranslateRoutes.js, POST /translateDoc] Upload failed:', error.message);// Log an error message in the console for debugging purposes
        return res.status(500).json({ message: 'Internal Server Error' });// Return a 500 (Internal Server Error) status code with a message
    });
}

//==============HELPER FUNCTIONS=====================
/* Function to tidy the text pdf-parse returns: Windows line endings become \n,
trailing spaces are dropped and long runs of blank lines collapse to one. */
const normaliseText = (text) => text
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

/* Function to split the text into pieces Langbly will accept in one request
(MAX_TRANSLATION_CHARS each). It cuts at a paragraph break where it can, then a
line break, then a space, so sentences are not split mid-word. Each piece keeps
the separator it was cut at, so the translated pieces can be joined back with
the same layout. */
const splitIntoChunks = (text, maxLength = MAX_TRANSLATION_CHARS) => {
    const chunks = [];
    let rest = text;
    while (rest.length > maxLength) {
        let separator = '\n\n';
        let cut = rest.lastIndexOf(separator, maxLength);
        if (cut < maxLength / 2) { separator = '\n'; cut = rest.lastIndexOf(separator, maxLength); }
        if (cut < maxLength / 2) { separator = ' '; cut = rest.lastIndexOf(separator, maxLength); }
        if (cut <= 0) { separator = ''; cut = maxLength; }// No break at all: cut at the limit
        chunks.push({ text: rest.slice(0, cut), separator });
        rest = rest.slice(cut + separator.length);
    }
    if (rest) chunks.push({ text: rest, separator: '' });
    return chunks;
}

/* Function to read the text out of an uploaded PDF.
Returns { text, pageCount }. Throws a 400-flagged error for files pdf-parse
cannot open (corrupt or password protected). */
const extractPdfText = async (buffer) => {
    const parser = new PDFParse({ data: buffer });
    try {
        const result = await parser.getText({ pageJoiner: '' });// No "-- 1 of 3 --" page markers in the text
        return { text: normaliseText(result.text || ''), pageCount: result.total || 0 };
    } catch (error) {
        const unreadable = new Error(
            error.name === 'PasswordException'
                ? 'This PDF is password protected. Please remove the password and try again.'
                : 'This PDF could not be read. Please check the file and try again.'
        );
        unreadable.status = 400;
        unreadable.cause = error;
        throw unreadable;
    } finally {
        await parser.destroy().catch(() => {});// Free pdf.js memory whether or not parsing worked
    }
}

// Function to check an optional value is a usable, non-negative whole number
const toPageCount = (value) => {
    const number = Number(value);
    return Number.isInteger(number) && number >= 0 ? number : 0;
}

/*──────────────────────────── GET ROUTES ─────────────────────────────────────
   GET: READ — Used to fetch information from the provider and the database
────────────────────────────────────────────────────────────────────────────────*/
/* GET: /document/fetchDocuments : Lists the signed-in user's saved document
translations, newest first, for the Document Translations table on the
translations page.
Query (all optional): page (>= 1), limit (1-50)
Responds { documents, pagination: { page, limit, total, totalPages } }

The text itself is left out of the rows: a document holds up to 20000
characters either side, so returning it for every row would send megabytes to
fill a table that only shows the file name and the language pair. The details
panel reads the full row from GET /fetchDoc/:id when one is opened. */
router.get('/fetchDocuments', checkJwtToken, async (req, res) => {
    try {
        const userId = req.user.id;// Get the authenticated user's ID from the JWT token
        const { pageNumber, pageSize, skip } = parsePagination(req.query.page, req.query.limit);

        // Only the user's own active document translations (not archived or in the trash)
        // $ne: true also matches rows saved before isArchived was added (field missing)
        const filter = { userId, isArchived: { $ne: true }, deletedAt: null };

        const [documents, total] = await Promise.all([
            DocTranslation.find(filter)
                .sort({ createdAt: -1 })// Matches the { userId, createdAt } index
                .skip(skip)
                .limit(pageSize)
                .select('-sourceText -translatedText -__v')// Text is only sent by GET /fetchDoc/:id
                .lean(),
            DocTranslation.countDocuments(filter)
        ]);

        console.log(`[SUCCESS: docTranslateRoutes.js, GET /fetchDocuments] Fetched ${documents.length} of ${total} document translations`);//Log a message in the console for debugging purposes
        return res.status(200).json({// Send a 200 (OK) status code with the document translations
            documents,
            pagination: paginationInfo(pageNumber, pageSize, total)
        });
    } catch (error) {
        console.error('[ERROR: docTranslateRoutes.js, GET /fetchDocuments]', error.message);// Log an error message in the console for debugging purposes
        return res.status(500).json({ message: 'Internal Server Error' });// Return a 500 (Internal Server Error) status code with a message
    }
})

/* GET: /document/trash : Lists the signed-in user's trashed document translations,
most recently deleted first. The text is left out like /fetchDocuments.
Query (all optional): page (>= 1), limit (1-50)
Responds { documents, pagination: { page, limit, total, totalPages } } */
router.get('/trash', checkJwtToken, async (req, res) => {
    try {
        const userId = req.user.id;// Get the authenticated user's ID from the JWT token
        const { pageNumber, pageSize, skip } = parsePagination(req.query.page, req.query.limit);

        // Apply the 60-day archive rule first so expired archived document translations show in the trash straight away
        await trashExpiredArchivedDocuments(userId);

        const filter = { userId, deletedAt: { $ne: null } };// Anything with a deletion date is in the trash
        const [documents, total] = await Promise.all([
            DocTranslation.find(filter)
                .sort({ deletedAt: -1 })// Most recently trashed first
                .skip(skip)
                .limit(pageSize)
                .select('-sourceText -translatedText -__v')// Text is only sent by GET /fetchDoc/:id
                .lean(),
            DocTranslation.countDocuments(filter)
        ]);

        console.log(`[SUCCESS: docTranslateRoutes.js, GET /trash] Fetched ${documents.length} of ${total} trashed document translations`);//Log a message in the console for debugging purposes
        return res.status(200).json({// Send a 200 (OK) status code with the document translations
            documents,
            pagination: paginationInfo(pageNumber, pageSize, total)
        });
    } catch (error) {
        console.error('[ERROR: docTranslateRoutes.js, GET /trash]', error.message);// Log an error message in the console for debugging purposes
        return res.status(500).json({ message: 'Internal Server Error' });// Return a 500 (Internal Server Error) status code with a message
    }
})

/* GET: /document/fetchDoc/:id : Fetches a single saved document translation in
full, used to fill the Document Translations details panel */
router.get('/fetchDoc/:id', checkJwtToken, async (req, res) => {
    try {
        const { id } = req.params;// Get the document translation ID from the URL

        // Guard clause: the id must be a valid ObjectId (avoids a CastError 500)
        if (!mongoose.Types.ObjectId.isValid(id)) {
            console.error(`[ERROR: docTranslateRoutes.js, GET /fetchDoc/:id] Invalid document id: ${id}`);// Log an error message in the console for debugging purposes
            return res.status(400).json({ message: 'Invalid document id' });// Return a 400 (Bad Request) status code with a message
        }

        const document = await DocTranslation.findOne({
            _id: id,
            userId: req.user.id,// Scoped to the caller, so ids cannot be probed
        }).select('-__v').lean();

        // Guard clause: the document translation must have been found
        if (!document) {
            console.error(`[ERROR: docTranslateRoutes.js, GET /fetchDoc/:id] Document translation not found: ${id}`);// Log an error message in the console for debugging purposes
            return res.status(404).json({ message: 'Document translation not found' });// Return a 404 (Not Found) status code with a message
        }

        console.log('[SUCCESS: docTranslateRoutes.js, GET /fetchDoc/:id] Returned document translation:', document._id);//Log a message in the console for debugging purposes
        return res.status(200).json(document);// Send a 200 (OK) status code with the document translation
    } catch (error) {
        console.error('[ERROR: docTranslateRoutes.js, GET /fetchDoc/:id]', error.message);// Log an error message in the console for debugging purposes
        return res.status(500).json({ message: 'Internal Server Error' });// Return a 500 (Internal Server Error) status code with a message
    }
})

/*──────────────────────────── POST ROUTES ──────────────────────────────
    POST: Used to send a document to the provider, and to save the result
 ─────────────────────────────────────────────────────────────────────────*/
/* POST: /document/translateDoc : Reads the text out of an uploaded PDF and
translates it. Nothing is saved here — the SAVE button sends the result to
POST /document/saveDoc.
Body (multipart/form-data): document (PDF file), sourceLanguage ("auto" or a code), targetLanguage
Responds { fileName, sourceText, translatedText, sourceLanguage, targetLanguage,
detectedLanguage, detectedLanguageName, provider, pageCount, characterCount }

Middleware order: the rate limit and the JWT check run before multer, so an
anonymous or flooding client is turned away before its upload is buffered. */
router.post('/translateDoc', translateLimiter, checkJwtToken, uploadDocument, async (req, res) => {
    try {
        const { sourceLanguage, targetLanguage } = req.body || {};// Text fields sent alongside the file
        const file = req.file;// Set by multer

        // Guard clause: a PDF must have been uploaded under the 'document' field
        if (!file || !file.buffer?.length) {
            console.error('[ERROR: docTranslateRoutes.js, POST /translateDoc] No document uploaded');// Log an error message in the console for debugging purposes
            return res.status(400).json({ message: 'Choose a PDF document to translate.' });// Return a 400 (Bad Request) status code with a message
        }

        // Guard clause: the file must really be a PDF, not just named like one (every PDF starts with "%PDF-")
        if (file.buffer.subarray(0, 5).toString('latin1') !== '%PDF-') {
            console.error(`[ERROR: docTranslateRoutes.js, POST /translateDoc] Not a PDF: ${file.originalname}`);// Log an error message in the console for debugging purposes
            return res.status(400).json({ message: 'Only PDF documents can be translated. Please choose a .pdf file.' });// Return a 400 (Bad Request) status code with a message
        }

        // Guard clause: check the target language is a valid code
        if (typeof targetLanguage !== 'string' || !languageCodeRegex.test(targetLanguage)) {
            console.error('[ERROR: docTranslateRoutes.js, POST /translateDoc] Invalid target language');// Log an error message in the console for debugging purposes
            return res.status(400).json({ message: 'Please choose a valid target language' });// Return a 400 (Bad Request) status code with a message
        }

        // "auto" or a blank source means Langbly detects it during the translation
        const autoDetect = !sourceLanguage || sourceLanguage === 'auto';
        if (!autoDetect && (typeof sourceLanguage !== 'string' || !languageCodeRegex.test(sourceLanguage))) {
            console.error('[ERROR: docTranslateRoutes.js, POST /translateDoc] Invalid source language');// Log an error message in the console for debugging purposes
            return res.status(400).json({ message: 'Please choose a valid source language' });// Return a 400 (Bad Request) status code with a message
        }
        if (!autoDetect && sourceLanguage === targetLanguage) {
            console.error('[ERROR: docTranslateRoutes.js, POST /translateDoc] Source and target languages match');// Log an error message in the console for debugging purposes
            return res.status(400).json({ message: 'Target language must differ from the source language' });// Return a 400 (Bad Request) status code with a message
        }

        // Read the text out of the PDF
        const fileName = (file.originalname || 'document.pdf').slice(0, 255);// Schema limit
        const { text: sourceText, pageCount } = await extractPdfText(file.buffer);

        // Guard clause: scanned PDFs are images with no text layer, so there is nothing to translate
        if (!sourceText) {
            console.error(`[ERROR: docTranslateRoutes.js, POST /translateDoc] No text found in ${fileName}`);// Log an error message in the console for debugging purposes
            return res.status(422).json({ message: 'No readable text was found in this PDF. Scanned documents are not supported.' });// Return a 422 (Unprocessable Content) status code with a message
        }

        // Guard clause: the text must fit in the schema so the result can be saved
        if (sourceText.length > MAX_DOCUMENT_TEXT_LENGTH) {
            console.error(`[ERROR: docTranslateRoutes.js, POST /translateDoc] ${fileName} has ${sourceText.length} characters`);// Log an error message in the console for debugging purposes
            return res.status(413).json({ message: `This document has ${sourceText.length} characters. Documents can hold up to ${MAX_DOCUMENT_TEXT_LENGTH} characters.` });// Return a 413 (Payload Too Large) status code with a message
        }

        /* Langbly takes MAX_TRANSLATION_CHARS per request, so longer documents are
        sent in pieces, one after another. With auto-detect, the first piece
        detects the language and the rest are sent with it, so every piece is
        translated from the same language. */
        const signal = clientAbortSignal(res);// Stop translating if the browser leaves
        const chunks = splitIntoChunks(sourceText);
        let resolvedSource = autoDetect ? null : sourceLanguage;
        let detectedLanguage = null;
        let translatedText = '';

        for (const chunk of chunks) {
            if (!chunk.text.trim()) {// Nothing to translate in a whitespace-only piece
                translatedText += chunk.text + chunk.separator;
                continue;
            }
            const data = await langblyRequest('', {
                method: 'POST',
                signal,
                body: {
                    q: chunk.text,
                    target: targetLanguage,
                    ...(resolvedSource ? { source: resolvedSource } : {}),// Only omitted for the first auto-detect piece
                    format: 'text',// Plain text, so the result is not HTML-escaped
                },
            });

            const translation = data.translations?.[0];
            if (typeof translation?.translatedText !== 'string') {
                throw new LangblyError(502, 'The translation service is unavailable. Please try again later.');// Upstream gave an unusable answer
            }

            if (!resolvedSource) {// First auto-detected piece
                detectedLanguage = translation.detectedSourceLanguage || null;
                resolvedSource = detectedLanguage;// Still null if Langbly could not tell; later pieces then detect too
            }
            translatedText += translation.translatedText + chunk.separator;
        }

        // Guard clause: the detected language is already the target, so the "translation" is the same text
        if (autoDetect && detectedLanguage && detectedLanguage === targetLanguage) {
            console.error(`[ERROR: docTranslateRoutes.js, POST /translateDoc] ${fileName} is already in ${targetLanguage}`);// Log an error message in the console for debugging purposes
            return res.status(400).json({ message: `This document is already in ${LANGUAGE_NAMES[targetLanguage] || targetLanguage}. Choose a different target language.` });// Return a 400 (Bad Request) status code with a message
        }

        console.log(`[SUCCESS: docTranslateRoutes.js, POST /translateDoc] Translated "${fileName}" (${pageCount} page(s), ${sourceText.length} characters, ${chunks.length} request(s)) to ${targetLanguage}`);//Log a message in the console for debugging purposes
        return res.status(200).json({// Send a 200 (OK) status code with the translation
            fileName,
            sourceText,// Sent back so SAVE can store it without uploading the PDF again
            translatedText: translatedText.trim(),
            sourceLanguage: autoDetect ? detectedLanguage : sourceLanguage,// The language actually translated from, ready to save
            targetLanguage,
            detectedLanguage,// Code Langbly detected, or null
            detectedLanguageName: detectedLanguage ? (LANGUAGE_NAMES[detectedLanguage] || detectedLanguage) : null,// Readable name for the UI
            provider: PROVIDER,
            pageCount,
            characterCount: sourceText.length,
        });
    } catch (error) {
        if (error.status === 400 && !(error instanceof LangblyError)) {// Unreadable PDF from extractPdfText
            console.error('[ERROR: docTranslateRoutes.js, POST /translateDoc]', error.cause?.message || error.message);// Log an error message in the console for debugging purposes
            return res.status(400).json({ message: error.message });// Return a 400 (Bad Request) status code with a message
        }
        return sendError(res, 'POST /translateDoc', error, 'docTranslateRoutes.js');// LangblyError -> its status; anything else -> 500
    }
})

/* POST: /document/saveDoc : Saves the result of POST /document/translateDoc for
the signed-in user.
Body: { fileName, sourceText, translatedText, sourceLanguage, targetLanguage, pageCount? }
(provider and characterCount are set by the server, not taken from the body)
Responds { message, created, documentTranslationId, document } */
router.post('/saveDoc', checkJwtToken, async (req, res) => {
    try {
        const userId = req.user.id;// Get the authenticated user's ID from the JWT token
        const { fileName, sourceText, translatedText, sourceLanguage, targetLanguage, pageCount } = req.body || {};// Extract the fields from the request body

        // Guard clause: the text fields must be non-empty strings (so none can inject query operators)
        if ([fileName, sourceText, translatedText, targetLanguage].some((field) => typeof field !== 'string' || !field.trim())) {
            console.error('[ERROR: docTranslateRoutes.js, POST /saveDoc] Missing document translation fields');// Log an error message in the console for debugging purposes
            return res.status(400).json({ message: 'Translate a document before saving' });// Return a 400 (Bad Request) status code with a message
        }

        // Guard clause: checked on its own because auto-detect can return no source language (null)
        if (typeof sourceLanguage !== 'string' || !sourceLanguage.trim()) {
            console.error('[ERROR: docTranslateRoutes.js, POST /saveDoc] Missing source language');// Log an error message in the console for debugging purposes
            return res.status(400).json({ message: 'Choose the source language before saving' });// Return a 400 (Bad Request) status code with a message
        }

        /* An identical active document translation is already saved: return it instead
        of creating a duplicate (e.g. SAVE pressed again after a page reload) */
        const existing = await DocTranslation.findOne({
            userId,
            fileName: fileName.trim(),
            sourceLanguage,
            targetLanguage,
            sourceText: sourceText.trim(),
            translatedText: translatedText.trim(),
            deletedAt: null
        }).select('-sourceText -translatedText -__v').lean();
        if (existing) {
            console.log(`[SUCCESS: docTranslateRoutes.js, POST /saveDoc] Document translation already saved: ${existing._id}`);//Log a message in the console for debugging purposes
            return res.status(200).json({// Send a 200 (OK) status code with the existing document translation
                message: 'Document translation already saved',
                created: false,
                documentTranslationId: existing._id,
                document: existing
            });
        }

        const newDocument = await DocTranslation.create({// Validate and save (characterCount is set by the schema hook)
            userId,
            fileName,
            sourceText,
            translatedText,
            sourceLanguage,
            targetLanguage,
            provider: PROVIDER,
            pageCount: toPageCount(pageCount),
        });

        // The text is already on the client's screen, so only the row details are sent back
        const { sourceText: _source, translatedText: _translated, __v, ...document } = newDocument.toObject();

        console.log(`[SUCCESS: docTranslateRoutes.js, POST /saveDoc] Document translation saved: ${newDocument._id}`);//Log a message in the console for debugging purposes
        return res.status(201).json({// Send a 201 (Created) status code with the new document translation
            message: 'Document translation saved to your history',
            created: true,
            documentTranslationId: newDocument._id,
            document
        });
    } catch (error) {
        // Mongoose schema validation failed: send the first validation message back to the client
        if (error.name === 'ValidationError') {
            const firstMessage = Object.values(error.errors)[0]?.message;
            console.error('[ERROR: docTranslateRoutes.js, POST /saveDoc] Validation failed:', error.message);// Log an error message in the console for debugging purposes
            return res.status(400).json({ message: firstMessage || 'Invalid document translation details' });// Return a 400 (Bad Request) status code with a message
        }
        console.error('[ERROR: docTranslateRoutes.js, POST /saveDoc]', error.message);// Log an error message in the console for debugging purposes
        return res.status(500).json({ message: 'Internal Server Error' });// Return a 500 (Internal Server Error) status code with a message
    }
})

/*──────────────────────────── PATCH ROUTES ───────────────────────────────
   PATCH: UPDATE — Used to partially update information in the database
 ───────────────────────────────────────────────────────────────────────────*/
/* PATCH: /document/:id/restore : Restores one of the signed-in user's trashed
document translations to the main document list by clearing deletedAt, which
also takes it out of the 30-day TTL purge */
router.patch('/:id/restore', checkJwtToken, async (req, res) => {
    try {
        const userId = req.user.id;// Get the authenticated user's ID from the JWT token
        const { id } = req.params;// Get the document translation ID from the URL

        // Guard clause: the id must be a valid ObjectId (avoids a CastError 500)
        if (!mongoose.Types.ObjectId.isValid(id)) {
            console.error(`[ERROR: docTranslateRoutes.js, PATCH /:id/restore] Invalid document id: ${id}`);// Log an error message in the console for debugging purposes
            return res.status(400).json({ message: 'Invalid document id' });// Return a 400 (Bad Request) status code with a message
        }

        // Only a document translation the user owns that is in the trash can be restored
        const document = await DocTranslation.findOneAndUpdate(
            { _id: id, userId, deletedAt: { $ne: null } },
            { $set: { deletedAt: null, isArchived: false, archivedAt: null } },
            { returnDocument: 'after' }// Return the document translation AFTER the update
        ).select('_id fileName');

        // Guard clause: the document translation must have been found
        if (!document) {
            console.error(`[ERROR: docTranslateRoutes.js, PATCH /:id/restore] Trashed document translation not found: ${id}`);// Log an error message in the console for debugging purposes
            return res.status(404).json({ message: 'Document translation not found in trash' });// Return a 404 (Not Found) status code with a message
        }

        console.log(`[SUCCESS: docTranslateRoutes.js, PATCH /:id/restore] Document translation restored from trash: ${id}`);//Log a message in the console for debugging purposes
        return res.status(200).json({ message: 'Document translation restored', document });// Send a 200 (OK) status code with a message and the document translation
    } catch (error) {
        console.error('[ERROR: docTranslateRoutes.js, PATCH /:id/restore]', error.message);// Log an error message in the console for debugging purposes
        return res.status(500).json({ message: 'Internal Server Error' });// Return a 500 (Internal Server Error) status code with a message
    }
})

/*──────────────────────────── DELETE ROUTES ───────────────────────────────
    DELETE: Used to remove an item from the database
 ───────────────────────────────────────────────────────────────────────────*/
/* DELETE: /document/:id : Moves one of the signed-in user's active document
translations to the trash (soft delete) by setting deletedAt. The TTL index on
deletedAt (docTranslateSchema) purges it after 30 days */
router.delete('/:id', checkJwtToken, async (req, res) => {
    try {
        const userId = req.user.id;// Get the authenticated user's ID from the JWT token
        const { id } = req.params;// Get the document translation ID from the URL

        // Guard clause: the id must be a valid ObjectId (avoids a CastError 500)
        if (!mongoose.Types.ObjectId.isValid(id)) {
            console.error(`[ERROR: docTranslateRoutes.js, DELETE /:id] Invalid document id: ${id}`);// Log an error message in the console for debugging purposes
            return res.status(400).json({ message: 'Invalid document id' });// Return a 400 (Bad Request) status code with a message
        }

        // Only an active document translation the user owns can be moved to the trash here
        const document = await DocTranslation.findOneAndUpdate(
            { _id: id, userId, isArchived: { $ne: true }, deletedAt: null },
            { $set: { deletedAt: new Date(), isArchived: false, archivedAt: null } }
        ).select('_id fileName');

        // Guard clause: the document translation must have been found
        if (!document) {
            console.error(`[ERROR: docTranslateRoutes.js, DELETE /:id] Document translation not found: ${id}`);// Log an error message in the console for debugging purposes
            return res.status(404).json({ message: 'Document translation not found' });// Return a 404 (Not Found) status code with a message
        }

        console.log(`[SUCCESS: docTranslateRoutes.js, DELETE /:id] Document translation moved to trash: ${id}`);//Log a message in the console for debugging purposes
        return res.status(200).json({ message: 'Document translation moved to trash', document });// Send a 200 (OK) status code with a message and the document translation
    } catch (error) {
        console.error('[ERROR: docTranslateRoutes.js, DELETE /:id]', error.message);// Log an error message in the console for debugging purposes
        return res.status(500).json({ message: 'Internal Server Error' });// Return a 500 (Internal Server Error) status code with a message
    }
})

/* DELETE: /document/:id/permanent : Permanently deletes one of the signed-in
user's trashed document translations. Only ones already in the trash can be
deleted this way, so an active translation can't be wiped in one step */
router.delete('/:id/permanent', checkJwtToken, async (req, res) => {
    try {
        const userId = req.user.id;// Get the authenticated user's ID from the JWT token
        const { id } = req.params;// Get the document translation ID from the URL

        // Guard clause: the id must be a valid ObjectId (avoids a CastError 500)
        if (!mongoose.Types.ObjectId.isValid(id)) {
            console.error(`[ERROR: docTranslateRoutes.js, DELETE /:id/permanent] Invalid document id: ${id}`);// Log an error message in the console for debugging purposes
            return res.status(400).json({ message: 'Invalid document id' });// Return a 400 (Bad Request) status code with a message
        }

        const document = await DocTranslation.findOneAndDelete({ _id: id, userId, deletedAt: { $ne: null } }).select('_id fileName');

        // Guard clause: the document translation must have been found
        if (!document) {
            console.error(`[ERROR: docTranslateRoutes.js, DELETE /:id/permanent] Trashed document translation not found: ${id}`);// Log an error message in the console for debugging purposes
            return res.status(404).json({ message: 'Document translation not found in trash' });// Return a 404 (Not Found) status code with a message
        }

        console.log(`[SUCCESS: docTranslateRoutes.js, DELETE /:id/permanent] Document translation permanently deleted: ${id}`);//Log a message in the console for debugging purposes
        return res.status(200).json({ message: 'Document translation permanently deleted', document });// Send a 200 (OK) status code with a message and the document translation
    } catch (error) {
        console.error('[ERROR: docTranslateRoutes.js, DELETE /:id/permanent]', error.message);// Log an error message in the console for debugging purposes
        return res.status(500).json({ message: 'Internal Server Error' });// Return a 500 (Internal Server Error) status code with a message
    }
})

//========EXPORT THE ROUTER============
module.exports = router;// Export the router to be used in other parts of the application
