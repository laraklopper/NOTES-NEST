//tagRoutes.js
/*mounted at /tag by app.js
GET - '/fetchTags' - List the signed-in user's tags with usage counts
POST - '/addTag' - Create a tag for the signed-in user
DELETE - '/:id' - Delete a tag: $pull it from notes
*/
require('dotenv').config()
const express = require('express');
const mongoose = require('mongoose');
const Tag = require('../models/tagSchema');// Import the Tag model
const Note = require('../models/noteSchema');// Import the Note model (for tag usage counts)
const { checkJwtToken } = require('../middleware/middleware');// Import the JWT middleware
const router = express.Router()

/*──────────────────────────── GET ROUTES ─────────────────────────────────────
   GET: READ — Used to fetch information from the provider and the database
────────────────────────────────────────────────────────────────────────────────*/
/* GET: /tag/fetchTags : Lists the signed-in user's tags (A-Z) with the number
of active notes that use each tag. */
router.get('/fetchTags', checkJwtToken, async (req, res) => {
    try {
        const userId = req.user.id;// Get the authenticated user's ID from the JWT token

        const tags = await Tag.find({ user: userId }).sort({ name: 1 });// Fetch the user's tags in alphabetical order

        // Count the active (not soft-deleted) notes per tag in a single query
        const counts = await Note.aggregate([
            { $match: { user: new mongoose.Types.ObjectId(userId), deletedAt: null } },
            { $unwind: '$tags' },
            { $group: { _id: '$tags', count: { $sum: 1 } } }
        ]);
        const countMap = new Map(counts.map((c) => [c._id.toString(), c.count]));

        const tagsWithCounts = tags.map((tag) => ({
            ...tag.toJSON(),
            noteCount: countMap.get(tag._id.toString()) || 0
        }));

        console.log(`[SUCCESS: tagRoutes.js, GET /fetchTags] Fetched ${tagsWithCounts.length} tags`);//Log a message in the console for debugging purposes
        return res.status(200).json({ tags: tagsWithCounts });// Send a 200 (OK) status code with the tags
    } catch (error) {
        console.error('[ERROR: tagRoutes.js, GET /fetchTags]', error.message);// Log an error message in the console for debugging purposes
        return res.status(500).json({ message: 'Internal Server Error' });// Return a 500 (Internal Server Error) status code with a message
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

/*──────────────────────────── DELETE ROUTES ───────────────────────────────────
    DELETE: Used to remove an item from the database
 ────────────────────────────────────────────────────────────────────────────────*/
/* DELETE: /tag/:id : Deletes one of the signed-in user's tags from the TagsList
on the Notes page. The tagSchema findOneAndDelete hook $pulls it from every note. */
router.delete('/:id', checkJwtToken, async (req, res) => {
    try {
        const userId = req.user.id;// Get the authenticated user's ID from the JWT token
        const { id } = req.params;// Get the tag ID from the URL

        // Conditional rendering to check the id is a valid ObjectId (avoids a CastError 500)
        if (!mongoose.Types.ObjectId.isValid(id)) {
            console.error(`[ERROR: tagRoutes.js, DELETE /:id] Invalid tag id: ${id}`);// Log an error message in the console for debugging purposes
            return res.status(400).json({ message: 'Invalid tag id' });// Return a 400 (Bad Request) status code with a message
        }

        const tag = await Tag.findOneAndDelete({ _id: id, user: userId });// Only a tag the user owns can be deleted; runs the hook that removes it from notes

        // Conditional rendering to check the tag was found
        if (!tag) {
            console.error(`[ERROR: tagRoutes.js, DELETE /:id] Tag not found: ${id}`);// Log an error message in the console for debugging purposes
            return res.status(404).json({ message: 'Tag not found' });// Return a 404 (Not Found) status code with a message
        }

        console.log(`[SUCCESS: tagRoutes.js, DELETE /:id] Tag deleted: ${id}`);//Log a message in the console for debugging purposes
        return res.status(200).json({ message: 'Tag deleted', tag: { _id: tag._id, name: tag.name } });// Send a 200 (OK) status code with a message
    } catch (error) {
        console.error('[ERROR: tagRoutes.js, DELETE /:id]', error.message);// Log an error message in the console for debugging purposes
        return res.status(500).json({ message: 'Internal Server Error' });// Return a 500 (Internal Server Error) status code with a message
    }
})

//========EXPORT THE ROUTER============
module.exports = router;// Export the router to be used in other parts of the application
