//translationRoutes.js
/*mounted at /translation by app.js
POST - '/save' - Save a translation from the TranslateForm to the user's history
*/
require('dotenv').config()
const express = require('express');
const mongoose = require('mongoose');// Used to validate ObjectIds
const Translation = require('../models/translationSchema');// Import the Translation model
const Note = require('../models/noteSchema');// Import the Note model
const { checkJwtToken } = require('./middleware');// Import the JWT middleware
const router = express.Router()

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

module.exports = router;
