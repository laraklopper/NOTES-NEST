// securityMiddleware.js
/* Load environment variables from a .env 
file using the dotenv package*/
require('dotenv').config();
// Import Required modules and packages
const jwt = require('jsonwebtoken');// Import the JSON Web Token (JWT) library
const User = require('../models/userSchema');// Import the User model (filename is case-sensitive on Linux)


const secretKey = process.env.JWT_SECRET_KEY || 'secretKey';

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

module.exports = {
    checkJwtToken
}