// securityMiddleware.js
/* Load environment variables from a .env 
file using the dotenv package*/
require('dotenv').config();
// Import Required modules and packages
const jwt = require('jsonwebtoken');// Import the JSON Web Token (JWT) library
const { isDevelopment } = require('./passwordMiddleware');// Development flag, used for the cookie's secure setting

// Settings shared by setting and clearing the JWT cookie (clearCookie needs the same ones to match)
const cookieOptions = {
    httpOnly: true,// Not readable from client-side JavaScript
    secure: !isDevelopment,// HTTPS only outside development
    sameSite: 'strict',// Not sent on cross-site requests
    path: '/'
};

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
/* Sign a JWT for the given user document and send it as the HTTP-only 'token' cookie.
The payload is { id, isAdmin }, which checkJwtToken and the routes read as req.user.id */
const setTokenCookie = (res, user) => {
    const jwtToken = jwt.sign(
        {
            id: user._id,// Set the user id in the token payload
            isAdmin: user.admin === true// Store the user's admin status in the token payload
        },
        secretKey,// Use the secret key to sign the token
        {
            expiresIn: expirationTime,// Set the token expiration time
            algorithm: jwtAlgorithm// Set the JWT algorithm
        }
    );
    const { exp } = jwt.decode(jwtToken);// Expiry (in seconds) that jwt.sign set from expirationTime
    res.cookie('token', jwtToken, {
        ...cookieOptions,
        expires: new Date(exp * 1000)// Cookie expires with the token
    });
}
module.exports = {
    checkJwtToken,
    setTokenCookie,
    cookieOptions,// Exported so /logout can clear the cookie with matching settings
}