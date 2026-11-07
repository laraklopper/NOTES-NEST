//archiveRoutes.js
/*mounted at '/archive' in app.js
GET - /archive/fetchNotes - fetchAll archived notes
PATCH - /archive/:id/restore - restore a note to the main notes list
DELETE - route to move an archived note to trash?
*/
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');// Used to validate ObjectIds
const Note = require('../models/noteSchema');// Import the Note model
const { checkJwtToken } = require('./middleware');// Import the JWT middleware
const router = express.Router()

/*──────────────────────────── GET ROUTES ─────────────────────────────────────
   GET: READ — Used to fetch information from the database
────────────────────────────────────────────────────────────────────────────────*/
 //Route to send a PATCH request to the /archive/fetchNotes endpoint
router.get('/fetchNotes', checkJwtToken, async (req, res) => {
    
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
            { $set: { isArchived: true, isPinned: false } }
        ).select('_id title isArchived');

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
 //Route to send a PATCH request to the /archive/:id/restore endpoint
router.patch('/:id/restore', checkJwtToken, async (req, res) => {
    
})
/*──────────────────────────── DELETE ROUTES ───────────────────────────────────
    DELETE: Used to remove an item from the database
 ────────────────────────────────────────────────────────────────────────────────*/
 //Route to send a DELETE request to the /archive/:id endpoint
 //Move a archived note to trash
router.delete('/:id', checkJwtToken, async (req, res) => {
    
})
//========EXPORT THE ROUTER============
module.exports = router;// Export the router to be used in other parts of the application