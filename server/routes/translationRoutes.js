//translationRoutes.js
/*mounted at /translation by app.js
GET - '/fetch' - List the user's saved translations (query: note, sourceLanguage, targetLanguage, page, limit)
POST - '/save' - Save a translation from the TranslateForm to the user's history
DELETE - '/delete/:id' - Delete one of the user's saved translations
*/
require('dotenv').config()
const express = require('express');
const mongoose = require('mongoose');// Used to validate ObjectIds
const Translation = require('../models/translationSchema');// Import the Translation model
const Note = require('../models/noteSchema');// Import the Note model
const { checkJwtToken } = require('../middleware/securityMiddleware');// Import the JWT middleware
const { languageCodeRegex } = require('../util/schemaUtil');// Used to validate the targetLanguage filter
const {DEFAULT_LIMIT, MAX_LIMIT} = require('../util/apiUtil')
const router = express.Router()



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

        const filter = { user: userId };// Only ever return the user's own translations

        // Conditional rendering to check the optional note filter is a single valid ObjectId
        if (note !== undefined && note !== '') {
            if (typeof note !== 'string' || !mongoose.Types.ObjectId.isValid(note)) {
                console.error(`[ERROR: translationRoutes.js, GET /fetch] Invalid note id: ${note}`);// Log an error message in the console for debugging purposes
                return res.status(400).json({ message: 'Invalid note id' });// Return a 400 (Bad Request) status code with a message
            }
            filter.note = note;
        }

        // Conditional rendering to check the optional language filters are single valid language codes
        for (const [field, value] of [['sourceLanguage', sourceLanguage], ['targetLanguage', targetLanguage]]) {
            if (value === undefined || value === '') continue;
            if (typeof value !== 'string' || !languageCodeRegex.test(value)) {
                console.error(`[ERROR: translationRoutes.js, GET /fetch] Invalid ${field} code: ${value}`);// Log an error message in the console for debugging purposes
                return res.status(400).json({ message: 'Invalid language code' });// Return a 400 (Bad Request) status code with a message
            }
            filter[field] = value;
        }

        // Fall back to the defaults when page/limit are missing or not positive whole numbers
        const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
        const pageSize = Math.min(Math.max(parseInt(limit, 10) || DEFAULT_LIMIT, 1), MAX_LIMIT);

        const [translations, total] = await Promise.all([
            Translation.find(filter)
                .sort({ createdAt: -1 })// Matches the { user, createdAt } index
                .skip((pageNumber - 1) * pageSize)
                .limit(pageSize)
                .populate('note', 'title')// Only the note title is shown in the list
                .select('-__v')
                .lean(),
            Translation.countDocuments(filter)
        ]);

        console.log(`[SUCCESS: translationRoutes.js, GET /fetch] Fetched ${translations.length} of ${total} translations`);//Log a message in the console for debugging purposes
        return res.status(200).json({// Send a 200 (OK) status code with the translations
            translations,
            pagination: {
                page: pageNumber,
                limit: pageSize,
                total,
                totalPages: Math.max(Math.ceil(total / pageSize), 1)
            }
        });
    } catch (error) {
        console.error('[ERROR: translationRoutes.js, GET /fetch]', error.message);// Log an error message in the console for debugging purposes
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

        // Conditional rendering to check every field is a string (so none can inject query operators)
        if ([sourceText, translatedText, sourceLanguage, targetLanguage].some((field) => typeof field !== 'string' || !field.trim())) {
            console.error('[ERROR: translationRoutes.js, POST /save] Missing translation fields');// Log an error message in the console for debugging purposes
            return res.status(400).json({ message: 'Translate some text before saving' });// Return a 400 (Bad Request) status code with a message
        }

        // Conditional rendering to check the optional note exists, belongs to the user and is not archived
        let noteId = null;
        if (note !== undefined && note !== null) {
            if (typeof note !== 'string' || !mongoose.Types.ObjectId.isValid(note)) {
                console.error(`[ERROR: translationRoutes.js, POST /save] Invalid note id: ${note}`);// Log an error message in the console for debugging purposes
                return res.status(400).json({ message: 'Invalid note id' });
            }
            const ownNote = await Note.findOne({ _id: note, user: userId, deletedAt: null }).select('isArchived').exec();
            if (!ownNote || ownNote.isArchived) {
                console.error(`[ERROR: translationRoutes.js, POST /save] Note not available: ${note}`);// Log an error message in the console for debugging purposes
                return res.status(400).json({ message: 'That note cannot be translated' });
            }
            noteId = note;
        }

        const newTranslation = await Translation.create({// Validate and save the translation (characterCount is set by the schema hook)
            user: userId,
            note: noteId,
            sourceText,
            translatedText,
            sourceLanguage,
            targetLanguage
        });

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

/*──────────────────────────── DELETE ROUTES ───────────────────────────────
    DELETE: Used to remove an item from the database
 ───────────────────────────────────────────────────────────────────────────*/
/* DELETE: /translation/delete/:id : Permanently deletes one of the signed-in
user's saved translations (translations have no trash). */
router.delete('/delete/:id', checkJwtToken, async (req, res) => {
    try {
        const userId = req.user.id;// Get the authenticated user's ID from the JWT token
        const { id } = req.params;// Get the translation ID from the URL

        // Conditional rendering to check the id is a valid ObjectId (avoids a CastError 500)
        if (!mongoose.Types.ObjectId.isValid(id)) {
            console.error(`[ERROR: translationRoutes.js, DELETE /delete/:id] Invalid translation id: ${id}`);// Log an error message in the console for debugging purposes
            return res.status(400).json({ message: 'Invalid translation id' });// Return a 400 (Bad Request) status code with a message
        }

        // Only a translation the user owns can be deleted
        const translation = await Translation.findOneAndDelete({ _id: id, user: userId }).select('_id');

        // Conditional rendering to check the translation was found
        if (!translation) {
            console.error(`[ERROR: translationRoutes.js, DELETE /delete/:id] Translation not found: ${id}`);// Log an error message in the console for debugging purposes
            return res.status(404).json({ message: 'Translation not found' });// Return a 404 (Not Found) status code with a message
        }

        console.log(`[SUCCESS: translationRoutes.js, DELETE /delete/:id] Translation deleted: ${id}`);//Log a message in the console for debugging purposes
        return res.status(200).json({ message: 'Translation deleted', id });// Send a 200 (OK) status code with a message
    } catch (error) {
        console.error('[ERROR: translationRoutes.js, DELETE /delete/:id]', error.message);// Log an error message in the console for debugging purposes
        return res.status(500).json({ message: 'Internal Server Error' });// Return a 500 (Internal Server Error) status code with a message
    }
})

//========EXPORT THE ROUTER============
module.exports = router;// Export the router to be used in other parts of the application
