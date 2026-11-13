//tagRoutes.js
/*mounted at /tag by app.js
GET - '/fetchTags' - List the signed-in user's tags with active (not archived or trashed) note counts
POST - '/addTag' - Create a tag for the signed-in user
PUT - '/:id' - Rename a tag
DELETE - '/:id' - Delete a tag: $pull it from notes
*/
const express = require('express');
const mongoose = require('mongoose');// Used to validate ObjectIds and cast the user id for aggregate()
const Tag = require('../models/tagSchema');// Import the Tag model
const Note = require('../models/noteSchema');// Import the Note model (for tag usage counts)
const { checkJwtToken } = require('../middleware/securityMiddleware');// Import the JWT middleware
const router = express.Router()

/*──────────────────────────── GET ROUTES ─────────────────────────────────────
   GET: READ — Used to fetch information from the database
────────────────────────────────────────────────────────────────────────────────*/
/* GET: /tag/fetchTags : Lists the signed-in user's tags (A-Z) with the number
of active notes (not archived or trashed) that use each tag, the same notes the
Notes list shows when filtering by a tag. */
router.get('/fetchTags', checkJwtToken, async (req, res) => {
    try {
        const userId = req.user.id;// Get the authenticated user's ID from the JWT token

        // The two queries don't depend on each other, so run them in parallel
        const [tags, counts] = await Promise.all([
            Tag.find({ user: userId }).select('-__v').sort({ name: 1 }).lean(),// The user's tags A-Z as plain objects
            Note.aggregate([// Count the active notes per tag in a single query
                { $match: { user: new mongoose.Types.ObjectId(userId), isArchived: false, deletedAt: null } },
                { $unwind: '$tags' },
                { $group: { _id: '$tags', count: { $sum: 1 } } }
            ])
        ]);
        const countMap = new Map(counts.map((c) => [c._id.toString(), c.count]));// tagId -> count

        const tagsWithCounts = tags.map((tag) => ({
            ...tag,
            noteCount: countMap.get(tag._id.toString()) || 0// Unused tags aren't in counts
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

        // Guard clause: check the name is present (and is a string, so it cannot inject query operators)
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

/*──────────────────────────── PUT ROUTES ──────────────────────────────────────
    PUT: UPDATE — Used to replace data in the database (the name is a tag's only editable field)
 ────────────────────────────────────────────────────────────────────────────────*/
/* PUT: /tag/:id : Renames one of the signed-in user's tags from the TagsList on
the Notes page. Notes store tag IDs, so every note shows the new name via populate. */
router.put('/:id', checkJwtToken, async (req, res) => {
    try {
        const userId = req.user.id;// Get the authenticated user's ID from the JWT token
        const { id } = req.params;// Get the tag ID from the URL
        const { name } = req.body || {};// Extract the new tag name from the request body

        // Check the id is a valid ObjectId (avoids a CastError 500)
        if (!mongoose.Types.ObjectId.isValid(id)) {
            console.error(`[ERROR: tagRoutes.js, PUT /:id] Invalid tag id: ${id}`);// Log an error message in the console for debugging purposes
            return res.status(400).json({ message: 'Invalid tag id' });// Return a 400 (Bad Request) status code with a message
        }

        // Check the name is present (and is a string, so it cannot inject query operators)
        if (typeof name !== 'string' || !name.trim()) {
            console.error('[ERROR: tagRoutes.js, PUT /:id] Tag name is required');// Log an error message in the console for debugging purposes
            return res.status(400).json({ message: 'Tag name is required' });// Return a 400 (Bad Request) status code with a message
        }

        // Only a tag the user owns can be renamed
        const tag = await Tag.findOneAndUpdate(
            { _id: id, user: userId },
            { $set: { name: name.trim().toLowerCase() } },// Same format the schema stores (trim + lowercase)
            { returnDocument: 'after', runValidators: true }// Return the renamed tag and check the length limit
        );

        // Check the tag was found
        if (!tag) {
            console.error(`[ERROR: tagRoutes.js, PUT /:id] Tag not found: ${id}`);// Log an error message in the console for debugging purposes
            return res.status(404).json({ message: 'Tag not found' });// Return a 404 (Not Found) status code with a message
        }

        console.log(`[SUCCESS: tagRoutes.js, PUT /:id] Tag renamed: ${id}`);//Log a message in the console for debugging purposes
        return res.status(200).json({ message: 'Tag updated successfully', tag });// Send a 200 (OK) status code with the updated tag
    } catch (error) {
        // Mongoose schema validation failed: send the first validation message back to the client
        if (error.name === 'ValidationError') {
            const firstMessage = Object.values(error.errors)[0]?.message;
            console.error('[ERROR: tagRoutes.js, PUT /:id] Validation failed:', error.message);// Log an error message in the console for debugging purposes
            return res.status(400).json({ message: firstMessage || 'Invalid tag name' });// Return a 400 (Bad Request) status code with a message
        }
        // Duplicate key on the { user, name } unique index
        if (error.code === 11000) {
            console.error('[ERROR: tagRoutes.js, PUT /:id] Duplicate tag name');// Log an error message in the console for debugging purposes
            return res.status(409).json({ message: 'You already have a tag with that name' });// Return a 409 (Conflict) status code with a message
        }
        console.error('[ERROR: tagRoutes.js, PUT /:id]', error.message);// Log an error message in the console for debugging purposes
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

        // Guard clause: check the id is a valid ObjectId (avoids a CastError 500)
        if (!mongoose.Types.ObjectId.isValid(id)) {
            console.error(`[ERROR: tagRoutes.js, DELETE /:id] Invalid tag id: ${id}`);// Log an error message in the console for debugging purposes
            return res.status(400).json({ message: 'Invalid tag id' });// Return a 400 (Bad Request) status code with a message
        }

        const tag = await Tag.findOneAndDelete({ _id: id, user: userId });// Only a tag the user owns can be deleted; runs the hook that removes it from notes

        // Guard clause: check the tag was found
        if (!tag) {
            console.error(`[ERROR: tagRoutes.js, DELETE /:id] Tag not found: ${id}`);// Log an error message in the console for debugging purposes
            return res.status(404).json({ message: 'Tag not found' });// Return a 404 (Not Found) status code with a message
        }

        console.log(`[SUCCESS: tagRoutes.js, DELETE /:id] Tag deleted: ${id}`);//Log a message in the console for debugging purposes
        return res.status(200).json({ message: 'Tag deleted', tag: { _id: tag._id, name: tag.name } });// Send a 200 (OK) status code with a message and the deleted tag's id and name
    } catch (error) {
        console.error('[ERROR: tagRoutes.js, DELETE /:id]', error.message);// Log an error message in the console for debugging purposes
        return res.status(500).json({ message: 'Internal Server Error' });// Return a 500 (Internal Server Error) status code with a message
    }
})

//========EXPORT THE ROUTER============
module.exports = router;// Export the router to be used in other parts of the application
