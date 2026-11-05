//apiRoutes.js
/*mounted at /api by app.js
- GET - '/language/translate/v2/languages' - Fetch supported languages for dropdowns
- POST - /language/translate/v2/detect - Detect the language of text body
- POST - /language/translate/v2 - Translate text(without saving)
 */
require('dotenv').config();
const express = require('express');
const router = express.Router()

router.get('/language/translate/v2/languages', async (req, res) => {
    
})

router.post('/language/translate/v2', async (req, res) => {
    
})

router.post('/language/translate/v2/detect', async (req, res) => {
    
})
module.exports = router