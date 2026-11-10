// rateLimitMiddleware.js
/*Custom middleware used for rate limiting, used to limit repeated requests*/
const rateLimit = require('express-rate-limit');

/* Rate limit for /login and /register, to slow down brute-force and spam attempts.
Each IP gets 10 requests per 15 minutes; after that the client receives a 429 */
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,// 15 minutes
    limit: 10,// Requests allowed per IP in each window
    standardHeaders: 'draft-8',// Send the RateLimit headers so the client can see the limit
    legacyHeaders: false,// Don't send the older X-RateLimit-* headers
    message: { message: 'Too many attempts — please wait a few minutes and try again.' }
});
/**Middleware General API rate limiterapplied to sensitive endpoints to limit 
  to 100 requests per 15 minutes per IP*/
const generalRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // Define the time window for rate limiting (15 minutes)
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later',// Default message returned when the rate limit is exceeded
    standardHeaders: true,// Include standard RateLimit headers in the response
    legacyHeaders: false,// Disable the legacy X-RateLimit-* headers
    // Custom function that runs when the rate limit is exceeded
    handler: (req, res) => {
        console.warn(`[WARN: rateLimitMiddleware.js, generalRateLimiter] Rate limit exceeded for IP: ${req.ip}`);// Log a warning message in the console for debugging purposes
        res.status(429).json({//Respond with a 429 (To many requests) status code and an error message
            success: false,// Indicate the request was unsuccessful
            message: 'Too many requests, please slow down',// User-friendly error message
            /*Calculate approximately how many minutes remain until
            the client can make requests again*/
            retryAfter: Math.ceil(
                (req.rateLimit.resetTime - Date.now()) / 1000 / 60
            ) + ' minutes'// minutes until reset
        });
    },
});

/* Limits repeated attempts from one IP so the login endpoint cannot be used to
guess passwords. Returns 429 (RFC 6585) once the quota is used up */
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,// 15 minute window
    max: 10,// 10 attempts per window per IP
    standardHeaders: true,//Enable the Ratelimit header.
    legacyHeaders: false,// Disable the legacy X-RateLimit-* headers
    message: { message: 'Too many login attempts, please try again in 15 minutes' },
});
/*Middleware to limit Registration by stopping one client fromcreating accounts in bulk 
 */
const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,// 1 hour window
    max: 20,// 20 registrations per window per IP
    standardHeaders: true,//Enable the Ratelimit header.
    legacyHeaders: false,// Disable the legacy X-RateLimit-* headers
    message: { message: 'Too many registration attempts, please try again later' },
});

/*Rate limiter middleware to limit password updates*/
const passwordUpdateRateLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // Limit each IP to 3 password updates per hour
    message: 'Too many password update attempts, please try again later',//Counts all password update attempts
    standardHeaders: true,//Enable the Ratelimit header.
    legacyHeaders: false,// Disable the legacy X-RateLimit-* headers
    handler: (req, res) => {
        console.warn(`[WARN: rateLimitMiddleware.js, passwordUpdateRateLimiter] Rate limit exceeded for IP: ${req.ip}`);
        res.status(429).json({//Respond with a 429 (To many requests) status code and an error message
            success: false,// Indicate that the request was unsuccessful
            message: 'Too many password update attempts, please try again in an hour',// User-friendly error message
            retryAfter: Math.ceil(// Calculate how many minutes remain before another login attempt is allowed
                (req.rateLimit.resetTime - Date.now()) / 1000 / 60
            ) + ' minutes'// minutes until reset
        });
    },
});
/*Rate Limiter to limit exports */
const exportLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,// 15 minute window
    max: 60,// 60 exports per window per IP
    standardHeaders: true,//Enable the Ratelimit header.
    legacyHeaders: false,// Disable the legacy X-RateLimit-* headers
    message: { 
        success: false, // Indicate that the request was unsuccessful
        message: 'Too many exports, please try again in 15 minutes' 
    },
});

// Rate Limiter middleware for userTranslatoons
const translateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,// 15 minutes
    limit: 100,// Requests per window per client
    standardHeaders: true,//Enable the Ratelimit header.
    legacyHeaders: false,// Disable the legacy X-RateLimit-* headers
    message: { message: 'Too many translation requests. Please try again later.' },
});

// Rate limiter middleware for language detection
const detectLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,// 15 minutes
    limit: 60,// Requests per window per client
    standardHeaders: true,//Enable the Ratelimit header.
    legacyHeaders: false,// Disable the legacy X-RateLimit-* headers
    message: { message: 'Too many language detection requests. Please try again later.' },
});

module.exports= {
    authLimiter,
    generalRateLimiter,
    loginLimiter,
    registerLimiter,
    passwordUpdateRateLimiter,
    translateLimiter,
    detectLimiter
}