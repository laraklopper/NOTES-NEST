//archiveRoutes.js
/*mounted at '/archive' in app.js
GET - /archive/fetchNotes - fetchAll archived notes
PATCH - /archive/:id/restore - restore a note to the main notes list
DELETE - route to move an archived note to trash?
*/
require('dotenv').config();

const express = require('express');
const router = express.Router()

/*──────────────────────────── GET ROUTES ─────────────────────────────────────
   GET: READ — Used to fetch information from the database
────────────────────────────────────────────────────────────────────────────────*/
 //Route to send a PATCH request to the /archive/fetchNotes endpoint
router.get('/fetchNotes', async (req, res) => {
    
})
/*──────────────────────────── PATCH ROUTES ───────────────────────────────────
   PATCH: UPDATE — Used to partially update information in the database
────────────────────────────────────────────────────────────────────────────────*/
 //Route to send a PATCH request to the /archive/:id/restore endpoint
router.patch('/:id/restore', async (req, res) => {
    
})
/*──────────────────────────── DELETE ROUTES ───────────────────────────────────
    DELETE: Used to remove an item from the database
 ────────────────────────────────────────────────────────────────────────────────*/
 //Route to send a DELETE request to the /archive/:id endpoint
 //Move a archived note to trash
router.delete('/:id', async (req, res) => {
    
})
//========EXPORT THE ROUTER============
module.exports = router;// Export the router to be used in other parts of the application