//docTranslateRoutes.js
/*mounted at '/translate' by app.js
GET - /fetchDocTranslations - Lists the current user's saved document translations, newest first (text omitted)
GET - `/translate/fetchDoc/:id` - Fetches a single saved document translation in full
POST - /translate/translateDoc` - Translates an uploaded PDF (multipart form data)
`POST` - /translate/saveDoc - Saves the document translation on screen 
DELETE `/translate/deleteDoc/:id` - Deletes a single saved document translation
DELETE - /translate/clearDocs` - Clears all saved document translations for the current user*/
const express = require('express');
const DocTranslation = require('../models/docTranslateSchema')
const router = express.Router()

module.exports = router;