//authRoutes.js
/*auth endpoints : mounted at /users by app.js
POST: /login - submit user login
POST: /register - submit registration to add a new user
PATCH: /setAdmin - upgrade user to admin (21+ and user for 1 day during development)
PATCH: /clearAdmin - remove admin status from the user
All passwords are saved in Plaintext for development,
auth/login auth/register routes do not require a <Bearer> header for user authorization/
*/
require('dotenv').config()
const express = require('express');
const User = require('../models/userSchema');
const bcrypt = require('bcryptjs');
const {checkJwtToken, setTokenCookie, cookieOptions} = require('../middleware/securityMiddleware')
const {isDevelopment, hashPassword, checkPassword} = require('../middleware/passwordMiddleware')
const { loginLimiter, registerLimiter } = require('../middleware/rateLimitMiddleware');
const router = express.Router()
const { calculateAge } = require('../util/userUtil')


// schemaUtil holds the admin rules: 21+, and an account age of 3 months in production (1 day otherwise)
const { ADMIN_MIN_AGE, ADMIN_MIN_ACCOUNT_AGE_MS } = require('../util/schemaUtil');


//=============ROUTES================
// Use Plaintext passwords for development
/*──────────────────────────── HELPERS ──────────────────────────────*/


// The user details sent back by /login, /setAdmin and /clearAdmin (the token stays in the cookie)
const sessionUser = (user) => ({
    userId: user._id,// User's unique ID
    fullName: user.fullName,// User's full name
    isAdmin: user.admin === true// Indicates whether the user is an administrator
})

/* A fixed bcrypt hash that /login compares against when the username does not exist.
Running bcrypt.compare() either way makes both failures take about the same time,
so response timing cannot reveal which usernames are real. Uses the same cost (10)
as SALT_ROUNDS in passwordMiddleware so the timing matches real hashes */
const DUMMY_HASH = bcrypt.hashSync('dummy-password-for-timing', 10);
/*──────────────────────────── POST ROUTES ──────────────────────────────
    POST: Used to create a new resource/submit data to the database
 ─────────────────────────────────────────────────────────────────────────*/
// Send a POST request to the /auth/login route
router.post('/login', loginLimiter, async (req, res) => {
    try {
        const { username, password } = req.body || {};//Extract the usersername and password from the request body

        // Conditional rendering to check that both email and password are present
        if (!username || !password) {
            console.error('[ERROR: authRoutes.js, /login] username and password are required');// Log an error message in the console for debugging purposes
            return res.status(400).json({ message: 'username and password are required' });// Send a 400 (Bad Request) status code with a  JSON message
        }

        // Reject non-string values (e.g. { "$gt": "" }) so req.body cannot be used to inject Mongo query operators
        if (typeof username !== 'string' || typeof password !== 'string') {
            console.error('[ERROR: authRoutes.js, /login] username and password must be strings');
            return res.status(400).json({ message: 'username and password are required' });// Send a 400 (Bad Request) status code with a  JSON message
        }

        //Find the user by username and include the password field
        // Usernames are stored lowercase (see the userSchema pre-validate hook)
        const user = await User.findOne({ username: username.trim().toLowerCase() })
            .select('+password')//Include the password
            .exec();//Execute the query

        /*/ Conditional rendering to check if user exists
        Use the same status/message as an incorrect password so usernames cannot be enumerated*/
        if (!user) {
            await bcrypt.compare(password, DUMMY_HASH);// Spend the same time as a real password check, so timing cannot reveal the username is unknown
            console.error('[ERROR: authRoutes.js, /login] User not found');// Log an error message in the console for debugging purposes
            return res.status(401).json({// Send a 401 (Unauthorized) status code with a JSON message
                 message: 'Invalid credentials' //JSON message
                });
        }

        /* Compare the submitted password against the stored bcrypt hash.
        During development hashPassword leaves passwords as plaintext, so a stored
        value that is not a bcrypt hash is compared directly; accounts hashed
        before that still log in through bcrypt */
        const isHashed = /^\$2[aby]\$/.test(user.password);
        const isPasswordValid = isDevelopment && !isHashed
            ? password === user.password
            : await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            console.error('[ERROR: authRoutes.js, /login] Incorrect password'); // Log the error
            return res.status(401).json({// Return a 401 Unauthorized response
                message: 'Invalid credentials' //JSON message
            });
        }

        // Log a successful login to the server console for debugging and auditing purposes
        console.log('[INFO: authRoutes.js, /login] User logged in:',
            {
                userId: user._id,         // Unique MongoDB ObjectId of the authenticated user
                username: user.username   // Username of the authenticated user
            }
        );

        // Send the token as an HTTP-only cookie so client-side scripts can never read it
        setTokenCookie(res, user);

       // Return the user information to the client (the token stays in the cookie)
        return res.status(200).json(sessionUser(user));// Send a 200 OK status code with the user details


    } catch (error) {
        console.error('[ERROR: authRoutes.js, /login] Login Failed:', error.message);// Log an error message in the console for debugging purposes
        res.status(500).json({ success: false, message: 'Internal Server Error' });// Send a 500 Internal Server Error status code with a message
    }
});

// Send a POST request to the /auth/register route
router.post('/register', registerLimiter, checkPassword, hashPassword, async (req, res) => {
    try {
        const {
            username,
            fullName: rawFullName,
            contactDetails: rawContactDetails,
            dateOfBirth,
            defaultSourceLang,
            defaultTargetLang,
            defaultNoteLang,
            password,
            adminDataConsent
        } = req.body || {};// Extract the registration fields from the request body

        /* Destructuring defaults only cover undefined, so "fullName": null would crash on
        fullName.firstName and return a 500. Treat null or any non-object as empty instead,
        so the required fields check below returns a 400 */
        const fullName = rawFullName && typeof rawFullName === 'object' ? rawFullName : {};
        const contactDetails = rawContactDetails && typeof rawContactDetails === 'object' ? rawContactDetails : {};

        // Reject non-string values (e.g. { "$gt": "" }) so req.body cannot be used to inject Mongo query operators
        const requiredStrings = [
            username,
            fullName.firstName,
            fullName.lastName,
            contactDetails.email,
            contactDetails.contactNumber,
            dateOfBirth,
            password
        ];
        if (requiredStrings.some((value) => typeof value !== 'string' || !value.trim())) {
            console.error('[ERROR: authRoutes.js, /register] Missing or invalid required fields');// Log an error message in the console for debugging purposes
            return res.status(400).json({ message: 'Please fill in all required fields' });// Send a 400 (Bad Request) status code with a JSON message
        }

        // The form blocks an unticked box, but a request sent outside the form never sees that check
        if (adminDataConsent !== true) {
            console.error('[ERROR: authRoutes.js, /register] Admin data consent not given');
            return res.status(400).json({ message: 'You must consent to admin users seeing your details to register' });
        }

        // Only include the language preferences that were chosen, so the schema defaults apply to the rest
        const defaultLanguages = {};
        if (typeof defaultSourceLang === 'string' && defaultSourceLang) defaultLanguages.defaultSourceLanguage = defaultSourceLang;
        if (typeof defaultTargetLang === 'string' && defaultTargetLang) defaultLanguages.defaultTargetLanguage = defaultTargetLang;
        if (typeof defaultNoteLang === 'string' && defaultNoteLang) defaultLanguages.defaultNoteLanguage = defaultNoteLang;

        /* Build the user from named fields only, never from req.body directly,
        so a client cannot register itself as an admin by sending { admin: true } */
        const newUser = new User({
            username,
            fullName: {
                firstName: fullName.firstName,
                lastName: fullName.lastName
            },
            contactDetails: {
                email: contactDetails.email,
                contactNumber: contactDetails.contactNumber
            },
            dateOfBirth,
            defaultLanguages,
            password,// Hashed by the hashPassword middleware (plaintext during development)
            adminDataConsent
        });

        await newUser.save();// Validate and save the user

        // Log a successful registration to the server console for debugging and auditing purposes
        console.log('[INFO: authRoutes.js, /register] User registered:',
            {
                userId: newUser._id,
                username: newUser.username
            }
        );

        return res.status(201).json({// Send a 201 (Created) status code with a JSON message
            message: 'Registration successful. Please log in.',
            userId: newUser._id
        });

    } catch (error) {
        // Mongoose schema validation failed: send the first validation message back to the client
        if (error.name === 'ValidationError') {
            const firstMessage = Object.values(error.errors)[0]?.message;
            console.error('[ERROR: authRoutes.js, /register] Validation failed:', error.message);
            return res.status(400).json({ message: firstMessage || 'Invalid registration details' });
        }
        /* Duplicate key on a unique field. Each field has its own message, with a
        general fallback, so a unique field added later is never reported as "username" */
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern || {})[0] || '';
            const duplicateMessages = {
                username: 'That username is already taken',
                'contactDetails.contactNumber': 'That contact number is already registered',
                'contactDetails.email': 'That email is already registered',
            };
            const message = duplicateMessages[field] || 'Those details are already registered to another account';
            console.error('[ERROR: authRoutes.js, /register] Duplicate field:', field);
            return res.status(409).json({ message });// Send a 409 (Conflict) status code with a JSON message
        }
        console.error('[ERROR: authRoutes.js, /register] Registration Failed:', error.message);// Log an error message in the console for debugging purposes
        res.status(500).json({ success: false, message: 'Internal Server Error' });// Send a 500 Internal Server Error status code with a message
    }
});

// Send a POST request to the /auth/logout route
/* No checkJwtToken here: clearing a cookie is harmless, and requiring a valid token
would leave an expired cookie stuck in the browser with a 401 */
router.post('/logout', (req, res) => {
    res.clearCookie('token', cookieOptions);// Remove the JWT cookie (Express 5 ignores maxAge/expires here, so the cookie is deleted)
    console.log('[INFO: authRoutes.js, /logout] User logged out');
    return res.status(200).json({ message: 'Logged out' });// Send a 200 OK status code with a JSON message
});

/*──────────────────────────── PATCH ROUTES ──────────────────────────────
    PATCH: Used to partially update an existing resource
 ─────────────────────────────────────────────────────────────────────────*/
//Route to upgrade the logged in user to admin
//Send a PATCH request to the /auth/setAdmin endpoint
router.patch('/setAdmin', checkJwtToken, async (req, res) => {
    try {
         const user = await User.findById(req.user?.id).exec();// The token payload carries the user id as `id`
          if (!user) {
            console.error('[ERROR: authRoutes.js, /setAdmin] User not found');
            return res.status(404).json({ message: 'User not found' });
        }
        if (user.admin === true) {
            console.error('[ERROR: authRoutes.js, /setAdmin] User is already an admin:', user.username);
            return res.status(409).json({ message: 'User is already an admin' });
        }
         if (calculateAge(user.dateOfBirth) < ADMIN_MIN_AGE) {
            console.error('[ERROR: authRoutes.js, /setAdmin] User is under the admin age requirement:', user.username);
            return res.status(403).json({ message: `You must be at least ${ADMIN_MIN_AGE} years old to register as an admin.` });
        }

        // Users can only register as admin after a specific time as a user
        if (Date.now() - new Date(user.createdAt).getTime() < ADMIN_MIN_ACCOUNT_AGE_MS) {
            console.error('[ERROR: authRoutes.js, /setAdmin] Account is too new:', user.username);
            return res.status(403).json({ message: 'Your account is too new to register as an admin.' });
        }
        user.admin = true;
        await user.save({ validateModifiedOnly: true });// Only validate the changed field, so older accounts can still be upgraded

        // Re-set the cookie with a new token so the admin claim is up to date
        setTokenCookie(res, user);

        console.log('[SUCCESS: authRoutes.js, /setAdmin] User registered as admin:', user.username);
        return res.status(200).json({ message: 'Admin registration successful', user: sessionUser(user) });
    } catch (error) {
        console.error('[ERROR: authRoutes.js, /setAdmin]', error.message);
        return res.status(500).json({ message: 'Internal Server Error' })
    }
})

//Route to remove admin status from the logged in user
//Send a PATCH request to the /auth/clearAdmin endpoint
router.patch('/clearAdmin', checkJwtToken, async (req, res) => {
    try {
        const user = await User.findById(req.user?.id).exec();// The token payload carries the user id as `id`
        if (!user) {
            console.error('[ERROR: authRoutes.js, /clearAdmin] User not found');
            return res.status(404).json({ message: 'User not found' });
        }
        if (user.admin !== true) {
            console.error('[ERROR: authRoutes.js, /clearAdmin] User is not an admin:', user.username);
            return res.status(409).json({ message: 'User is not an admin' });
        }

        user.admin = false;
        await user.save({ validateModifiedOnly: true });// Only validate the changed field

        // Re-set the cookie with a new token so the admin claim is up to date
        setTokenCookie(res, user);

        console.log('[SUCCESS: authRoutes.js, /clearAdmin] Admin status removed:', user.username);
        return res.status(200).json({ message: 'Admin status removed', user: sessionUser(user) });

    } catch (error) {
        console.error('[ERROR: authRoutes.js, /clearAdmin]', error.message);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
})


//======EXPORT THE ROUTER===========
module.exports = router;