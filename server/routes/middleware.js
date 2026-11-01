// middleware.js
/* Load environment variables from a .env 
file using the dotenv package*/
require('dotenv').config();
// Import Required modules and packages
const jwt = require('jsonwebtoken');// Import the JSON Web Token (JWT) library
const bcrypt = require('bcrypt');// Import the bcrypt library
const User = require('../models/UserSchema');// Import the User model

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
/* Middleware to confirm the user consented to admin users seeing their details.
Kept separate from checkRequiredFields because a refusal is not a missing field:
it is an answer, and it needs a message that says so rather than one asking for
the value again. The schema enforces the same rule, so a request sent outside
the registration form cannot save an account without consent either. */
const checkConsent = (req, res, next) => {
    const { adminDataConsent } = req.body || {};// Extract the consent flag from the request body

    /* Only a real `true` passes: a missing flag, or a refusal sent as false,
    both mean the account may not be created */
    if (adminDataConsent !== true) {
        console.error('[ERROR: formMiddleware.js, checkConsent] Admin data consent not given');// Log an error message in the console for debugging purposes
        return res.status(400).json({// Send a 400 (Bad Request) status code with a JSON message
            message: 'You must consent to admin users seeing your details to register.'//Error message
        });
    }
    return next();// Call the next middleware or route handler
};

/*Middleware function to check that user age
All users must be 13 or older; admin users must be 21 or older*/
const checkAge = (req, res, next) => {
    console.log('[DEBUG: formMiddleware.js checkAge] Middleware triggered');// Log message in the console for debugging purposes
    try {
        const { dateOfBirth, admin, role } = req.body || {};// Extract the date of birth, admin flag and role from the request body
        console.log('[DEBUG: formMiddleware.js checkAge] Received date of birth:', dateOfBirth);// Log message in the console for debugging purposes

        /* The registration form sends the account type as `role` ('user' or
        'admin'), matching the schema field; the older `admin` boolean is still
        accepted so any caller using it keeps working. Read from both, or an
        admin signup is only ever held to the 13+ limit. */
        const isAdminSignup = admin === true || role === 'admin';

        // Conditional rendering to check if the date of birth is provided in the request body
        if (!dateOfBirth) {
            console.error(`[ERROR: formMiddleware.js, checkAge] Date of Birth is required`);// Log an error message in the console for debugging purposes
            return res.status(400).json({// Respond with a 400 (Bad Request) status if underage
                error: 'Date of Birth is required'//Error Message
            });
        }

        const dob = new Date(dateOfBirth);// Convert string to JavaScript Date object
        //Conditional rendering to check if date conversion succeeded
        if (Number.isNaN(dob.getTime())) {
            console.error(`[ERROR: formMiddleware.js, checkAge] Invalid Date of Birth format`);// Log a error message in the console for debugging purposes
            return res.status(400).json({ message: 'Invalid Date of Birth format.' });// Respond with a 400 (Bad Request) status if date of Birth is invalid
        }
        const now = new Date();
        if (dob > now) {
            console.error(`[ERROR: formMiddleware.js, checkAge]:Date of Birth cannot be in the future.`); // Log a error message in the console for debugging purposes
            // Respond with a 400 (Bad Request) status if future date
            return res.status(400).json({
                message: 'Date of Birth cannot be in the future.'//Error message
            });
        }
        // Calculate the user's age in years
        const years =
            now.getFullYear() -
            dob.getFullYear() -
            (
                now < new Date(now.getFullYear(), dob.getMonth(), dob.getDate())
                    ? 1 // Birthday has not occurred yet this year
                    : 0 // Birthday has already occurred this year
            );

        // Determine the minimum required age
        const MIN_AGE = isAdminSignup ? 18 : 13; // Admins must be 18+, regular users must be 13+
        const accountType = isAdminSignup ? 'an admin' : 'a user';// Wording used in the message below
        // Block registration if user is below the minimum age
        if (years < MIN_AGE) {
            console.error(// Log a error message in the console for debugging purposes
                `[ERROR: formMiddleware.js, checkAge]: You must be at least ${MIN_AGE} years old to register as ${accountType}.`
            );
            return res.status(400).json({ // Respond with a 400 (Bad Request) status
                message: `You must be at least ${MIN_AGE} years old to register as ${accountType}.` //Error Message
            });
        }

        // If age validation passes, continue
        next();// Call the next middleware or route handler
    } catch (error) {
        console.error('[ERROR: formMiddleware.js checkAge]', error.message);// Log a error message in the console for debugging purposes
        return res.status(500).json({ message: 'Internal Server Error' });// Return 500 (Internal Server Error) response
    }
}

/*====================================
ADMIN VALIDATION MIDDLEWARE
========================*/
/*  Middleware function to confirm the account behind a verified 
token holds admin rights. */
const checkAdmin = async (req, res, next) => {
    console.log('[DEBUG: middleware.js] [checkAdmin] Middleware triggered');// Log message in the console for debugging purposes
    try {
        /* checkJwtToken assigns the decoded token, not a loaded account, so the
        id comes from the payload /auth/login and /auth/register signed, which
        carries it as `id` */
        const userId = req.user?.id;

        // Conditional rendering to check the token carried an id
        if (!userId) {
            console.error('[ERROR: middleware.js, checkAdmin] userId missing from token');// Log an error message in the console for debugging purposes
            return res.status(401).json({// Respond with a 401 (Unauthorised) status code and an error message
                success: false,//Success status
                message: 'Access denied. Please login again.'//JSON message
            });
        }

        /* Only the two fields this check and its logging need are loaded. */
        const user = await User.findById(userId).select('username role').exec();

        /* Conditional rendering to check the user on the token still exists */
        if (!user) {
            console.warn('[WARN: middleware.js, checkAdmin] No user found for id', userId);// Log a warning message in the console for debugging purposes
            return res.status(401).json({// Respond with a 401 (Unauthorised) status code and an error message
                success: false,//Success status
                message: 'Invalid token. Please login again.'//JSON message
            });
        }

        /* Conditional rendering to check the account holds admin rights. */
        if (user.role !== 'admin') {
            console.warn(`[WARN: middleware.js, checkAdmin] ${user.username} is not an admin`);// Log a warning message in the console for debugging purposes
            return res.status(403).json({// Respond with a 403 (Forbidden) status code and an error message
                success: false,//Success status
                message: 'Access denied. This action is for admin users only.'//JSON message
            });
        }

        /* Kept on the request so a handler does not have to load the same
        account a second time, for example to check which admin is acting */
        req.adminUser = user;

        console.log(`[SUCCESS: middleware.js, checkAdmin] ${user.username} confirmed as an admin`);//Log a message in the console for debugging purposes
        return next();// Call the next middleware or route handler
    } catch (error) {
        console.error('[ERROR: middleware.js, checkAdmin]:', error.message);//Log an error message in the console for debugging purposes
        return res.status(500).json({// Respond with a 500 (Internal Server Error) status code
            success: false,//Success status
            message: 'Internal server Error'//JSON message
        });
    }
};

module.exports = {
    checkJwtToken,// Export the JWT verification middleware
    hashPassword,// Export the password hashing middleware
    checkPassword,// Export the password validation middleware
    checkConsent,// Export the consent validation middleware
    checkAdmin,// Export the admin validation middleware
    checkAge// Export the age validation middleware
};