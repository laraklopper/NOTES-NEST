// userRoutes.js
/* Load environment variables from a .env 
file using the dotenv package*/
require('dotenv').config()
const express = require('express');// Import the Express.js library
const mongoose = require('mongoose');// Used to validate ObjectIds
const bcrypt = require('bcryptjs');// Used to check the current password against the stored hash
const User = require('../models/userSchema');// Import the User model
const router = express.Router();// Create a new router object using Express.js
const {
    checkJwtToken,
    checkAdmin,
    checkPassword,
    hashPassword,
    isDevelopment
} = require('./middleware');// Import the JWT, admin, password middleware functions and development flag
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
router.get('/fetchUser/:id', checkJwtToken, checkAdmin, async (req, res) => {
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
        if (user.admin === true) {
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

/*──────────────────────────── PATCH ROUTES ─────────────────────────────────────
   PATCH: UPDATE — Used to change part of an existing document
────────────────────────────────────────────────────────────────────────────────*/
/* Request body fields the edit profile form may change, mapped to their path in the
userSchema. dateOfBirth, password, adminDataConsent and admin are left out on purpose,
so a client cannot change them by adding them to the request body */
const EDITABLE_PROFILE_FIELDS = {
    username: 'username',
    firstName: 'fullName.firstName',
    lastName: 'fullName.lastName',
    email: 'contactDetails.email',
    contactNumber: 'contactDetails.contactNumber',
    defaultSourceLang: 'defaultLanguages.defaultSourceLanguage',
    defaultTargetLang: 'defaultLanguages.defaultTargetLanguage',
    defaultNoteLang: 'defaultLanguages.defaultNoteLanguage'
};

/* PATCH: /user/editProfile : Updates the signed-in user's profile details and default
languages from the EditProfile form on the Home page. Only the fields sent are changed. */
router.patch('/editProfile', checkJwtToken, async (req, res) => {
    try {
        const userId = req.user.id;// Get the authenticated user's ID from the JWT token
        const {
            username,
            fullName = {},
            contactDetails = {},
            defaultSourceLang,
            defaultTargetLang,
            defaultNoteLang
        } = req.body || {};// Extract the profile fields from the request body

        // Flatten the request body so each value can be matched to its schema path
        const submitted = {
            username,
            firstName: fullName.firstName,
            lastName: fullName.lastName,
            email: contactDetails.email,
            contactNumber: contactDetails.contactNumber,
            defaultSourceLang,
            defaultTargetLang,
            defaultNoteLang
        };

        /* Keep only non-empty strings, so non-string values (e.g. { "$gt": "" }) are
        dropped and a field left blank on the form keeps its current value */
        const updates = Object.entries(submitted)
            .filter(([, value]) => typeof value === 'string' && value.trim())
            .map(([field, value]) => [EDITABLE_PROFILE_FIELDS[field], value.trim()]);

        // Conditional rendering to check there is something to update
        if (updates.length === 0) {
            console.error('[ERROR: userRoutes.js, PATCH /editProfile] No fields to update');// Log an error message in the console for debugging purposes
            return res.status(400).json({ message: 'Please change at least one field before updating your profile' });// Return a 400 (Bad Request) status code with a message
        }

        const user = await User.findById(userId).exec();// Find the signed-in user's document

        // Conditional rendering to check the user was found
        if (!user) {
            console.error('[ERROR: userRoutes.js, PATCH /editProfile] User not found:', userId);// Log an error message in the console for debugging purposes
            return res.status(404).json({ message: 'User not found' });// Return a 404 (Not Found) status code with a message
        }

        // Conditional rendering to check the new source and target languages are not the same
        const sourceLang = defaultSourceLang || user.defaultLanguages?.defaultSourceLanguage;
        const targetLang = defaultTargetLang || user.defaultLanguages?.defaultTargetLanguage;
        if ((defaultSourceLang || defaultTargetLang) && sourceLang === targetLang) {
            console.error('[ERROR: userRoutes.js, PATCH /editProfile] Source and target languages match');// Log an error message in the console for debugging purposes
            return res.status(400).json({ message: 'Default source and target languages must be different' });// Return a 400 (Bad Request) status code with a message
        }

        /* Set the changes on the loaded document and save it, rather than using
        findByIdAndUpdate, so the schema validators and the pre-validate
        normalization hook (lowercase username/email, +27 phone) both run */
        updates.forEach(([path, value]) => user.set(path, value));
        await user.save({ validateModifiedOnly: true });// Only validate the changed fields, so an older account missing a newer required field can still be edited

        const updatedUser = user.toJSON();// Plain object of the saved user
        delete updatedUser.password;// The password is not loaded (select: false), but never send it back

        console.log(`[SUCCESS: userRoutes.js, PATCH /editProfile] Updated profile for user: ${userId}`);//Log a message in the console for debugging purposes
        return res.status(200).json({// Send a 200 (OK) status code with the updated user
            message: 'Profile updated successfully',
            user: updatedUser
        });
    } catch (error) {
        // Mongoose schema validation failed: send the first validation message back to the client
        if (error.name === 'ValidationError') {
            const firstMessage = Object.values(error.errors)[0]?.message;
            console.error('[ERROR: userRoutes.js, PATCH /editProfile] Validation failed:', error.message);// Log an error message in the console for debugging purposes
            return res.status(400).json({ message: firstMessage || 'Invalid profile details' });// Return a 400 (Bad Request) status code with a message
        }
        // Duplicate key on a unique field (username or contact number)
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern || {})[0] || '';
            const message = field.includes('contactNumber')
                ? 'That contact number is already registered'
                : 'That username is already taken';
            console.error('[ERROR: userRoutes.js, PATCH /editProfile] Duplicate field:', field);// Log an error message in the console for debugging purposes
            return res.status(409).json({ message });// Return a 409 (Conflict) status code with a message
        }
        console.error('[ERROR: userRoutes.js, PATCH /editProfile]', error.message);// Log an error message in the console for debugging purposes
        return res.status(500).json({ message: 'Internal Server Error' });// Return a 500 (Internal Server Error) status code with a message
    }
})

/* Middleware to check the request carries both passwords as strings and that the new
password is not the same as the current one. Runs before hashPassword, while
newPassword is still plaintext and can be compared */
const checkPasswordChange = (req, res, next) => {
    const { currentPassword, newPassword } = req.body || {};// Extract both passwords from the request body

    // Conditional rendering to check both passwords are present (and are strings, so they cannot inject query operators)
    if (typeof currentPassword !== 'string' || !currentPassword || typeof newPassword !== 'string' || !newPassword) {
        console.error('[ERROR: userRoutes.js, checkPasswordChange] Both passwords are required');// Log an error message in the console for debugging purposes
        return res.status(400).json({ message: 'Both current and new passwords are required.' });// Return a 400 (Bad Request) status code with a message
    }
    // Conditional rendering to check the new password is different from the current password
    if (currentPassword === newPassword) {
        console.error('[ERROR: userRoutes.js, checkPasswordChange] New password matches current password');// Log an error message in the console for debugging purposes
        return res.status(400).json({ message: 'New password must be different from the current password.' });// Return a 400 (Bad Request) status code with a message
    }
    return next();// Call the next middleware or route handler
};

/* PATCH: /user/editPassword : Changes the signed-in user's password from the EditPassword
form on the Home page. checkPassword enforces the strength rules on newPassword, then
hashPassword hashes it (left as plaintext during development). */
router.patch('/editPassword', checkJwtToken, checkPasswordChange, checkPassword, hashPassword, async (req, res) => {
    try {
        const userId = req.user.id;// Get the authenticated user's ID from the JWT token
        const { currentPassword, newPassword } = req.body;// newPassword has already been hashed by hashPassword

        const user = await User.findById(userId)
            .select('+password')// Include the password so the current one can be checked
            .exec();// Execute the query

        // Conditional rendering to check the user was found
        if (!user) {
            console.error('[ERROR: userRoutes.js, PATCH /editPassword] User not found:', userId);// Log an error message in the console for debugging purposes
            return res.status(404).json({ message: 'User not found' });// Return a 404 (Not Found) status code with a message
        }

        /* Compare the current password the same way /auth/login does: during development
        a stored value that is not a bcrypt hash is compared directly */
        const isHashed = /^\$2[aby]\$/.test(user.password);
        const isCurrentValid = isDevelopment && !isHashed
            ? currentPassword === user.password
            : await bcrypt.compare(currentPassword, user.password);

        /* Conditional rendering to check the current password is correct.
        A 400 rather than a 401, so the client does not treat it as an expired session */
        if (!isCurrentValid) {
            console.error('[ERROR: userRoutes.js, PATCH /editPassword] Current password is incorrect');// Log an error message in the console for debugging purposes
            return res.status(400).json({ message: 'Current password is incorrect' });// Return a 400 (Bad Request) status code with a message
        }

        user.password = newPassword;// Replace the stored password with the new (hashed) one
        await user.save({ validateModifiedOnly: true });// Validate the new password and save the user

        console.log(`[SUCCESS: userRoutes.js, PATCH /editPassword] Password changed for user: ${userId}`);//Log a message in the console for debugging purposes
        return res.status(200).json({ message: 'Password changed successfully' });// Send a 200 (OK) status code with a message
    } catch (error) {
        // Mongoose schema validation failed: send the first validation message back to the client
        if (error.name === 'ValidationError') {
            const firstMessage = Object.values(error.errors)[0]?.message;
            console.error('[ERROR: userRoutes.js, PATCH /editPassword] Validation failed:', error.message);// Log an error message in the console for debugging purposes
            return res.status(400).json({ message: firstMessage || 'Invalid password' });// Return a 400 (Bad Request) status code with a message
        }
        console.error('[ERROR: userRoutes.js, PATCH /editPassword]', error.message);// Log an error message in the console for debugging purposes
        return res.status(500).json({ message: 'Internal Server Error' });// Return a 500 (Internal Server Error) status code with a message
    }
})

module.exports = router;