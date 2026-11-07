// noteRoutes.js
/*mounted at /notes by app.js
GET- /fetchNotes - fethc and list all notes for the specific user
GET - /:id - Get a single note by id
GET - /trash - List trashed notes - (declare route before /:id)
POST - /addNote - Create a note (tags sent as names; missing tags are created)
PATCH - /notes/:id - Update title, content, language, notebook, tags or pin (archive is PATCH /archive/:id)
PATCH - /notes/:id/restore - Restore from trash
DELETE - /notes/delete/:id - Soft delete (move to trash)
DELETE - `/notes/:id/permanent` - Permanently delete a note and its translations
*/
require('dotenv').config()
const express = require('express');
const mongoose = require('mongoose');// Used to validate ObjectIds
const Note = require('../models/noteSchema');// Import the Note model
const Notebook = require('../models/notebookSchema');// Import the Notebook model
const Tag = require('../models/tagSchema');// Import the Tag model
const User = require('../models/userSchema');// Import the User model
const Translation = require('../models/translationSchema');// Import the Translation model (removed with a permanently deleted note)
const { checkJwtToken } = require('./middleware');// Import the JWT middleware
const router = express.Router()

/*──────────────────────────── SHARED HELPERS ─────────────────────────────────
   Used by both POST /addNote and PATCH /:id
────────────────────────────────────────────────────────────────────────────────*/
/* Checks a notebook id from the request belongs to the user.
Returns null when it is fine, otherwise { status, message } to send back */
const checkNotebook = async (userId, notebook) => {
    if (!mongoose.Types.ObjectId.isValid(notebook)) {
        return { status: 400, message: 'Invalid notebook id' };
    }
    const ownNotebook = await Notebook.exists({ _id: notebook, user: userId });
    if (!ownNotebook) {
        return { status: 404, message: 'That notebook no longer exists' };
    }
    return null;
}

/* Tag names are stored lowercase (see tagSchema), so normalise them
and drop blanks and duplicates before looking them up */
const normaliseTagNames = (tags) => [...new Set(tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean))];

// Find each tag by name, creating the ones the user does not have yet, and return their ids
const findOrCreateTagIds = async (userId, tagNames) => {
    const tagDocs = await Promise.all(tagNames.map((name) => Tag.findOneAndUpdate(
        { user: userId, name },
        { $setOnInsert: { user: userId, name } },
        { upsert: true, returnDocument: 'after', runValidators: true }
    ).exec()));
    return tagDocs.map((tag) => tag._id);
}


/*──────────────────────────── GET ROUTES ─────────────────────────────────────
   GET: READ — Used to fetch information from the provider and the database
────────────────────────────────────────────────────────────────────────────────*/
/* Fields sent back for every note in a list or details panel, with the notebook
and tags swapped from ids to the names (and colour) the NotesList table shows */
const populateNote = (query) => query
    .select('-__v')
    .populate('notebook', 'name colour')
    .populate('tags', 'name');

/* GET: /notes/fetchNotes : Lists the signed-in user's active notes (not archived,
not in the trash), pinned notes first and then the most recently updated */
router.get('/fetchNotes', checkJwtToken, async (req, res) => {
    try {
        const userId = req.user.id;// Get the authenticated user's ID from the JWT token

        const notes = await populateNote(
            Note.find({ user: userId, isArchived: false, deletedAt: null })
        ).sort({ isPinned: -1, updatedAt: -1 }).lean();// Matches the { user, isPinned, updatedAt } index

        console.log(`[SUCCESS: noteRoutes.js, GET /fetchNotes] Fetched ${notes.length} notes`);//Log a message in the console for debugging purposes
        return res.status(200).json({ notes });// Send a 200 (OK) status code with the notes
    } catch (error) {
        console.error('[ERROR: noteRoutes.js, GET /fetchNotes]', error.message);// Log an error message in the console for debugging purposes
        return res.status(500).json({ message: 'Internal Server Error' });// Return a 500 (Internal Server Error) status code with a message
    }
})
/* GET: /notes/trash : Lists the signed-in user's trashed notes, most recently
deleted first. Declared before any GET /:id route so "trash" isn't read as an id */
router.get('/trash', checkJwtToken, async (req, res) => {
    try {
        const userId = req.user.id;// Get the authenticated user's ID from the JWT token

        const notes = await populateNote(
            Note.find({ user: userId, deletedAt: { $ne: null } })
        ).sort({ deletedAt: -1 }).lean();

        console.log(`[SUCCESS: noteRoutes.js, GET /trash] Fetched ${notes.length} trashed notes`);//Log a message in the console for debugging purposes
        return res.status(200).json({ notes });// Send a 200 (OK) status code with the notes
    } catch (error) {
        console.error('[ERROR: noteRoutes.js, GET /trash]', error.message);// Log an error message in the console for debugging purposes
        return res.status(500).json({ message: 'Internal Server Error' });// Return a 500 (Internal Server Error) status code with a message
    }
})
// Route to send a GET request to the /notes/:id endpoint
/*notes/:id - GET a single note*/
/*──────────────────────────── POST ROUTES ──────────────────────────────
    POST: CREATE — Used to submit new data to the database
 ─────────────────────────────────────────────────────────────────────────*/
/* POST: /notes/addNote : Creates a note for the signed-in user from the NotePadForm on
the NotePad page. Tags are sent as names; any the user does not have yet are created. */
router.post('/addNote', checkJwtToken, async (req, res) => {
    try {
        const userId = req.user.id;// Get the authenticated user's ID from the JWT token
        const { title, content, language, notebook, tags = [], isPinned } = req.body || {};// Extract the note fields from the request body

        // Conditional rendering to check the note text is present (and is a string, so it cannot inject query operators)
        if (typeof content !== 'string' || !content.trim()) {
            console.error('[ERROR: noteRoutes.js, POST /addNote] Note text is required');// Log an error message in the console for debugging purposes
            return res.status(400).json({ message: 'Note text is required' });// Return a 400 (Bad Request) status code with a message
        }

        // Conditional rendering to check the optional fields have the right types
        if ((title !== undefined && typeof title !== 'string') ||
            (language !== undefined && typeof language !== 'string') ||
            (notebook !== undefined && notebook !== null && typeof notebook !== 'string') ||
            (isPinned !== undefined && typeof isPinned !== 'boolean') ||
            !Array.isArray(tags) || tags.some((tag) => typeof tag !== 'string')) {
            console.error('[ERROR: noteRoutes.js, POST /addNote] Invalid field types');// Log an error message in the console for debugging purposes
            return res.status(400).json({ message: 'Invalid note details' });// Return a 400 (Bad Request) status code with a message
        }

        /* Use the language chosen on the form, otherwise fall back to the
        user's default note language */
        let noteLanguage = language?.trim();
        if (!noteLanguage) {
            const user = await User.findById(userId).select('defaultLanguages').exec();
            noteLanguage = user?.defaultLanguages?.defaultNoteLanguage || 'en';
        }

        // Conditional rendering to check the notebook exists and belongs to the user
        let notebookId = null;// null means "No notebook"
        if (notebook) {
            const notebookError = await checkNotebook(userId, notebook);
            if (notebookError) {
                console.error(`[ERROR: noteRoutes.js, POST /addNote] ${notebookError.message}: ${notebook}`);// Log an error message in the console for debugging purposes
                return res.status(notebookError.status).json({ message: notebookError.message });// Return a 400 (Bad Request) or 404 (Not Found) status code with a message
            }
            notebookId = notebook;
        }

        const tagNames = normaliseTagNames(tags);
        if (tagNames.some((name) => name.length > 30)) {
            console.error('[ERROR: noteRoutes.js, POST /addNote] Tag name too long');// Log an error message in the console for debugging purposes
            return res.status(400).json({ message: 'Tag names cannot exceed 30 characters' });// Return a 400 (Bad Request) status code with a message
        }
        const tagIds = await findOrCreateTagIds(userId, tagNames);// Find each tag, creating the ones the user does not have yet

        const newNote = await Note.create({// Validate and save the note (content is sanitised by the noteSchema hook)
            user: userId,
            notebook: notebookId,
            title: title?.trim() || undefined,// Leave blank titles to the schema default ("Untitled")
            content,
            language: noteLanguage,
            tags: tagIds,
            isPinned: isPinned === true
        });

        console.log(`[SUCCESS: noteRoutes.js, POST /addNote] Note created: ${newNote._id}`);//Log a message in the console for debugging purposes
        return res.status(201).json({// Send a 201 (Created) status code with the new note
            message: 'Note saved successfully',
            note: newNote
        });
    } catch (error) {
        // Mongoose schema validation failed: send the first validation message back to the client
        if (error.name === 'ValidationError') {
            const firstMessage = Object.values(error.errors)[0]?.message;
            console.error('[ERROR: noteRoutes.js, POST /addNote] Validation failed:', error.message);// Log an error message in the console for debugging purposes
            return res.status(400).json({ message: firstMessage || 'Invalid note details' });// Return a 400 (Bad Request) status code with a message
        }
        console.error('[ERROR: noteRoutes.js, POST /addNote]', error.message);// Log an error message in the console for debugging purposes
        return res.status(500).json({ message: 'Internal Server Error' });// Return a 500 (Internal Server Error) status code with a message
    }
})

/*──────────────────────────── PATCH ROUTES ───────────────────────────────────
   PATCH: UPDATE — Used to partially update information in the database
────────────────────────────────────────────────────────────────────────────────*/
/* PATCH: /notes/:id : Updates one of the signed-in user's active notes from the
EditNoteForm on the Notes page. Only the fields sent in the body are changed.
Tags are sent as names; any the user does not have yet are created.
(Archiving has its own route: PATCH /archive/:id) */
router.patch('/:id', checkJwtToken, async (req, res) => {
    try {
        const userId = req.user.id;// Get the authenticated user's ID from the JWT token
        const { id } = req.params;// Get the note ID from the URL
        const { title, content, language, notebook, tags, isPinned } = req.body || {};// Extract the note fields from the request body

        // Conditional rendering to check the id is a valid ObjectId (avoids a CastError 500)
        if (!mongoose.Types.ObjectId.isValid(id)) {
            console.error(`[ERROR: noteRoutes.js, PATCH /:id] Invalid note id: ${id}`);// Log an error message in the console for debugging purposes
            return res.status(400).json({ message: 'Invalid note id' });// Return a 400 (Bad Request) status code with a message
        }

        // Conditional rendering to check the sent fields have the right types (strings only, so they cannot inject query operators)
        if ((title !== undefined && typeof title !== 'string') ||
            (content !== undefined && typeof content !== 'string') ||
            (language !== undefined && typeof language !== 'string') ||
            (notebook !== undefined && notebook !== null && typeof notebook !== 'string') ||
            (isPinned !== undefined && typeof isPinned !== 'boolean') ||
            (tags !== undefined && (!Array.isArray(tags) || tags.some((tag) => typeof tag !== 'string')))) {
            console.error('[ERROR: noteRoutes.js, PATCH /:id] Invalid field types');// Log an error message in the console for debugging purposes
            return res.status(400).json({ message: 'Invalid note details' });// Return a 400 (Bad Request) status code with a message
        }

        // Build the update from only the fields that were sent
        const updates = {};

        if (title !== undefined) {
            updates.title = title.trim() || 'Untitled';// A cleared title falls back to the schema default
        }

        if (content !== undefined) {
            // Conditional rendering to check the note text is not being emptied
            if (!content.trim()) {
                console.error('[ERROR: noteRoutes.js, PATCH /:id] Note text is required');// Log an error message in the console for debugging purposes
                return res.status(400).json({ message: 'Note text is required' });// Return a 400 (Bad Request) status code with a message
            }
            updates.content = content;// Sanitised and copied to plainText by the noteSchema findOneAndUpdate hook
        }

        if (language !== undefined) {
            // Conditional rendering to check the language is not being emptied
            if (!language.trim()) {
                console.error('[ERROR: noteRoutes.js, PATCH /:id] Note language is required');// Log an error message in the console for debugging purposes
                return res.status(400).json({ message: 'Note language is required' });// Return a 400 (Bad Request) status code with a message
            }
            updates.language = language.trim();// Format is checked by the schema's languageCodeRegex
        }

        if (notebook !== undefined) {
            // '' or null means "No notebook"
            if (notebook) {
                const notebookError = await checkNotebook(userId, notebook);
                if (notebookError) {
                    console.error(`[ERROR: noteRoutes.js, PATCH /:id] ${notebookError.message}: ${notebook}`);// Log an error message in the console for debugging purposes
                    return res.status(notebookError.status).json({ message: notebookError.message });// Return a 400 (Bad Request) or 404 (Not Found) status code with a message
                }
            }
            updates.notebook = notebook || null;
        }

        if (tags !== undefined) {
            const tagNames = normaliseTagNames(tags);
            if (tagNames.some((name) => name.length > 30)) {
                console.error('[ERROR: noteRoutes.js, PATCH /:id] Tag name too long');// Log an error message in the console for debugging purposes
                return res.status(400).json({ message: 'Tag names cannot exceed 30 characters' });// Return a 400 (Bad Request) status code with a message
            }
            updates.tags = await findOrCreateTagIds(userId, tagNames);// Find each tag, creating the ones the user does not have yet
        }

        if (isPinned !== undefined) {
            updates.isPinned = isPinned;
        }

        // Conditional rendering to check there is something to update
        if (Object.keys(updates).length === 0) {
            console.error('[ERROR: noteRoutes.js, PATCH /:id] No fields to update');// Log an error message in the console for debugging purposes
            return res.status(400).json({ message: 'No changes were sent' });// Return a 400 (Bad Request) status code with a message
        }

        // Only an active note the user owns can be edited (not archived or in the trash)
        const note = await populateNote(Note.findOneAndUpdate(
            { _id: id, user: userId, isArchived: false, deletedAt: null },
            { $set: updates }
        ));// The schema hook validates the update and returns the updated note

        // Conditional rendering to check the note was found
        if (!note) {
            console.error(`[ERROR: noteRoutes.js, PATCH /:id] Note not found: ${id}`);// Log an error message in the console for debugging purposes
            return res.status(404).json({ message: 'Note not found' });// Return a 404 (Not Found) status code with a message
        }

        console.log(`[SUCCESS: noteRoutes.js, PATCH /:id] Note updated: ${id}`);//Log a message in the console for debugging purposes
        return res.status(200).json({ message: 'Note updated successfully', note });// Send a 200 (OK) status code with the updated note
    } catch (error) {
        // Mongoose schema validation failed: send the first validation message back to the client
        if (error.name === 'ValidationError') {
            const firstMessage = Object.values(error.errors)[0]?.message;
            console.error('[ERROR: noteRoutes.js, PATCH /:id] Validation failed:', error.message);// Log an error message in the console for debugging purposes
            return res.status(400).json({ message: firstMessage || 'Invalid note details' });// Return a 400 (Bad Request) status code with a message
        }
        console.error('[ERROR: noteRoutes.js, PATCH /:id]', error.message);// Log an error message in the console for debugging purposes
        return res.status(500).json({ message: 'Internal Server Error' });// Return a 500 (Internal Server Error) status code with a message
    }
})
/* PATCH: /notes/:id/restore : Restores one of the signed-in user's trashed notes
by clearing deletedAt, which also takes it out of the 30-day TTL purge */
router.patch('/:id/restore', checkJwtToken, async (req, res) => {
    try {
        const userId = req.user.id;// Get the authenticated user's ID from the JWT token
        const { id } = req.params;// Get the note ID from the URL

        // Conditional rendering to check the id is a valid ObjectId (avoids a CastError 500)
        if (!mongoose.Types.ObjectId.isValid(id)) {
            console.error(`[ERROR: noteRoutes.js, PATCH /:id/restore] Invalid note id: ${id}`);// Log an error message in the console for debugging purposes
            return res.status(400).json({ message: 'Invalid note id' });// Return a 400 (Bad Request) status code with a message
        }

        // Only a note the user owns that is in the trash can be restored
        const note = await Note.findOneAndUpdate(
            { _id: id, user: userId, deletedAt: { $ne: null } },
            { $set: { deletedAt: null } }
        ).select('_id title isArchived');

        // Conditional rendering to check the note was found
        if (!note) {
            console.error(`[ERROR: noteRoutes.js, PATCH /:id/restore] Trashed note not found: ${id}`);// Log an error message in the console for debugging purposes
            return res.status(404).json({ message: 'Note not found in trash' });// Return a 404 (Not Found) status code with a message
        }

        console.log(`[SUCCESS: noteRoutes.js, PATCH /:id/restore] Note restored from trash: ${id}`);//Log a message in the console for debugging purposes
        return res.status(200).json({ message: 'Note restored', note });// Send a 200 (OK) status code with a message
    } catch (error) {
        console.error('[ERROR: noteRoutes.js, PATCH /:id/restore]', error.message);// Log an error message in the console for debugging purposes
        return res.status(500).json({ message: 'Internal Server Error' });// Return a 500 (Internal Server Error) status code with a message
    }
})

/*──────────────────────────── DELETE ROUTES ───────────────────────────────────
    DELETE: Used to remove an item from the database
 ────────────────────────────────────────────────────────────────────────────────*/
//Route to send a DELETE request to the /notes/:id endpoint
//DELETE request to move item to trash
/* DELETE: /notes/delete/:id : Soft deletes one of the signed-in user's notes by
setting deletedAt. The TTL index on deletedAt (noteSchema) purges it after 30 days */
router.delete('/delete/:id', checkJwtToken, async (req, res) => {
    try {
        const userId = req.user.id;// Get the authenticated user's ID from the JWT token
        const { id } = req.params;// Get the note ID from the URL

        // Conditional rendering to check the id is a valid ObjectId (avoids a CastError 500)
        if (!mongoose.Types.ObjectId.isValid(id)) {
            console.error(`[ERROR: noteRoutes.js, DELETE /delete/:id] Invalid note id: ${id}`);// Log an error message in the console for debugging purposes
            return res.status(400).json({ message: 'Invalid note id' });// Return a 400 (Bad Request) status code with a message
        }

        // Only a note the user owns and that is not already in the trash can be moved there
        const note = await Note.findOneAndUpdate(
            { _id: id, user: userId, deletedAt: null },
            { $set: { deletedAt: new Date(), isPinned: false } }
        ).select('_id title');

        // Conditional rendering to check the note was found
        if (!note) {
            console.error(`[ERROR: noteRoutes.js, DELETE /delete/:id] Note not found: ${id}`);// Log an error message in the console for debugging purposes
            return res.status(404).json({ message: 'Note not found' });// Return a 404 (Not Found) status code with a message
        }

        console.log(`[SUCCESS: noteRoutes.js, DELETE /delete/:id] Note moved to trash: ${id}`);//Log a message in the console for debugging purposes
        return res.status(200).json({ message: 'Note moved to trash', note });// Send a 200 (OK) status code with a message
    } catch (error) {
        console.error('[ERROR: noteRoutes.js, DELETE /delete/:id]', error.message);// Log an error message in the console for debugging purposes
        return res.status(500).json({ message: 'Internal Server Error' });// Return a 500 (Internal Server Error) status code with a message
    }
})
/* DELETE: /notes/:id/permanent : Permanently deletes one of the signed-in user's
trashed notes and every translation linked to it. Only notes already in the trash
can be deleted this way, so an active note can't be wiped in one step */
router.delete('/:id/permanent', checkJwtToken, async (req, res) => {
    try {
        const userId = req.user.id;// Get the authenticated user's ID from the JWT token
        const { id } = req.params;// Get the note ID from the URL

        // Conditional rendering to check the id is a valid ObjectId (avoids a CastError 500)
        if (!mongoose.Types.ObjectId.isValid(id)) {
            console.error(`[ERROR: noteRoutes.js, DELETE /:id/permanent] Invalid note id: ${id}`);// Log an error message in the console for debugging purposes
            return res.status(400).json({ message: 'Invalid note id' });// Return a 400 (Bad Request) status code with a message
        }

        const note = await Note.findOneAndDelete({ _id: id, user: userId, deletedAt: { $ne: null } }).select('_id title');

        // Conditional rendering to check the note was found
        if (!note) {
            console.error(`[ERROR: noteRoutes.js, DELETE /:id/permanent] Trashed note not found: ${id}`);// Log an error message in the console for debugging purposes
            return res.status(404).json({ message: 'Note not found in trash' });// Return a 404 (Not Found) status code with a message
        }

        // Remove the translations made from this note now that the note is gone
        const { deletedCount } = await Translation.deleteMany({ note: id, user: userId });

        console.log(`[SUCCESS: noteRoutes.js, DELETE /:id/permanent] Note ${id} deleted with ${deletedCount} translations`);//Log a message in the console for debugging purposes
        return res.status(200).json({ message: 'Note permanently deleted', note, deletedTranslations: deletedCount });// Send a 200 (OK) status code with a message
    } catch (error) {
        console.error('[ERROR: noteRoutes.js, DELETE /:id/permanent]', error.message);// Log an error message in the console for debugging purposes
        return res.status(500).json({ message: 'Internal Server Error' });// Return a 500 (Internal Server Error) status code with a message
    }
})


//========EXPORT THE ROUTER============
module.exports = router;// Export the router to be used in other parts of the application