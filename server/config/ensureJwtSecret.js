//ensureJwtSecret.js
/* Load environment variables from a .env 
file using the dotenv package*/
require('dotenv').config();
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Absolute path to the .env file in the project root
const envFilePath = path.join(process.cwd(), '.env');

//Function to ensure .env has exactly one JWT_SECRET_KEY line.
/**
 * Ensures JWT_SECRET_KEY exists in the provided .env content.
 * - Appends the key if missing
 * - Replaces malformed or empty key entries
 * - Preserves OS-specific line endings
 */
function ensureEnvHasKey(content, keyLine) {
    // Check if JWT_SECRET_KEY already exists anywhere in the file
    const hasKey = /(^|\r?\n)JWT_SECRET_KEY\s*=/.test(content);
    // If key does not exist, append it safely
    if (!hasKey) {
        return content + (content.endsWith('\n') ? '' : '\n') + keyLine;
    }
    // Replace empty or malformed JWT_SECRET_KEY lines
    return content.replace(
        /(^|\r?\n)JWT_SECRET_KEY\s*=\s*(?:\r?\n|$)/,
        `${process.platform === 'win32' ? '\r\n' : '\n'}${keyLine}`
    );
}

/**
 * Ensures a JWT secret key is available.
 * - Uses existing key if present
 * - Fails fast in production if missing
 * - Generates and persists a secure key in development
 */
function ensureJwtSecret({ failIfMissingInProd = true } = {}) {
    // Determine environment (default: development)
    const nodeEnv = (process.env.NODE_ENV || 'development').toLowerCase();
    let jwtKey = (process.env.JWT_SECRET_KEY || '').trim();// Read existing JWT secret from environment
    /* Conditional rendering to check if the JWT key already exists
    if the key exists reuse it*/
    if (jwtKey) {
        return jwtKey;
    }
    // In production, missing JWT secret is a fatal error
    if (nodeEnv === 'production' && failIfMissingInProd) {
        console.error('[FATAL: ensureJwtSecret.js] JWT_SECRET_KEY is missing in production. Set it in the environment or .env.');
        process.exit(1);
    }

    // Generate a cryptographically secure random key (512-bit)
    jwtKey = crypto.randomBytes(64).toString('hex');
    // Format for .env
    const jwtSecretLine = `JWT_SECRET_KEY=${jwtKey}\n`;

    // If .env exists, update it
    if (fs.existsSync(envFilePath)) {
        const envContent = fs.readFileSync(envFilePath, 'utf-8');
        const updated = ensureEnvHasKey(envContent, jwtSecretLine.trim());
        // Only write if content changed
        if (updated !== envContent) {
            fs.writeFileSync(envFilePath, updated, { mode: 0o600 });
            console.log('[INFO] JWT secret key saved to .env');
        }
    } else {// Otherwise, create .env and write key
        fs.writeFileSync(envFilePath, jwtSecretLine, { mode: 0o600 });
        console.log('[INFO] .env created and JWT secret key added');
    }
    // Make key immediately available in runtime
    process.env.JWT_SECRET_KEY = jwtKey;
    return jwtKey;
}


// Export the function to used in other parts of the Application
module.exports = ensureJwtSecret;