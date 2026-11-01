// middleware.js
/* Load environment variables from a .env 
file using the dotenv package*/
require('dotenv').config();
// Import Required modules and packages
const jwt = require('jsonwebtoken');// Import the JSON Web Token (JWT) library
const bcrypt = require('bcrypt');// Import the bcrypt library

const secretKey = process.env.JWT_SECRET_KEY || 'secretKey';

// Industry standard, balances security and performance
const SALT_ROUNDS = 10; // Number of hashing rounds


/*=============================
JWT VERIFICATION MIDDLEWARE
 ====================================*/
 //Middleware function to check and verify a JWT token from the HTTP-only 'token' cookie
 const checkJwtToken = (req, res, next) => {
    console.log('[DEBUG: middleware.js] [checkJwtToken] Middleware triggered');// Log a message in the console for debugging purposes
    try {
        /* /auth/login and /auth/register set the token as an HTTP-only cookie,
        which cookie-parser (app.js) exposes on req.cookies */
        const token = req.cookies?.token;

        //Conditional rendering to check if the token is present
        if (!token) {
            console.warn('[WARN: middleware.js, checkJwtToken] Auth cookie missing');// Log a warning message in the console for debugging purposes
            return res.status(401).json({// Respond with a 401 (Unauthorised) status code and an error message
                success: false,//Success status
                message: 'Access denied. No token provided.'//JSON message
            });
        }

        const decoded = jwt.verify(token, secretKey)// Verify and decode the JWT using the secret key
        req.user = decoded;// Attach decoded user information to the request object
        // This allows routes to access req.user.userId, req.user.isAdmin, etc.

        console.log('[SUCCESS: middleware.js, checkJwtToken ]: Token provided');//Log a message in the console for debugging purposes
        next()// Call the next middleware or route handler


    } catch (error) {
        console.error('[ERROR: middleware.js] No token attatched to the request', error.message);//Log an error message in the console for debugging purposes

        // Provide specific error messages based on JWT error type
        if (error.name === 'TokenExpiredError') {
            console.error('[ERROR: middleware.js, checkJwtToken]: Token expired');
            return res.status(401).json({ // Respond with a 401 (Unauthorized) status code with an error message
                success: false, //Success status
                message: 'Token has expired. Please login again.'//JSON message
            });
        } else if (error.name === 'JsonWebTokenError') {
            console.error('[ERROR: middleware.js, checkJwtToken]: Invalid token');// Log an error message in the console for debugging purposes
            return res.status(401).json({ // Respond with a 401 (Unauthorized) status code with an error message
                success: false, //Success Status
                message: 'Invalid token. Please login again.'//JSON message
            });
        }
        return res.status(401).json({// Respond with a 401 (Unauthorized) status code with an error message
            success: false, //Success status
            message: 'Invalid or expired token.'//JSON message
        });
    }
}
 /*===============================
PASSWORD VALIDATION MIDDLEWARE
=========================*/
/*Middleware to hash password before registration or password changes
 * Expects req.body.password to be present Not used during development*/
const hashPassword = async (req, res, next) => {
    try {
        const {password, newPassword} = req.body || {};// Extract the password and newPassword from the request body
        //Conditional rendering for password hashing
        // Hash password for registration/login
        if (password && !newPassword) {
             const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS)// Generate a secure hash of the password using bcrypt
            req.body.password = hashedPassword; // Replace the plain-text password with the hashed password
            console.log('[INFO: formMiddleware.js, hashPassword] Password hashed for registration/login'); // Log a message in the console for debugging purposes
        }
        // Conditional rendering to check if this is a password update request
        // Hash new password for password changes
        if (newPassword) {
            const hashedNewPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);// Generate a secure hash of the new password
            req.body.newPassword = hashedNewPassword;// Replace the plain-text new password with its hash
            console.log('[INFO: formMiddleware.js, hashPassword] New password hashed for update');// Log a message in the console for debugging purposes
        }

        next();// Call the next middleware or route handler
    } catch (error) {
        console.error('[ERROR: formMiddleware.js, hashPassword] Error hashing password:', error.message);// Log an error message in the console for debugging purposes
        return res.status(500).json({ // Return a 500 (Internal Server Error) status code with a message
            message: 'Error processing password' //Message
        });
    }
}

/*Middleware to ensure that the password has a minimum of
eight characters and at least one special character*/
const checkPassword = (req, res, next) => {
    console.log('[DEBUG: formMiddleware.js checkPassword] Middleware triggered');// Log message in the console for debugging purposes

    // Support both registration (password) and password change (newPassword)
    const pwd = req.body?.password ?? req.body?.newPassword;

    //Conditional rendering to check if password input is provided
    if (typeof pwd !== 'string') {
        console.error('[ERROR: formMiddleware.js, checkPassword]: Password is required');// Log a error message in the console for debugging purposes
        return res.status(400).json({//Return a 400 (Bad Request) status code with a error message
             message: 'Password is required.' //Error Message
            });
    }
    // Regular expression used to validate password strength
    const passwordRegex = /^(?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z\d!@#$%^&*(),.?":{}|<>]{8,}$/;

    //Conditional rendering to test the password against the regular expression
    if (!passwordRegex.test(pwd)) {
        console.error('[ERROR: formMiddleware.js, checkPassword] Weak password');//Log an error message in the console for debugging purposes
        return res.status(400).json(// Respond with a 400 (Bad Request) status and an error message
            { message: 'Password must be at least 8 characters long and contain one special character.' }//Error message
        );
    }
    return next();// Call the next middleware or route handler
}