//archiveRoutes.js
/*mounted at '/archive' in app.js
GET - /archive/fetchNotes - fetchAll archived notes
PATCH - /archive/:id/restore - restore a note to the main notes list
DELETE - route to move an archived note to trash?
*/
require('dotenv').config();

const express = require('express');
const router = express.Router()

router.get('/fetchNotes')

router.patch('/:id', async (req, res) => {
    
})

//========EXPORT THE ROUTER============
module.exports = router;// Export the router to be used in other parts of the application