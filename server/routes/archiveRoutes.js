//archiveRoutes.js
/*mounted at '/archive' in app.js
GET - /archive/fetchNotes - fetch all of the user's archived notes
PATCH - /archive/:id - archive an active note
PATCH - /archive/:id/restore - restore an archived note to the main notes list
DELETE - /archive/:id - move an archived note to the trash
GET - /archive/fetchTranslations - fetch all of the user's archived translations
PATCH - /archive/translation/:id - archive an active translation
PATCH - /archive/translation/:id/restore - restore an archived translation to the main translation list
DELETE - /archive/translation/:id - move an archived translation to the trash
*/
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');// Used to validate ObjectIds
const Note = require('../models/noteSchema');// Import the Note model
const Translation = require('../models/translationSchema')
const { checkJwtToken } = require('../middleware/securityMiddleware');// Import the JWT middleware
const { trashExpiredArchivedNotes, trashExpiredArchivedTranslations } = require('../util/archiveUtil');// 60-day archive rule
const router = express.Router()

/*──────────────────────────── GET ROUTES ─────────────────────────────────────
   GET: READ — Used to fetch information from the database
────────────────────────────────────────────────────────────────────────────────*/
/* GET: /archive/fetchNotes : Lists the signed-in user's archived notes (not in the
trash), most recently archived first. Notebook and tags are populated like /notes/fetchNotes */
router.get('/fetchNotes', checkJwtToken, async (req, res) => {
    try {
        const userId = req.user.id;// Get the authenticated user's ID from the JWT token

        // Apply the 60-day rule first so expired notes never show in the archive
        await trashExpiredArchivedNotes(userId);

        const notes = await Note.find({ user: userId, isArchived: true, deletedAt: null })
            .select('-__v')
            .populate('notebook', 'name colour')
            .populate('tags', 'name')
            .sort({ archivedAt: -1, updatedAt: -1 })// Latest archived note first (updatedAt for notes archived before archivedAt existed)
            .lean();

        console.log(`[SUCCESS: archiveRoutes.js, GET /fetchNotes] Fetched ${notes.length} archived notes`);//Log a message in the console for debugging purposes
        return res.status(200).json({ notes });// Send a 200 (OK) status code with the notes
    } catch (error) {
        console.error('[ERROR: archiveRoutes.js, GET /fetchNotes]', error.message);// Log an error message in the console for debugging purposes
        return res.status(500).json({ message: 'Internal Server Error' });// Return a 500 (Internal Server Error) status code with a message
    }
})
/* GET: /archive/fetchTranslations : Lists the signed-in user's archived translations
(not in the trash), most recently archived first. The linked note title is populated
like /translation/fetch */
router.get('/fetchTranslations', checkJwtToken, async (req, res) => {
    try {
        const userId = req.user.id;// Get the authenticated user's ID from the JWT token

        // Apply the 60-day rule first so expired translations never show in the archive
        await trashExpiredArchivedTranslations(userId);

        const translations = await Translation.find({ user: userId, isArchived: true, deletedAt: null })
            .select('-__v')
            .populate('note', 'title')
            .sort({ archivedAt: -1, updatedAt: -1 })// Latest archived first (updatedAt for translations archived before archivedAt existed)
            .lean();

        console.log(`[SUCCESS: archiveRoutes.js, GET /fetchTranslations] Fetched ${translations.length} archived translations`);//Log a message in the console for debugging purposes
        return res.status(200).json({ translations });// Send a 200 (OK) status code with the translations
    } catch (error) {
        console.error('[ERROR: archiveRoutes.js, GET /fetchTranslations]', error.message);// Log an error message in the console for debugging purposes
        return res.status(500).json({ message: 'Internal Server Error' });// Return a 500 (Internal Server Error) status code with a message
    }
})
/*──────────────────────────── PATCH ROUTES ───────────────────────────────────
   PATCH: UPDATE — Used to partially update information in the database
────────────────────────────────────────────────────────────────────────────────*/
//Route to send a PATCH request to the /archive/:id endpoint
// Move a note to the archive list
/* PATCH: /archive/:id : Archives one of the signed-in user's active notes, which
hides it from the main notes list. Archived notes are unpinned */
router.patch('/:id', checkJwtToken, async (req, res) => {
    try {
        const userId = req.user.id;// Get the authenticated user's ID from the JWT token
        const { id } = req.params;// Get the note ID from the URL

        // Conditional rendering to check the id is a valid ObjectId (avoids a CastError 500)
        if (!mongoose.Types.ObjectId.isValid(id)) {
            console.error(`[ERROR: archiveRoutes.js, PATCH /:id] Invalid note id: ${id}`);// Log an error message in the console for debugging purposes
            return res.status(400).json({ message: 'Invalid note id' });// Return a 400 (Bad Request) status code with a message
        }

        // Only a note the user owns that is not in the trash or already archived can be archived
        const note = await Note.findOneAndUpdate(
            { _id: id, user: userId, deletedAt: null, isArchived: false },
            { $set: { isArchived: true, isPinned: false, archivedAt: new Date() } }// archivedAt starts the 60-day countdown
        ).select('_id title isArchived archivedAt');

        // Conditional rendering to check the note was found
        if (!note) {
            console.error(`[ERROR: archiveRoutes.js, PATCH /:id] Note not found or already archived: ${id}`);// Log an error message in the console for debugging purposes
            return res.status(404).json({ message: 'Note not found or already archived' });// Return a 404 (Not Found) status code with a message
        }

        console.log(`[SUCCESS: archiveRoutes.js, PATCH /:id] Note archived: ${id}`);//Log a message in the console for debugging purposes
        return res.status(200).json({ message: 'Note archived', note });// Send a 200 (OK) status code with a message
    } catch (error) {
        console.error('[ERROR: archiveRoutes.js, PATCH /:id]', error.message);// Log an error message in the console for debugging purposes
        return res.status(500).json({ message: 'Internal Server Error' });// Return a 500 (Internal Server Error) status code with a message
    }
})
/* PATCH: /archive/translation/:id : Archives one of the signed-in user's active translations, 
which hides it from the main translations list.  */
router.patch('/translation/:id', checkJwtToken, async (req, res) => {
    try {
        const userId = req.user.id;// Get the authenticated user's ID from the JWT token
        const { id } = req.params;// Get the translation ID from the URL

        // Conditional rendering to check the id is a valid ObjectId (avoids a CastError 500)
        if (!mongoose.Types.ObjectId.isValid(id)) {
            console.error(`[ERROR: archiveRoutes.js, PATCH /translation/:id] Invalid translation id: ${id}`);// Log an error message in the console for debugging purposes
            return res.status(400).json({ message: 'Invalid translation id' });// Return a 400 (Bad Request) status code with a message
        }

        // Only a translation the user owns that is not in the trash or already archived can be archived
        const translation = await Translation.findOneAndUpdate(
            { _id: id, user: userId, deletedAt: null, isArchived: { $ne: true } },// $ne also matches older translations without the field
            { $set: { isArchived: true, archivedAt: new Date() } },// archivedAt starts the 60-day countdown
            { new: true }// Return the document AFTER the update
        ).select('_id sourceText isArchived archivedAt');

        // Conditional rendering to check the translation was found
        if (!translation) {
            console.error(`[ERROR: archiveRoutes.js, PATCH /translation/:id] Translation not found or already archived: ${id}`);// Log an error message in the console for debugging purposes
            return res.status(404).json({ message: 'Translation not found or already archived' });// Return a 404 (Not Found) status code with a message
        }

        console.log(`[SUCCESS: archiveRoutes.js, PATCH /translation/:id] Translation archived: ${id}`);//Log a message in the console for debugging purposes
        return res.status(200).json({ message: 'Translation archived', translation });// Send a 200 (OK) status code with a message and the translation
    } catch (error) {
        console.error('[ERROR: archiveRoutes.js, PATCH /translation/:id]', error.message);// Log an error message in the console for debugging purposes
        return res.status(500).json({ message: 'Internal Server Error' });// Return a 500 (Internal Server Error) status code with a message
    }
})
/* PATCH: /archive/translation/:id/restore : Unarchives one of the signed-in user's
archived translations, which moves it back to the main translations list */
router.patch('/translation/:id/restore', checkJwtToken, async (req, res) => {
    try {
        const userId = req.user.id;// Get the authenticated user's ID from the JWT token
        const { id } = req.params;// Get the translation ID from the URL

        // Conditional rendering to check the id is a valid ObjectId (avoids a CastError 500)
        if (!mongoose.Types.ObjectId.isValid(id)) {
            console.error(`[ERROR: archiveRoutes.js, PATCH /translation/:id/restore] Invalid translation id: ${id}`);// Log an error message in the console for debugging purposes
            return res.status(400).json({ message: 'Invalid translation id' });// Return a 400 (Bad Request) status code with a message
        }

        // Only an archived translation the user owns that is not in the trash can be restored
        const translation = await Translation.findOneAndUpdate(
            { _id: id, user: userId, deletedAt: null, isArchived: true },
            { $set: { isArchived: false, archivedAt: null } }// Clear the 60-day countdown
        ).select('_id sourceText');

        // Conditional rendering to check the translation was found
        if (!translation) {
            console.error(`[ERROR: archiveRoutes.js, PATCH /translation/:id/restore] Archived translation not found: ${id}`);// Log an error message in the console for debugging purposes
            return res.status(404).json({ message: 'Archived translation not found' });// Return a 404 (Not Found) status code with a message
        }

        console.log(`[SUCCESS: archiveRoutes.js, PATCH /translation/:id/restore] Translation restored from archive: ${id}`);//Log a message in the console for debugging purposes
        return res.status(200).json({ message: 'Translation restored', translation });// Send a 200 (OK) status code with a message and the translation
    } catch (error) {
        console.error('[ERROR: archiveRoutes.js, PATCH /translation/:id/restore]', error.message);// Log an error message in the console for debugging purposes
        return res.status(500).json({ message: 'Internal Server Error' });// Return a 500 (Internal Server Error) status code with a message
    }
})
/* PATCH: /archive/:id/restore : Unarchives one of the signed-in user's archived
notes, which moves it back to the main notes list */
router.patch('/:id/restore', checkJwtToken, async (req, res) => {
    try {
        const userId = req.user.id;// Get the authenticated user's ID from the JWT token
        const { id } = req.params;// Get the note ID from the URL

        // Conditional rendering to check the id is a valid ObjectId (avoids a CastError 500)
        if (!mongoose.Types.ObjectId.isValid(id)) {
            console.error(`[ERROR: archiveRoutes.js, PATCH /:id/restore] Invalid note id: ${id}`);// Log an error message in the console for debugging purposes
            return res.status(400).json({ message: 'Invalid note id' });// Return a 400 (Bad Request) status code with a message
        }

        // Only an archived note the user owns that is not in the trash can be restored
        const note = await Note.findOneAndUpdate(
            { _id: id, user: userId, deletedAt: null, isArchived: true },
            { $set: { isArchived: false, archivedAt: null } }// Clear the 60-day countdown
        ).select('_id title');

        // Conditional rendering to check the note was found
        if (!note) {
            console.error(`[ERROR: archiveRoutes.js, PATCH /:id/restore] Archived note not found: ${id}`);// Log an error message in the console for debugging purposes
            return res.status(404).json({ message: 'Archived note not found' });// Return a 404 (Not Found) status code with a message
        }

        console.log(`[SUCCESS: archiveRoutes.js, PATCH /:id/restore] Note restored from archive: ${id}`);//Log a message in the console for debugging purposes
        return res.status(200).json({ message: 'Note restored', note });// Send a 200 (OK) status code with a message
    } catch (error) {
        console.error('[ERROR: archiveRoutes.js, PATCH /:id/restore]', error.message);// Log an error message in the console for debugging purposes
        return res.status(500).json({ message: 'Internal Server Error' });// Return a 500 (Internal Server Error) status code with a message
    }
})
/*──────────────────────────── DELETE ROUTES ───────────────────────────────────
    DELETE: Used to remove an item from the database
 ────────────────────────────────────────────────────────────────────────────────*/
/* DELETE: /archive/:id : Moves one of the signed-in user's archived notes to the
trash (soft delete). isArchived is cleared so that restoring it from the trash
puts it back in the main notes list, the same as any other trashed note */
router.delete('/:id', checkJwtToken, async (req, res) => {
    try {
        const userId = req.user.id;// Get the authenticated user's ID from the JWT token
        const { id } = req.params;// Get the note ID from the URL

        // Conditional rendering to check the id is a valid ObjectId (avoids a CastError 500)
        if (!mongoose.Types.ObjectId.isValid(id)) {
            console.error(`[ERROR: archiveRoutes.js, DELETE /:id] Invalid note id: ${id}`);// Log an error message in the console for debugging purposes
            return res.status(400).json({ message: 'Invalid note id' });// Return a 400 (Bad Request) status code with a message
        }

        // Only an archived note the user owns that is not already in the trash can be moved there
        const note = await Note.findOneAndUpdate(
            { _id: id, user: userId, deletedAt: null, isArchived: true },
            { $set: { deletedAt: new Date(), isArchived: false, isPinned: false, archivedAt: null } }
        ).select('_id title');

        // Conditional rendering to check the note was found
        if (!note) {
            console.error(`[ERROR: archiveRoutes.js, DELETE /:id] Archived note not found: ${id}`);// Log an error message in the console for debugging purposes
            return res.status(404).json({ message: 'Archived note not found' });// Return a 404 (Not Found) status code with a message
        }

        console.log(`[SUCCESS: archiveRoutes.js, DELETE /:id] Archived note moved to trash: ${id}`);//Log a message in the console for debugging purposes
        return res.status(200).json({ message: 'Note moved to trash', note });// Send a 200 (OK) status code with a message
    } catch (error) {
        console.error('[ERROR: archiveRoutes.js, DELETE /:id]', error.message);// Log an error message in the console for debugging purposes
        return res.status(500).json({ message: 'Internal Server Error' });// Return a 500 (Internal Server Error) status code with a message
    }
})
/* DELETE: /archive/translation/:id : Moves one of the signed-in user's archived
translations to the trash (soft delete). isArchived is cleared so that restoring it
from the trash puts it back in the main translations list */
router.delete('/translation/:id', checkJwtToken, async (req, res) => {
    try {
        const userId = req.user.id;// Get the authenticated user's ID from the JWT token
        const { id } = req.params;// Get the translation ID from the URL

        // Conditional rendering to check the id is a valid ObjectId (avoids a CastError 500)
        if (!mongoose.Types.ObjectId.isValid(id)) {
            console.error(`[ERROR: archiveRoutes.js, DELETE /translation/:id] Invalid translation id: ${id}`);// Log an error message in the console for debugging purposes
            return res.status(400).json({ message: 'Invalid translation id' });// Return a 400 (Bad Request) status code with a message
        }

        // Only an archived translation the user owns that is not already in the trash can be moved there
        const translation = await Translation.findOneAndUpdate(
            { _id: id, user: userId, deletedAt: null, isArchived: true },
            { $set: { deletedAt: new Date(), isArchived: false, archivedAt: null } }
        ).select('_id sourceText');

        // Conditional rendering to check the translation was found
        if (!translation) {
            console.error(`[ERROR: archiveRoutes.js, DELETE /translation/:id] Archived translation not found: ${id}`);// Log an error message in the console for debugging purposes
            return res.status(404).json({ message: 'Archived translation not found' });// Return a 404 (Not Found) status code with a message
        }

        console.log(`[SUCCESS: archiveRoutes.js, DELETE /translation/:id] Archived translation moved to trash: ${id}`);//Log a message in the console for debugging purposes
        return res.status(200).json({ message: 'Translation moved to trash', translation });// Send a 200 (OK) status code with a message and the translation
    } catch (error) {
        console.error('[ERROR: archiveRoutes.js, DELETE /translation/:id]', error.message);// Log an error message in the console for debugging purposes
        return res.status(500).json({ message: 'Internal Server Error' });// Return a 500 (Internal Server Error) status code with a message
    }
})
//========EXPORT THE ROUTER============
module.exports = router;// Export the router to be used in other parts of the application