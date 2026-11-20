//docTranslateRoutes.js
/*mounted at '/document' by app.js
GET - /document/fetchDocuments - Lists the current user's saved document translations, newest first (text omitted)
GET - `/document/fetchDoc/:id` - Fetches a single saved document translation in full
POST - /document/translateDoc` - Translates an uploaded PDF (multipart form data)
`POST` - /document/saveDoc - Saves the document translation on screen 
DELETE `/document/:id` - Soft delete (move to trash)
DELETE - :id/permanent - Permanently delete a trashed translation*/
const express = require('express');
const DocTranslation = require('../models/docTranslateSchema');
const { checkJwtToken } = require('../middleware/securityMiddleware');
const router = express.Router()

/*──────────────────────────── GET ROUTES ─────────────────────────────────────
   GET: READ — Used to fetch information from the provider and the database
────────────────────────────────────────────────────────────────────────────────*/
/* Lists the signed-in user's saved document translations, newest first, for
the Document Translations table on the translations page.

The text itself is left out of the rows: a document holds up to 20000
characters either side, so returning it for every row would send megabytes to
fill a table that only shows the file name and the language pair. The details
panel reads the full row from GET /fetchDoc/:id when one is opened. */
router.get('/fetchDocuments' , async (req, res) => {
    try {
        
    } catch (error) {
        
    }
})
/* Fetches a single saved document translation in full, used to fill the
Document Translations details panel */
router.get('fetchDoc/:id' , checkJwtToken, async (req, res) => {
    try {
        const {id} = req.params;

         // Conditional rendering to check the id is a usable ObjectId
        if (!mongoose.Types.ObjectId.isValid(id)) {
            console.error(`[ERROR: translateRoutes.js, GET /fetchDoc/:id] Invalid document id: ${id}`);
            return res.status(400).json({ message: 'Invalid document id' });
        }

         const document = await DocumentTranslation.findOne({
            _id: id,
            userId: req.user.id,// Scoped to the caller, so ids cannot be probed
        }).exec();


         // Conditional rendering to check the document translation was found
        if (!document) {
            console.error(`[ERROR: docTranslateRoute.js, GET /fetchDoc/:id] Document translation not found: ${id}`);
            return res.status(404).json({ message: 'Document translation not found' });
        }

        console.log('[SUCCESS: docTranslateRoute.js, GET /fetchDoc/:id] Returned document translation:', document._id);
        return res.status(200).json(document);

    } catch (error) {
        console.error('[ERROR: docTranslateRoute.js, GET /fetchDoc/:id]', error.message);// Log an error message in the console for debugging purposes
        return res.status(500).json({ message: 'Internal Server Error' });
    }
})


module.exports = router;