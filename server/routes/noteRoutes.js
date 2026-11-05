// noteRoutes.js
/*mounted at /notes by app.js
GET- /fetchNotes - fethc and list all notes for the specific user
GET - /:id - Get a single note by id
POST - /addNote - Create a note
PATCH - /notes/:id - Update title, content, languages, tags, pin or archive
PATCH - /notes/:id/restore - Restore from trash
DELETE - /notes/:id - Soft delete (move to trash)
DELETE - `/notes/:id/permanent` - Permanently delete a note and its translations
*/
require('dotenv').config()
const express = require('express');
const router = express.Router()


/*──────────────────────────── GET ROUTES ─────────────────────────────────────
   GET: READ — Used to fetch information from the provider and the database
────────────────────────────────────────────────────────────────────────────────*/
router.get('/fetchNotes', async (req, res) => {
    
})

router.get(`/notes/trash`, async (req, res) => {
    
})
/*──────────────────────────── POST ROUTES ──────────────────────────────
    POST: Used to send text to the provider for translation or detection
 ─────────────────────────────────────────────────────────────────────────*/
router.post('/addNote', async (req, res) => {
    try {
        
    } catch (error) {
        
    }
})

module.exports = router;