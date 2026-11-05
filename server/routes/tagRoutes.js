//tagRoutes.js
/*
GET - '/fetchTags'
POST - '/addTags'
DELETE - '/:id' - Delete a tag: $pull it from notes
*/
require('dotenv').config()
const express = require('express');
const router = express.Router()

router.post('/addTag', async (req, res) => {
    
})
module.exports = router;