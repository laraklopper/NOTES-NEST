// userRoutes.js
/* Load environment variables from a .env 
file using the dotenv package*/
require('dotenv').config()
const express = require('express');// Import the Express.js library
const router = express.Router();// Create a new router object using Express.js
const { checkJwtToken} = require('./middleware');// Import the JWT verification and admin check middleware functions
/*──────────────────────────── GET ROUTES ─────────────────────────────────────
   GET: READ — Used to fetch information from the database
────────────────────────────────────────────────────────────────────────────────*/
/* GET: /users/me : Returns the signed-in user's own profile, used by App.js to populate
`currentUser` and by the Settings page profile panel. */
router.get('/me', checkJwtToken, async (req, res) => {
    try {
        const userId = req.user.id;// Use middleware to attach user info to the request
        // Get the authenticated user's ID from the JWT token.
        const user = await User.findById(userId)//Find a single document by its _id field.
            .select('-password')// Exclude password from the response
            .exec();// Execute the query
        //Conditional rendering to check if user is found
        if (!user) {
            console.error('[ERROR: userRoutes.js]: User not found with ID:', userId);//Log an error message in the console for debugging purposes
            return res.status(404).json({ error: 'User not found' }); // Send a 404 (Not Found) response with a JSON message
        }
        console.log(`[RESPONSE: userRoutes]`, user);//Log a message in the console for debugging purposes
        return res.status(200).json(user); // Return the full user object (minus password) to the client
    } catch (error) {
         console.error('Error fetching current user:', error);//Log an error message in the console for debugging purposes
        res.status(500).json({// Send a 500 (Internal Server Error) status code with an json error message
            success: false,//Success status
             error: 'An error occurred while fetching the current user' //JSON error message
            });
    }
})

/* GET : /users/fetchUsers :Returns all user documents in the database, for 
the admin-only Users pagetable (UsersList.js). */
router.get('/fetchUsers', checkJwtToken, checkAdmin, async (req, res) => {
    try {
        const users = await User.find()// Fetch every user document in the collection
        .select('-password')// Strip the password field from all returned documents
        .sort({ createdAt: -1 })// Newest accounts first, as the other list routes order their rows
        .exec(); // Execute the query

        console.log(`[SUCCESS: userRoutes.js, GET /fetchUsers] Returned ${users.length} users`);//Log a message in the console for debugging purposes
        return res.status(200).json(users);
    } catch (error) {
        console.error('[ERROR: userRoutes.js, GET /] Error fetching users:', error.message);// Log an error message in the console for debugging purposes
        return res.status(500).json({ message: 'Internal Server Error', error: error.message });// Return a 500 (Internal Server Error) status code with a message
    }
})

/* GET : /users/fetchUser/:id Returns one user document, for the details panel 
on the Users page.*/
router.get('/fetchUser/:id', checkJwtToken, async (req, res) => {
    try {
        const { id } = req.params;// Extract the user ID from the request parameters

        // Conditional rendering to check the id is a usable ObjectId
        if (!mongoose.Types.ObjectId.isValid(id)) {
            console.error(`[ERROR: userRoutes.js, GET /fetchUser/:id] Invalid user id: ${id}`);//Log an error message in the console for debugging purposes
            return res.status(400).json({ message: 'Invalid user id' });// Return a 400 (Bad Request) status code with a message
        }

        const user = await User.findById(id)//Find a single document by its _id field
            .select('-password')// Exclude password from the response
            .exec();// Execute the query

        // Conditional rendering to check the user was found
        if (!user) {
            console.error(`[ERROR: userRoutes.js, GET /fetchUser/:id] User not found: ${id}`);//Log an error message in the console for debugging purposes
            return res.status(404).json({ message: 'User not found' });// Return a 404 (Not Found) status code with a message
        }

        // Conditional rendering to check the account is not an admin account
        if (user.role === 'admin') {
            console.warn(`[WARN: userRoutes.js, GET /fetchUser/:id] Refused to return admin account: ${id}`);//Log a warning message in the console for debugging purposes
            return res.status(403).json({ message: 'Admin accounts cannot be viewed.' });// Return a 403 (Forbidden) status code with a message
        }

        console.log(`[SUCCESS: userRoutes.js, GET /fetchUser/:id] Returned user: ${id}`);//Log a message in the console for debugging purposes
        return res.status(200).json(user);// Send a 200 (OK) status code with the user document
    } catch (error) {
        console.error('[ERROR: userRoutes.js, GET /fetchUser/:id]', error.message);// Log an error message in the console for debugging purposes
        return res.status(500).json({ message: 'Internal Server Error' });// Return a 500 (Internal Server Error) status code with a message
    }
})