//docTranslateRoutes.js
/*mounted at '/document' by app.js
GET - /fetchTranslations - Lists the current user's saved document translations, newest first (text omitted)
GET - `/translate/fetchDoc/:id` - Fetches a single saved document translation in full
POST - /translate/translateDoc` - Translates an uploaded PDF (multipart form data)
`POST` - /document/saveDoc - Saves the document translation on screen 
DELETE `/document/:id` - Soft delete (move to trash)
DELETE - :id/permanent - Permanently delete a trashed translation*/
const express = require('express');
const DocTranslation = require('../models/docTranslateSchema')
const router = express.Router()

router.get('/fetcj')
module.exports = router;