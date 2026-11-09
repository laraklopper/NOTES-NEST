//notebookRoutes.js
/*mounted at /notebooks by app.js
GET - '/' - List the signed-in user's notebooks with note counts
POST - '/' - Create a notebook for the signed-in user
PATCH - '/:id' - Rename or recolour a notebook
DELETE - '/:id' - Delete a notebook: its notes move to "No notebook"
*/
/* Load environment variables from a .env
file using the dotenv package*/
require('dotenv').config()
const express = require('express');
const mongoose = require('mongoose');
const Notebook = require('../models/notebookSchema');// Import the Notebook model
const Note = require('../models/noteSchema');// Import the Note model (for notebook note counts)
const { checkJwtToken } = require('./middleware');// Import the JWT middleware
const router = express.Router()// Create a new router instance

/*──────────────────────────── SHARED HELPERS ─────────────────────────────────
   Used by POST / and PATCH /:id
────────────────────────────────────────────────────────────────────────────────*/
/* Turns a save error into { status, message } to send back, or null if it is
an unexpected error (500) */
const notebookSaveError = (error) => {
    // Mongoose schema validation failed: send the first validation message back to the client
    if (error.name === 'ValidationError') {
        const firstMessage = Object.values(error.errors)[0]?.message;
        return { status: 400, message: firstMessage || 'Invalid notebook details' };
    }
    // Duplicate key on the { user, name } unique index
    if (error.code === 11000) {
        console.error('[ERROR: notebookRoutes.js]: You already have a notebook with that name');//Log the error in the console for debugging purposes
        return { status: 409, message: 'You already have a notebook with that name' };
    }
    return null;
}

/*──────────────────────────── GET ROUTES ─────────────────────────────────────
   GET: READ — Used to fetch information from the provider and the database
────────────────────────────────────────────────────────────────────────────────*/
/* GET: /notebooks : Lists the signed-in user's notebooks (A-Z) with the number
of active notes (not archived or trashed) in each one. */
router.get('/', checkJwtToken, async (req, res) => {
    try {
        const userId = req.user.id;// Get the authenticated user's ID from the JWT token

        const notebooks = await Notebook.find({ user: userId }).sort({ name: 1 });// Fetch the user's notebooks in alphabetical order

        // Count the active notes per notebook in a single query
        const counts = await Note.aggregate([
            { $match: { user: new mongoose.Types.ObjectId(userId), isArchived: false, deletedAt: null, notebook: { $ne: null } } },
            { $group: { _id: '$notebook', count: { $sum: 1 } } }
        ]);
        const countMap = new Map(counts.map((c) => [c._id.toString(), c.count]));

        const notebooksWithCounts = notebooks.map((notebook) => ({
            ...notebook.toJSON(),
            noteCount: countMap.get(notebook._id.toString()) || 0
        }));

        console.log(`[SUCCESS: notebookRoutes.js, GET /] Fetched ${notebooksWithCounts.length} notebooks`);//Log a message in the console for debugging purposes
        return res.status(200).json({ notebooks: notebooksWithCounts });// Send a 200 (OK) status code with the notebooks
    } catch (error) {
        console.error('[ERROR: notebookRoutes.js, GET /]', error.message);// Log an error message in the console for debugging purposes
        return res.status(500).json({ message: 'Internal Server Error' });// Return a 500 (Internal Server Error) status code with a message
    }
})

/*──────────────────────────── POST ROUTES ──────────────────────────────
    POST: CREATE — Used to submit new data to the database
 ─────────────────────────────────────────────────────────────────────────*/
/* POST: /notebooks : Creates a notebook for the signed-in user from the AddNoteBook
form on the NotePad page. Notebook names are unique per user (409 on duplicates). */
router.post('/', checkJwtToken, async (req, res) => {
    try {
        const userId = req.user.id;// Get the authenticated user's ID from the JWT token
        const { name, colour } = req.body || {};// Extract the notebook fields from the request body

        // Conditional rendering to check the name is present (and is a string, so it cannot inject query operators)
        if (typeof name !== 'string' || !name.trim()) {
            console.error('[ERROR: notebookRoutes.js, POST /] Notebook name is required');// Log an error message in the console for debugging purposes
            return res.status(400).json({ message: 'Notebook name is required' });// Return a 400 (Bad Request) status code with a message
        }
        // Conditional rendering to check the optional colour is a string
        if (colour !== undefined && colour !== null && typeof colour !== 'string') {
            console.error('[ERROR: notebookRoutes.js, POST /] Invalid colour');// Log an error message in the console for debugging purposes
            return res.status(400).json({ message: 'Colour must be a hex code, e.g. #1F4E79' });// Return a 400 (Bad Request) status code with a message
        }

        const newNotebook = await Notebook.create({// Validate and save the notebook (the schema trims the name and checks the colour)
            user: userId,
            name,
            colour: colour?.trim() || undefined// Leave a blank colour to the schema default (#1F4E79)
        });

        console.log(`[SUCCESS: notebookRoutes.js, POST /] Notebook created: ${newNotebook._id}`);//Log a message in the console for debugging purposes
        return res.status(201).json({// Send a 201 (Created) status code with the new notebook
            message: 'Notebook saved successfully',
            notebook: newNotebook
        });
    } catch (error) {
        const saveError = notebookSaveError(error);
        if (saveError) {
            console.error('[ERROR: notebookRoutes.js, POST /]', saveError.message);// Log an error message in the console for debugging purposes
            return res.status(saveError.status).json({ message: saveError.message });// Return a 400 (Bad Request) or 409 (Conflict) status code with a message
        }
        console.error('[ERROR: notebookRoutes.js, POST /]', error.message);// Log an error message in the console for debugging purposes
        return res.status(500).json({ message: 'Internal Server Error' });// Return a 500 (Internal Server Error) status code with a message
    }
})

/*──────────────────────────── PATCH ROUTES ───────────────────────────────────
   PATCH: UPDATE — Used to partially update information in the database
────────────────────────────────────────────────────────────────────────────────*/
/* PATCH: /notebooks/:id : Renames or recolours one of the signed-in user's
notebooks. Only the fields sent in the body are changed. */
router.patch('/:id', checkJwtToken, async (req, res) => {
    try {
        const userId = req.user.id;// Get the authenticated user's ID from the JWT token
        const { id } = req.params;// Get the notebook ID from the URL
        const { name, colour } = req.body || {};// Extract the notebook fields from the request body

        // Conditional rendering to check the id is a valid ObjectId (avoids a CastError 500)
        if (!mongoose.Types.ObjectId.isValid(id)) {
            console.error(`[ERROR: notebookRoutes.js, PATCH /:id] Invalid notebook id: ${id}`);// Log an error message in the console for debugging purposes
            return res.status(400).json({ message: 'Invalid notebook id' });// Return a 400 (Bad Request) status code with a message
        }

        // Conditional rendering to check the sent fields are strings (so they cannot inject query operators)
        if ((name !== undefined && typeof name !== 'string') ||
            (colour !== undefined && typeof colour !== 'string')) {
            console.error('[ERROR: notebookRoutes.js, PATCH /:id] Invalid field types');// Log an error message in the console for debugging purposes
            return res.status(400).json({ message: 'Invalid notebook details' });// Return a 400 (Bad Request) status code with a message
        }

        // Build the update from only the fields that were sent
        const updates = {};
        if (name !== undefined) {
            // Conditional rendering to check the name is not being emptied
            if (!name.trim()) {
                console.error('[ERROR: notebookRoutes.js, PATCH /:id] Notebook name is required');// Log an error message in the console for debugging purposes
                return res.status(400).json({ message: 'Notebook name is required' });// Return a 400 (Bad Request) status code with a message
            }
            updates.name = name.trim();
        }
        if (colour !== undefined && colour.trim()) {
            updates.colour = colour.trim();// Format is checked by the schema's hexColourRegex
        }

        // Conditional rendering to check there is something to update
        if (Object.keys(updates).length === 0) {
            console.error('[ERROR: notebookRoutes.js, PATCH /:id] No fields to update');// Log an error message in the console for debugging purposes
            return res.status(400).json({ message: 'No changes were sent' });// Return a 400 (Bad Request) status code with a message
        }

        // Only a notebook the user owns can be edited
        const notebook = await Notebook.findOneAndUpdate(
            { _id: id, user: userId },
            { $set: updates },
            { returnDocument: 'after', runValidators: true }
        );

        // Conditional rendering to check the notebook was found
        if (!notebook) {
            console.error(`[ERROR: notebookRoutes.js, PATCH /:id] Notebook not found: ${id}`);// Log an error message in the console for debugging purposes
            return res.status(404).json({ message: 'Notebook not found' });// Return a 404 (Not Found) status code with a message
        }

        console.log(`[SUCCESS: notebookRoutes.js, PATCH /:id] Notebook updated: ${id}`);//Log a message in the console for debugging purposes
        return res.status(200).json({ message: 'Notebook updated successfully', notebook });// Send a 200 (OK) status code with the updated notebook
    } catch (error) {
        const saveError = notebookSaveError(error);
        if (saveError) {
            console.error('[ERROR: notebookRoutes.js, PATCH /:id]', saveError.message);// Log an error message in the console for debugging purposes
            return res.status(saveError.status).json({ message: saveError.message });// Return a 400 (Bad Request) or 409 (Conflict) status code with a message
        }
        console.error('[ERROR: notebookRoutes.js, PATCH /:id]', error.message);// Log an error message in the console for debugging purposes
        return res.status(500).json({ message: 'Internal Server Error' });// Return a 500 (Internal Server Error) status code with a message
    }
})

/*──────────────────────────── DELETE ROUTES ───────────────────────────────────
    DELETE: Used to remove an item from the database
 ────────────────────────────────────────────────────────────────────────────────*/
/* DELETE: /notebooks/:id : Deletes one of the signed-in user's notebooks. The
notebookSchema findOneAndDelete hook moves its notes to "No notebook". */
router.delete('/:id', checkJwtToken, async (req, res) => {
    try {
        const userId = req.user.id;// Get the authenticated user's ID from the JWT token
        const { id } = req.params;// Get the notebook ID from the URL

        // Conditional rendering to check the id is a valid ObjectId (avoids a CastError 500)
        if (!mongoose.Types.ObjectId.isValid(id)) {
            console.error(`[ERROR: notebookRoutes.js, DELETE /:id] Invalid notebook id: ${id}`);// Log an error message in the console for debugging purposes
            return res.status(400).json({ message: 'Invalid notebook id' });// Return a 400 (Bad Request) status code with a message
        }

        const notebook = await Notebook.findOneAndDelete({ _id: id, user: userId });// Runs the hook that unsets the notebook on its notes

        // Conditional rendering to check the notebook was found
        if (!notebook) {
            console.error(`[ERROR: notebookRoutes.js, DELETE /:id] Notebook not found: ${id}`);// Log an error message in the console for debugging purposes
            return res.status(404).json({ message: 'Notebook not found' });// Return a 404 (Not Found) status code with a message
        }

        console.log(`[SUCCESS: notebookRoutes.js, DELETE /:id] Notebook deleted: ${id}`);//Log a message in the console for debugging purposes
        return res.status(200).json({ message: 'Notebook deleted', notebook: { _id: notebook._id, name: notebook.name } });// Send a 200 (OK) status code with a message
    } catch (error) {
        console.error('[ERROR: notebookRoutes.js, DELETE /:id]', error.message);// Log an error message in the console for debugging purposes
        return res.status(500).json({ message: 'Internal Server Error' });// Return a 500 (Internal Server Error) status code with a message
    }
})

//========EXPORT THE ROUTER============
module.exports = router;// Export the router to be used in other parts of the application
