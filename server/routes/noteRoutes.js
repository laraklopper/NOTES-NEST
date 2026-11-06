// noteRoutes.js
/*mounted at /notes by app.js
GET- /fetchNotes - fethc and list all notes for the specific user
GET - /:id - Get a single note by id
GET - /trash - List trashed notes - (declare route before /:id)
POST - /addNote - Create a note (tags sent as names; missing tags are created)
PATCH - /notes/:id - Update title, content, languages, tags, pin or archive
PATCH - /notes/:id/restore - Restore from trash
DELETE - /notes/:id - Soft delete (move to trash)
DELETE - `/notes/:id/permanent` - Permanently delete a note and its translations
*/
require('dotenv').config()
const express = require('express');
const mongoose = require('mongoose');// Used to validate ObjectIds
const Note = require('../models/noteSchema');// Import the Note model
const Notebook = require('../models/notebookSchema');// Import the Notebook model
const Tag = require('../models/tagSchema');// Import the Tag model
const User = require('../models/userSchema');// Import the User model
const { checkJwtToken } = require('./middleware');// Import the JWT middleware
const router = express.Router()


/*──────────────────────────── GET ROUTES ─────────────────────────────────────
   GET: READ — Used to fetch information from the provider and the database
────────────────────────────────────────────────────────────────────────────────*/
// Route to send a GET request to the /notes/fetchNotes endpoint
//Fetch and list all notes for the specific user
router.get('/fetchNotes', async (req, res) => {
    
})
// Route to send a GET request to the /notes/trash endpoint
//List trashed notes - (declare route before /:id)
router.get(`/trash`, async (req, res) => {
    
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
            if (!mongoose.Types.ObjectId.isValid(notebook)) {
                console.error(`[ERROR: noteRoutes.js, POST /addNote] Invalid notebook id: ${notebook}`);// Log an error message in the console for debugging purposes
                return res.status(400).json({ message: 'Invalid notebook id' });// Return a 400 (Bad Request) status code with a message
            }
            const ownNotebook = await Notebook.exists({ _id: notebook, user: userId });
            if (!ownNotebook) {
                console.error(`[ERROR: noteRoutes.js, POST /addNote] Notebook not found: ${notebook}`);// Log an error message in the console for debugging purposes
                return res.status(404).json({ message: 'That notebook no longer exists' });// Return a 404 (Not Found) status code with a message
            }
            notebookId = notebook;
        }

        /* Tag names are stored lowercase (see tagSchema), so normalise them here
        and drop blanks and duplicates before looking them up */
        const tagNames = [...new Set(tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean))];
        if (tagNames.some((name) => name.length > 30)) {
            console.error('[ERROR: noteRoutes.js, POST /addNote] Tag name too long');// Log an error message in the console for debugging purposes
            return res.status(400).json({ message: 'Tag names cannot exceed 30 characters' });// Return a 400 (Bad Request) status code with a message
        }
        // Find each tag, creating the ones the user does not have yet
        const tagDocs = await Promise.all(tagNames.map((name) => Tag.findOneAndUpdate(
            { user: userId, name },
            { $setOnInsert: { user: userId, name } },
            { upsert: true, returnDocument: 'after', runValidators: true }
        ).exec()));

        const newNote = await Note.create({// Validate and save the note (content is sanitised by the noteSchema hook)
            user: userId,
            notebook: notebookId,
            title: title?.trim() || undefined,// Leave blank titles to the schema default ("Untitled")
            content,
            language: noteLanguage,
            tags: tagDocs.map((tag) => tag._id),
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
 //Route to send a PATCH request to the /notes:id endpoint
// PATCH route to Update title, content, languages, tags, pin or archive
router.patch('/:id', async (req, res) => {
    
} )
 //Route to send a PATCH request to the /notes/:id/restore endpoint
// PATCH request to restore a note from trash
router.patch('/:id/restore', async (req, res) => {
    
})

/*──────────────────────────── DELETE ROUTES ───────────────────────────────────
    DELETE: Used to remove an item from the database
 ────────────────────────────────────────────────────────────────────────────────*/
//Route to send a DELETE request to the /notes/:id endpoint
//DELETE request to move item to trash
router.delete('/:id', async (req, res) => {
    
})
 //Route to send a DELETE request to the /notes/:id/permanent endpoint
//DELETE - Permanently delete a note and its translations
router.delete('/:id/permanent', async (req, res) => {
    
})


//========EXPORT THE ROUTER============
module.exports = router;// Export the router to be used in other parts of the application