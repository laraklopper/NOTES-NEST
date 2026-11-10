//passwordMiddleware.js
/* Load environment variables from a .env 
file using the dotenv package*/
require('dotenv').config();
const bcrypt = require('bcryptjs');// Import the bcrypt library
/* Passwords are stored as plaintext during development and hashed everywhere else.
Matches ensureJwtSecret.js: an unset NODE_ENV counts as development */

// Industry standard, balances security and performance
const SALT_ROUNDS = 10; // Number of hashing rounds
const isDevelopment = (process.env.NODE_ENV || 'development').toLowerCase() === 'development';


 /*===============================
PASSWORD VALIDATION MIDDLEWARE
=========================*/
/*Middleware to hash password before registration or password changes
 * Expects req.body.password to be present. Skipped during development,
 * so passwords are saved as plaintext*/
const hashPassword = async (req, res, next) => {
    // Conditional rendering to leave the password as plaintext during development
    if (isDevelopment) {
        console.warn('[WARN: middleware.js, hashPassword] Development mode: password not hashed');// Log a warning message in the console for debugging purposes
        return next();// Call the next middleware or route handler
    }
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

module.exports = {
    hashPassword,// Export the password hashing middleware
    checkPassword,// Export the password validation middleware
    checkPasswordChange,
    isDevelopment,// Export the development flag so login compares passwords the same way
}