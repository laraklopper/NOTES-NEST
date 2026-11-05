//tagRoutes.js
/*mounted at /tag by app.js
GET - '/fetchTags'
POST - '/addTag' - Create a tag for the signed-in user
DELETE - '/:id' - Delete a tag: $pull it from notes
*/
require('dotenv').config()
const express = require('express');
const Tag = require('../models/tagSchema');// Import the Tag model
const { checkJwtToken } = require('./middleware');// Import the JWT middleware
const router = express.Router()

/*──────────────────────────── GET ROUTES ─────────────────────────────────────
   GET: READ — Used to fetch information from the provider and the database
────────────────────────────────────────────────────────────────────────────────*/
router.get('/fetchTags', checkJwtToken, async (req, res) => {
    try {
        
    } catch (error) {
        
    }
})
/*──────────────────────────── POST ROUTES ──────────────────────────────
    POST: CREATE — Used to submit new data to the database
 ─────────────────────────────────────────────────────────────────────────*/
/* POST: /tag/addTag : Creates a tag for the signed-in user from the AddTag form
on the NotePad page. Tag names are unique per user (409 on duplicates). */
router.post('/addTag', checkJwtToken, async (req, res) => {
    try {
        const userId = req.user.id;// Get the authenticated user's ID from the JWT token
        const { name } = req.body || {};// Extract the tag name from the request body

        // Conditional rendering to check the name is present (and is a string, so it cannot inject query operators)
        if (typeof name !== 'string' || !name.trim()) {
            console.error('[ERROR: tagRoutes.js, POST /addTag] Tag name is required');// Log an error message in the console for debugging purposes
            return res.status(400).json({ message: 'Tag name is required' });// Return a 400 (Bad Request) status code with a message
        }

        const newTag = await Tag.create({// Validate and save the tag (the schema trims and lowercases the name)
            user: userId,
            name
        });

        console.log(`[SUCCESS: tagRoutes.js, POST /addTag] Tag created: ${newTag._id}`);//Log a message in the console for debugging purposes
        return res.status(201).json({// Send a 201 (Created) status code with the new tag
            message: 'Tag saved successfully',
            tag: newTag
        });
    } catch (error) {
        // Mongoose schema validation failed: send the first validation message back to the client
        if (error.name === 'ValidationError') {
            const firstMessage = Object.values(error.errors)[0]?.message;
            console.error('[ERROR: tagRoutes.js, POST /addTag] Validation failed:', error.message);// Log an error message in the console for debugging purposes
            return res.status(400).json({ message: firstMessage || 'Invalid tag name' });// Return a 400 (Bad Request) status code with a message
        }
        // Duplicate key on the { user, name } unique index
        if (error.code === 11000) {
            console.error('[ERROR: tagRoutes.js, POST /addTag] Duplicate tag name');// Log an error message in the console for debugging purposes
            return res.status(409).json({ message: 'You already have a tag with that name' });// Return a 409 (Conflict) status code with a message
        }
        console.error('[ERROR: tagRoutes.js, POST /addTag]', error.message);// Log an error message in the console for debugging purposes
        return res.status(500).json({ message: 'Internal Server Error' });// Return a 500 (Internal Server Error) status code with a message
    }
})

module.exports = router;
