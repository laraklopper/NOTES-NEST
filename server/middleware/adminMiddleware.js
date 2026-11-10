// adminMiddleware.js
const User = require('../models/userSchema')// Import the User model (filename is case-sensitive on Linux)
const { ADMIN_MIN_AGE } = require('../util/schemaUtil');// Minimum age for admin users
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
        const user = await User.findById(userId).select('username admin').exec();

        /* Conditional rendering to check the user on the token still exists */
        if (!user) {
            console.warn('[WARN: middleware.js, checkAdmin] No user found for id', userId);// Log a warning message in the console for debugging purposes
            return res.status(401).json({// Respond with a 401 (Unauthorised) status code and an error message
                success: false,//Success status
                message: 'Invalid token. Please login again.'//JSON message
            });
        }

        /* Conditional rendering to check the account holds admin rights. */
        if (user.admin !== true) {
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
        const { dateOfBirth, admin } = req.body || {};// Extract the date of birth and admin flag from the request body
        console.log('[DEBUG: formMiddleware.js checkAge] Received date of birth:', dateOfBirth);// Log message in the console for debugging purposes

        // `admin` matches the userSchema field; when true the admin age limit applies
        const isAdminSignup = admin === true;

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
        const MIN_AGE = isAdminSignup ? ADMIN_MIN_AGE : 13; // Admins must be 21+, regular users must be 13+
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

module.exports = {
    checkAdmin,
    checkConsent,
    checkAge
}