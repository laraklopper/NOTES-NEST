require('dotenv').config()
const express = require('express');
const User = require('../models/userSchema')
// const bcrypt = require('bcrypt');
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
        const user = await User.findOne({ username: username.trim() })
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

        // /* PLAINTEXT COMPARISON EQUIVALENT: used during development/
          if (password !== user.password) {
            console.error('[ERROR: authRoutes.js, /login] Incorrect password');
            return res.status(401).json({ message: 'Invalid credentials' });
          }
        //  the actual comparison uses bcrypt.compare() against the stored hash instead. 
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

module.exports = router;