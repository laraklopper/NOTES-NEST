require('dotenv').config()
const express = require('express');
const User = require('../models/UserSchema');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router()

// Extract environmental variables (with safe fallbacks for local dev)
const rawSecretKey = process.env.JWT_SECRET_KEY;// JWT secret key
const rawExpiration = process.env.JWT_EXPIRATION;// JWT expiration time
const rawAlgorithm = process.env.JWT_ALGORITHM;// JWT algorithm
const secretKey = rawSecretKey || 'secretKey';// Fallback secret key
const expirationTime = rawExpiration || '12h';// Fallback expiration time
const jwtAlgorithm = rawAlgorithm || 'HS256';// Fallback JWT algorithm

//=====CHECK IF ALL THE ENVIRONMENTAL VARIABLES A PRESENT=========
// Conditional rendering to check if the environmental variables are missing
if (!rawSecretKey) {
    console.warn("[WARNING: userRoute.js]: JWT_SECRET_KEY not set. Using fallback key.");// Log a warning message in the console for debugging purposes
}
// Conditional rendering to check if the environmental variables are missing
else if (!rawExpiration) {
    console.warn('[WARNING: userRoute.js] Missing exiration time, using fallback time')// Log a warning message in the console for debugging purposes
}
// Conditional rendering to check if the environmental variables are missing
else if (!rawAlgorithm) {
    console.warn('[WARNING: userRoute.js] Missing jwt algorithm, using fallback algorithm.'); // Log a warning message in the console for debugging purposes
}
//=============ROUTES================
/*──────────────────────────── POST ROUTES ──────────────────────────────
    POST: Used to create a new resource/submit data to the database
 ─────────────────────────────────────────────────────────────────────────*/
// Send a POST request to the /auth/login route
router.post('/login', async (req, res) => {
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
            console.error('[ERROR: authRoutes.js, /login] User not found');// Log an error message in the console for debugging purposes
            return res.status(401).json({// Send a 401 (Unauthorized) status code with a JSON message
                 message: 'Invalid credentials' //JSON message
                });
        }

        // Compare the submitted password against the stored bcrypt hash
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            console.error('[ERROR: authRoutes.js, /login] Incorrect password'); // Log the error
            return res.status(401).json({// Return a 401 Unauthorized response
                message: 'Invalid credentials' //JSON message
            });
        }

        const isAdmin = user.admin === true;// Determine whether the logged-in user is an administrator
        
        // Generate a JSON Web Token (JWT) for the authenticated user
        const jwtToken = jwt.sign(
            {
                id: user._id,// Set the user id in the token payload
                isAdmin// Store the user's admin status in the token payload
            },
            secretKey,// Use the secret key to sign the token
            { 
                expiresIn: expirationTime, // Set the token expiration time
                algorithm: jwtAlgorithm // Set the JWT algorithm
            }
        );

        // Log a successful login to the server console for debugging and auditing purposes
        console.log('[INFO: authRoutes.js, /login] User logged in:',
            {
                userId: user._id,         // Unique MongoDB ObjectId of the authenticated user
                username: user.username   // Username of the authenticated user
            }
        );

        
       // Return the JWT token and user information to the client
        return res.status(200).json({// Send a 200 OK status code with the JWT token and user details
            token: jwtToken,         // Authentication token
            userId: user._id,        // User's unique ID
            fullName: user.fullName, // User's full name
            isAdmin,                 // Indicates whether the user is an administrator
        });


    } catch (error) {
        console.error('[ERROR: authRoutes.js, /login] Login Failed:', error.message);// Log an error message in the console for debugging purposes
        res.status(500).json({ success: false, message: 'Internal Server Error' });// Send a 500 Internal Server Error status code with a message
    }
});

// Send a POST request to the /auth/register route
router.post('/register', async (req, res) => {
    try {
        const {
            username,
            fullName = {},
            contactDetails = {},
            dateOfBirth,
            defaultSourceLang,
            defaultTargetLang,
            defaultNoteLang,
            password,
            adminDataConsent
        } = req.body || {};// Extract the registration fields from the request body

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
            password,// Hashed by the userSchema pre-save hook
            adminDataConsent
        });

        await newUser.save();// Validate, hash the password and save the user

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
        // Duplicate key on a unique field (username or contact number)
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern || {})[0] || '';
            const message = field.includes('contactNumber')
                ? 'That contact number is already registered'
                : 'That username is already taken';
            console.error('[ERROR: authRoutes.js, /register] Duplicate field:', field);
            return res.status(409).json({ message });// Send a 409 (Conflict) status code with a JSON message
        }
        console.error('[ERROR: authRoutes.js, /register] Registration Failed:', error.message);// Log an error message in the console for debugging purposes
        res.status(500).json({ success: false, message: 'Internal Server Error' });// Send a 500 Internal Server Error status code with a message
    }
});

module.exports = router;