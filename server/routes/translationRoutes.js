//translationRoutes.js
/*mounted at /translation by app.js
GET - /translation/fetch - List the user's active translations (query: note, sourceLanguage, targetLanguage, page, limit)
GET - /translation/trash - List trashed translations (query: page, limit) (declare before any GET /:id)
POST - /translation/save - Save a translation from the TranslateForm to the user's history
PATCH - /translation/:id/restore - Restore a translation from the trash
DELETE - /translation/delete/:id - Soft delete (move to trash)
DELETE - /translation/:id/permanent - Permanently delete a trashed translation
*/
const express = require('express');
const mongoose = require('mongoose');// Used to validate ObjectIds
const Translation = require('../models/translationSchema');// Import the Translation model
const Note = require('../models/noteSchema');// Import the Note model
const { checkJwtToken } = require('../middleware/securityMiddleware');// Import the JWT middleware
const { languageCodeRegex } = require('../util/schemaUtil');// Used to validate the sourceLanguage and targetLanguage filters
const { DEFAULT_LIMIT, MAX_LIMIT } = require('../util/apiUtil');// Shared pagination limits
const { trashExpiredArchivedTranslations } = require('../util/archiveUtil');// 60-day archive rule
const router = express.Router()

/* Turns the page/limit query params into safe numbers, falling back to the defaults
when they are missing or not positive whole numbers. Used by GET /fetch and GET /trash */
const parsePagination = (page, limit) => {
    const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(limit, 10) || DEFAULT_LIMIT, 1), MAX_LIMIT);
    return { pageNumber, pageSize, skip: (pageNumber - 1) * pageSize };
};

// Builds the pagination object sent with every paged list (totalPages is at least 1)
const paginationInfo = (pageNumber, pageSize, total) => ({
    page: pageNumber,
    limit: pageSize,
    total,
    totalPages: Math.max(Math.ceil(total / pageSize), 1)
});

/*──────────────────────────── GET ROUTES ─────────────────────────────────
   GET: READ — Used to fetch information from the database
───────────────────────────────────────────────────────────────────────────*/
/* GET: /translation/fetch : Lists the signed-in user's saved translations, newest first.
Query (all optional): note (ObjectId), sourceLanguage (code), targetLanguage (code), page (>= 1), limit (1-50)
Responds { translations, pagination: { page, limit, total, totalPages } } */
router.get('/fetch', checkJwtToken, async (req, res) => {
    try {
        const userId = req.user.id;// Get the authenticated user's ID from the JWT token
        const { note, sourceLanguage, targetLanguage, page, limit } = req.query;// Extract the filters from the query string

        // Only ever return the user's own active translations (not archived or in the trash)
        // $ne: true also matches translations saved before isArchived was added (field missing)
        const filter = { user: userId, isArchived: { $ne: true }, deletedAt: null };

        // Guard clause: the optional note filter must be a single valid ObjectId
        if (note !== undefined && note !== '') {
            if (typeof note !== 'string' || !mongoose.Types.ObjectId.isValid(note)) {
                console.error(`[ERROR: translationRoutes.js, GET /fetch] Invalid note id: ${note}`);// Log an error message in the console for debugging purposes
                return res.status(400).json({ message: 'Invalid note id' });// Return a 400 (Bad Request) status code with a message
            }
            filter.note = note;
        }

        // Guard clause: the optional language filters must be single valid language codes
        for (const [field, value] of [['sourceLanguage', sourceLanguage], ['targetLanguage', targetLanguage]]) {
            if (value === undefined || value === '') continue;// Not sent, so no filter
            if (typeof value !== 'string' || !languageCodeRegex.test(value)) {
                console.error(`[ERROR: translationRoutes.js, GET /fetch] Invalid ${field} code: ${value}`);// Log an error message in the console for debugging purposes
                return res.status(400).json({ message: 'Invalid language code' });// Return a 400 (Bad Request) status code with a message
            }
            filter[field] = value;
        }

        const { pageNumber, pageSize, skip } = parsePagination(page, limit);

        const [translations, total] = await Promise.all([
            Translation.find(filter)
                .sort({ createdAt: -1 })// Matches the { user, createdAt } index
                .skip(skip)
                .limit(pageSize)
                .populate('note', 'title')// Only the note title is shown in the list
                .select('-__v')
                .lean(),
            Translation.countDocuments(filter)
        ]);

        console.log(`[SUCCESS: translationRoutes.js, GET /fetch] Fetched ${translations.length} of ${total} translations`);//Log a message in the console for debugging purposes
        return res.status(200).json({// Send a 200 (OK) status code with the translations
            translations,
            pagination: paginationInfo(pageNumber, pageSize, total)
        });
    } catch (error) {
        console.error('[ERROR: translationRoutes.js, GET /fetch]', error.message);// Log an error message in the console for debugging purposes
        return res.status(500).json({ message: 'Internal Server Error' });// Return a 500 (Internal Server Error) status code with a message
    }
})
/* GET: /translation/trash : Lists the signed-in user's trashed translations, most
recently deleted first. Declared before any GET /:id route so "trash" isn't read as an id.
Query (all optional): page (>= 1), limit (1-50)
Responds { translations, pagination: { page, limit, total, totalPages } } */
router.get('/trash', checkJwtToken, async (req, res) => {
    try {
        const userId = req.user.id;// Get the authenticated user's ID from the JWT token
        const { pageNumber, pageSize, skip } = parsePagination(req.query.page, req.query.limit);

        // Apply the 60-day archive rule first so expired archived translations show in the trash straight away
        await trashExpiredArchivedTranslations(userId);

        const filter = { user: userId, deletedAt: { $ne: null } };// Anything with a deletion date is in the trash
        const [translations, total] = await Promise.all([
            Translation.find(filter)
                .sort({ deletedAt: -1 })// Most recently trashed first
                .skip(skip)
                .limit(pageSize)
                .populate('note', 'title')
                .select('-__v')
                .lean(),
            Translation.countDocuments(filter)
        ]);

        console.log(`[SUCCESS: translationRoutes.js, GET /trash] Fetched ${translations.length} of ${total} trashed translations`);//Log a message in the console for debugging purposes
        return res.status(200).json({// Send a 200 (OK) status code with the translations
            translations,
            pagination: paginationInfo(pageNumber, pageSize, total)
        });
    } catch (error) {
        console.error('[ERROR: translationRoutes.js, GET /trash]', error.message);// Log an error message in the console for debugging purposes
        return res.status(500).json({ message: 'Internal Server Error' });// Return a 500 (Internal Server Error) status code with a message
    }
})

/*──────────────────────────── POST ROUTES ──────────────────────────────
    POST: CREATE — Used to submit new data to the database
 ─────────────────────────────────────────────────────────────────────────*/
/* POST: /translation/save : Saves the result of POST /api/language/translate/v2
for the signed-in user.
Body: { sourceText, translatedText, sourceLanguage, targetLanguage, note? } */
router.post('/save', checkJwtToken, async (req, res) => {
    try {
        const userId = req.user.id;// Get the authenticated user's ID from the JWT token
        const { note, sourceText, translatedText, sourceLanguage, targetLanguage } = req.body || {};// Extract the translation fields from the request body

        // Guard clause: the text and target language must be non-empty strings (so none can inject query operators)
        if ([sourceText, translatedText, targetLanguage].some((field) => typeof field !== 'string' || !field.trim())) {
            console.error('[ERROR: translationRoutes.js, POST /save] Missing translation fields');// Log an error message in the console for debugging purposes
            return res.status(400).json({ message: 'Translate some text before saving' });// Return a 400 (Bad Request) status code with a message
        }

        // Guard clause: checked on its own because auto-detect can return no source language (null)
        if (typeof sourceLanguage !== 'string' || !sourceLanguage.trim()) {
            console.error('[ERROR: translationRoutes.js, POST /save] Missing source language');// Log an error message in the console for debugging purposes
            return res.status(400).json({ message: 'Choose the source language before saving' });// Return a 400 (Bad Request) status code with a message
        }

        // Guard clause: the optional note must exist, belong to the user and not be archived or trashed
        let noteId = null;
        if (note !== undefined && note !== null && note !== '') {// '' = "No note", same as the fetch filter
            if (typeof note !== 'string' || !mongoose.Types.ObjectId.isValid(note)) {
                console.error(`[ERROR: translationRoutes.js, POST /save] Invalid note id: ${note}`);// Log an error message in the console for debugging purposes
                return res.status(400).json({ message: 'Invalid note id' });// Return a 400 (Bad Request) status code with a message
            }
            const ownNote = await Note.findOne({ _id: note, user: userId, deletedAt: null }).select('isArchived').exec();
            if (!ownNote || ownNote.isArchived) {
                console.error(`[ERROR: translationRoutes.js, POST /save] Note not available: ${note}`);// Log an error message in the console for debugging purposes
                return res.status(400).json({ message: 'That note cannot be translated' });// Return a 400 (Bad Request) status code with a message
            }
            noteId = note;
        }

        // An identical active translation is already saved: return it instead of creating a duplicate
        const existing = await Translation.findOne({
            user: userId,
            note: noteId,
            sourceText,
            translatedText,
            sourceLanguage,
            targetLanguage,
            isArchived: { $ne: true },
            deletedAt: null
        }).populate('note', 'title').select('-__v').lean();
        if (existing) {
            console.log(`[SUCCESS: translationRoutes.js, POST /save] Translation already saved: ${existing._id}`);//Log a message in the console for debugging purposes
            return res.status(200).json({ message: 'Translation already saved', created: false, translation: existing });// Send a 200 (OK) status code with the existing translation
        }

        const newTranslation = await Translation.create({// Validate and save the translation (characterCount is set by the schema hook)
            user: userId,
            note: noteId,
            sourceText,
            translatedText,
            sourceLanguage,
            targetLanguage
        });
        await newTranslation.populate('note', 'title');// Same note shape as GET /fetch ({ _id, title } or null)

        console.log(`[SUCCESS: translationRoutes.js, POST /save] Translation saved: ${newTranslation._id}`);//Log a message in the console for debugging purposes
        return res.status(201).json({// Send a 201 (Created) status code with the new translation
            message: 'Translation saved successfully',
            created: true,
            translation: newTranslation
        });
    } catch (error) {
        // Mongoose schema validation failed: send the first validation message back to the client
        if (error.name === 'ValidationError') {
            const firstMessage = Object.values(error.errors)[0]?.message;
            console.error('[ERROR: translationRoutes.js, POST /save] Validation failed:', error.message);// Log an error message in the console for debugging purposes
            return res.status(400).json({ message: firstMessage || 'Invalid translation details' });// Return a 400 (Bad Request) status code with a message
        }
        console.error('[ERROR: translationRoutes.js, POST /save]', error.message);// Log an error message in the console for debugging purposes
        return res.status(500).json({ message: 'Internal Server Error' });// Return a 500 (Internal Server Error) status code with a message
    }
})

/*──────────────────────────── PATCH ROUTES ───────────────────────────────
   PATCH: UPDATE — Used to partially update information in the database
 ───────────────────────────────────────────────────────────────────────────*/
/* PATCH: /translation/:id/restore : Restores one of the signed-in user's trashed
translations to the main translations list by clearing deletedAt, which also takes
it out of the 30-day TTL purge */
router.patch('/:id/restore', checkJwtToken, async (req, res) => {
    try {
        const userId = req.user.id;// Get the authenticated user's ID from the JWT token
        const { id } = req.params;// Get the translation ID from the URL

        // Guard clause: the id must be a valid ObjectId (avoids a CastError 500)
        if (!mongoose.Types.ObjectId.isValid(id)) {
            console.error(`[ERROR: translationRoutes.js, PATCH /:id/restore] Invalid translation id: ${id}`);// Log an error message in the console for debugging purposes
            return res.status(400).json({ message: 'Invalid translation id' });// Return a 400 (Bad Request) status code with a message
        }

        // Only a translation the user owns that is in the trash can be restored
        const translation = await Translation.findOneAndUpdate(
            { _id: id, user: userId, deletedAt: { $ne: null } },
            { $set: { deletedAt: null, isArchived: false, archivedAt: null } }
        ).select('_id sourceText');

        // Guard clause: the translation must have been found
        if (!translation) {
            console.error(`[ERROR: translationRoutes.js, PATCH /:id/restore] Trashed translation not found: ${id}`);// Log an error message in the console for debugging purposes
            return res.status(404).json({ message: 'Translation not found in trash' });// Return a 404 (Not Found) status code with a message
        }

        console.log(`[SUCCESS: translationRoutes.js, PATCH /:id/restore] Translation restored from trash: ${id}`);//Log a message in the console for debugging purposes
        return res.status(200).json({ message: 'Translation restored', translation });// Send a 200 (OK) status code with a message and the translation
    } catch (error) {
        console.error('[ERROR: translationRoutes.js, PATCH /:id/restore]', error.message);// Log an error message in the console for debugging purposes
        return res.status(500).json({ message: 'Internal Server Error' });// Return a 500 (Internal Server Error) status code with a message
    }
})

/*──────────────────────────── DELETE ROUTES ───────────────────────────────
    DELETE: Used to remove an item from the database
 ───────────────────────────────────────────────────────────────────────────*/
/* DELETE: /translation/delete/:id : Moves one of the signed-in user's active
translations to the trash (soft delete) by setting deletedAt. The TTL index on
deletedAt (translationSchema) purges it after 30 days */
router.delete('/delete/:id', checkJwtToken, async (req, res) => {
    try {
        const userId = req.user.id;// Get the authenticated user's ID from the JWT token
        const { id } = req.params;// Get the translation ID from the URL

        // Guard clause: the id must be a valid ObjectId (avoids a CastError 500)
        if (!mongoose.Types.ObjectId.isValid(id)) {
            console.error(`[ERROR: translationRoutes.js, DELETE /delete/:id] Invalid translation id: ${id}`);// Log an error message in the console for debugging purposes
            return res.status(400).json({ message: 'Invalid translation id' });// Return a 400 (Bad Request) status code with a message
        }

        /* Only an active translation the user owns can be moved to the trash here.
        Archived translations use DELETE /archive/translation/:id ($ne also matches older translations without the field) */
        const translation = await Translation.findOneAndUpdate(
            { _id: id, user: userId, isArchived: { $ne: true }, deletedAt: null },
            { $set: { deletedAt: new Date(), isArchived: false, archivedAt: null } }
        ).select('_id sourceText');

        // Guard clause: the translation must have been found
        if (!translation) {
            console.error(`[ERROR: translationRoutes.js, DELETE /delete/:id] Translation not found: ${id}`);// Log an error message in the console for debugging purposes
            return res.status(404).json({ message: 'Translation not found' });// Return a 404 (Not Found) status code with a message
        }

        console.log(`[SUCCESS: translationRoutes.js, DELETE /delete/:id] Translation moved to trash: ${id}`);//Log a message in the console for debugging purposes
        return res.status(200).json({ message: 'Translation moved to trash', translation });// Send a 200 (OK) status code with a message and the translation
    } catch (error) {
        console.error('[ERROR: translationRoutes.js, DELETE /delete/:id]', error.message);// Log an error message in the console for debugging purposes
        return res.status(500).json({ message: 'Internal Server Error' });// Return a 500 (Internal Server Error) status code with a message
    }
})
/* DELETE: /translation/:id/permanent : Permanently deletes one of the signed-in user's
trashed translations. Only translations already in the trash can be deleted this way,
so an active translation can't be wiped in one step */
router.delete('/:id/permanent', checkJwtToken, async (req, res) => {
    try {
        const userId = req.user.id;// Get the authenticated user's ID from the JWT token
        const { id } = req.params;// Get the translation ID from the URL

        // Guard clause: the id must be a valid ObjectId (avoids a CastError 500)
        if (!mongoose.Types.ObjectId.isValid(id)) {
            console.error(`[ERROR: translationRoutes.js, DELETE /:id/permanent] Invalid translation id: ${id}`);// Log an error message in the console for debugging purposes
            return res.status(400).json({ message: 'Invalid translation id' });// Return a 400 (Bad Request) status code with a message
        }

        const translation = await Translation.findOneAndDelete({ _id: id, user: userId, deletedAt: { $ne: null } }).select('_id sourceText');

        // Guard clause: the translation must have been found
        if (!translation) {
            console.error(`[ERROR: translationRoutes.js, DELETE /:id/permanent] Trashed translation not found: ${id}`);// Log an error message in the console for debugging purposes
            return res.status(404).json({ message: 'Translation not found in trash' });// Return a 404 (Not Found) status code with a message
        }

        console.log(`[SUCCESS: translationRoutes.js, DELETE /:id/permanent] Translation permanently deleted: ${id}`);//Log a message in the console for debugging purposes
        return res.status(200).json({ message: 'Translation permanently deleted', translation });// Send a 200 (OK) status code with a message and the translation
    } catch (error) {
        console.error('[ERROR: translationRoutes.js, DELETE /:id/permanent]', error.message);// Log an error message in the console for debugging purposes
        return res.status(500).json({ message: 'Internal Server Error' });// Return a 500 (Internal Server Error) status code with a message
    }
})

//========EXPORT THE ROUTER============
module.exports = router;// Export the router to be used in other parts of the application
