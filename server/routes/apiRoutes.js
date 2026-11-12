//apiRoutes.js
/*mounted at /api by app.js
- GET - '/language/translate/v2/languages' - Fetch supported languages for dropdowns
- POST - /language/translate/v2/detect - Detect the language of text body
- POST - /language/translate/v2 - Translate text(without saving)
Each route forwards to the Langbly endpoint of the same path, so the API key in
.env never reaches the browser.
 */
/* Load environment variables from a .env
file using the dotenv package*/
require('dotenv').config();// Must run before any process.env reads below, otherwise LANGBLY_API_KEY would be undefined
// IMPORT REQUIRED MODULES AND PACKAGES
const express = require('express');//Express framework for building web applications
// IMPORT CUSTOM MIDDLEWARE
const { checkJwtToken } = require('../middleware/securityMiddleware');// Import the JWT middleware
const { translateLimiter, detectLimiter } = require('../middleware/rateLimitMiddleware');// Limits translation and language detection requests per IP
// IMPORT DATA AND UTILITY FUNCTIONS
const { languageData } = require('../util/langaugeData');// Local copy of the Langbly language list
const { languageCodeRegex, MAX_TRANSLATION_CHARS } = require('../util/schemaUtil');// Shared validation rules: valid language-code pattern and max text length
const {LANGBLY_TIMEOUT_MS, LANGUAGES_CACHE_MS, LANGBLY_PATH} = require('../util/apiUtil')
const router = express.Router()// Create Express router instance

// =======LANGBLY CONNECTION SETTINGS===============
const LANGBLY_BASE_URL = (process.env.LANGBLY_BASE_URL || 'https://api.langbly.com').replace(/\/+$/, '');// Use the .env URL if set, else the default; the regex strips trailing slashes so the joined URL never has '//'
const LANGBLY_API_KEY = process.env.LANGBLY_API_KEY;// Secret key, only ever used server-side
// const LANGBLY_PATH = '/language/translate/v2';// Base path shared by every Langbly endpoint this file calls

// Language code -> readable name, used to name detected languages
const LANGUAGE_NAMES = languageData.reduce((names, lang) => {// Turns [{ code, name }] into { code: name } for fast lookups
    names[lang.code] = lang.name;// e.g. names['af'] = 'Afrikaans'
    return names;// Pass the growing object to the next iteration
}, {});// Start from an empty object

// In-memory cache for GET /language/translate/v2/languages
let languagesCache = { languages: null, expiresAt: 0 };// expiresAt: 0 means "already expired", so the first request always fetches; resets when the server restarts

/* An error raised by a Langbly request, carrying the status this server should
answer with and a message that is safe to show the user. */
class LangblyError extends Error {
    constructor(status, message) {
        super(message);// Sets error.message (shown to the user via sendError)
        this.name = 'LangblyError';// Makes it easy to recognise in logs
        this.status = status;// HTTP status this server should respond with (400, 429 or 502)
    }
}

/* Function to send a request to Langbly and return the parsed `data` object.
Langbly errors are mapped onto the statuses the client handles:
  - 400: the text or a language code was rejected
  - 429: quota or rate limit reached
  - 502: Langbly is unreachable, timed out, or rejected the API key
(a rejected key is a server configuration problem, so it is not passed on as a
401 — that would log the user out). */
// Send a request to Langbly and return the data from its response.
// The options object is optional. If no method is supplied, use GET.
const langblyRequest = async (path, { method = 'GET', body } = {}) => {// path is the suffix after LANGBLY_PATH, e.g. '/detect' or '' for translate
    //Conditional rendering 
    // Stop before making the request if the server's API key is missing.
    if (!LANGBLY_API_KEY) {
        console.error('[ERROR: apiRoutes.js, langblyRequest] LANGBLY_API_KEY is missing from .env');// Log an error message in the console for debugging purposes
        throw new LangblyError(502, 'The translation service is not configured.');// 502, not 500: the problem is with the upstream service setup
    }

    let response;// Declare response outside the try block so it can be read afterward.
    try {
        // Append the route suffix, such as '/detect', to the Langbly endpoint.
        response = await fetch(`${LANGBLY_BASE_URL}${LANGBLY_PATH}${path}`, {
            method,//HTTP method ('GET' or 'POST')
            headers: {
                // Send the server's API key using both authentication headers.
                /* The Langbly docs show both schemes, so both are sent */
                'X-API-Key': LANGBLY_API_KEY,// Header-based API key scheme
                'Authorization': `Bearer ${LANGBLY_API_KEY}`,// Bearer token scheme
                ...(body ? { 'Content-Type': 'application/json' } : {}),// Add Content-Type only when sending a body.
            },
            body: body ? JSON.stringify(body) : undefined, // Convert the request body to JSON, or omit it if none was supplied.
            signal: AbortSignal.timeout(LANGBLY_TIMEOUT_MS),// ABORT SIGNAL: a ready-made signal (no AbortController needed) that aborts itself after 15s.
            /* When it fires, Node drops the connection and this fetch rejects with a DOMException named 'TimeoutError' (a manual controller.abort() would give 'AbortError').
            Without it, Node's fetch has no overall time limit, so a hung Langbly server would keep the user's request open indefinitely.
            The signal stays attached to the response after headers arrive, so the same 15s budget also covers reading the body (response.json() below).
            Requires Node 17.3+; this file already needs Node 18+ for global fetch.*/
        });
    } catch (error) {
        console.error(`[ERROR: apiRoutes.js, langblyRequest] ${method} ${path} could not reach Langbly:`, error.message);// Log an error message in the console for debugging purposes
        throw new LangblyError(502, 'The translation service is unavailable. Please try again later.');// Hide the technical cause from the user; the route turns this into a 502 response
    }

    const payload = await response.json().catch(() => ({}));// Safely parse the JSON response (avoid crash if Langbly returns non-JSON)
    // NOTE: if the 15s timeout fires while the body is still downloading, json() rejects with TimeoutError and this .catch also swallows it, giving {}.
    // With a 2xx status that means langblyRequest returns {} — the routes below then see "no data" rather than a timeout (on /detect that looks like 'undetermined').
    if (!response.ok) {
        const providerMessage = payload?.error?.message;// Langbly's own error text, if it sent one
        console.error(`[ERROR: apiRoutes.js, langblyRequest] ${method} ${path} failed (${response.status}):`, providerMessage);// Log an error message in the console for debugging purposes
        if (response.status === 400) throw new LangblyError(400, providerMessage || 'The translation request was invalid.');// User-fixable input problem: pass Langbly's reason on
        if (response.status === 429) throw new LangblyError(429, 'Too many requests — please wait and try again.');// Quota/rate limit: the client can retry later
        throw new LangblyError(502, 'The translation service is unavailable. Please try again later.');// Everything else (401/403 bad key, 5xx) is our/Langbly's problem, not the user's
    }
    return payload.data || {};// Langbly wraps results in { data: ... }; return {} so callers can safely use optional chaining
}

/* Function to send a route's error response: Langbly errors keep their mapped
status, anything else is a 500. */
const sendError = (res, route, error) => {
    // Conditional rendering
    if (error instanceof LangblyError) {// Expected, already-logged errors from langblyRequest (including timeouts)
        return res.status(error.status).json({ message: error.message });// Use the mapped status and the user-safe message
    }
    console.error(`[ERROR: apiRoutes.js, ${route}]`, error.message);// Log an error message in the console for debugging purposes
    return res.status(500).json({ message: 'Internal Server Error' });// Return a 500 (Internal Server Error) status code with a message
}

/* Function to check the text sent for detection or translation. Returns an
error message, or null when the text is usable. */
const checkSourceText = (sourceText) => {
    // Must be a string, so it cannot inject anything other than text into the request
    if (typeof sourceText !== 'string' || !sourceText.trim()) return 'Text to translate is required';// Rejects non-strings, empty strings and whitespace-only text
    if (sourceText.length > MAX_TRANSLATION_CHARS) return `Text cannot exceed ${MAX_TRANSLATION_CHARS} characters`;// Caps cost per request and keeps Langbly response times (and the 15s timeout) realistic
    return null;// null = valid
}

/*──────────────────────────── GET ROUTES ─────────────────────────────────────
   GET: READ — Used to fetch information from the provider
────────────────────────────────────────────────────────────────────────────────*/
/* GET: /api/language/translate/v2/languages : The languages Langbly supports,
as [{ code, name }] sorted by name, for the language dropdowns. */
router.get('/language/translate/v2/languages', checkJwtToken, async (req, res) => {// checkJwtToken runs first: only logged-in users can call this
    try {
        // Serve the cached list while it is still fresh
        if (languagesCache.languages && Date.now() < languagesCache.expiresAt) {
            return res.status(200).json(languagesCache.languages);// No Langbly call, so no timeout risk
        }
 
        // target=en asks Langbly to name each language in English
        const data = await langblyRequest('/languages?target=en');// GET by default; throws LangblyError on timeout/failure (handled in catch)
        const languages = (data.languages || [])// Empty array if Langbly returned nothing (or a timed-out body became {})
            .filter((lang) => typeof lang?.language === 'string')// Drop malformed entries
            .map((lang) => ({
                code: lang.language,// e.g. 'zu'
                // Langbly can return codes without names, so fall back to the local list
                name: lang.name || LANGUAGE_NAMES[lang.language] || lang.language,// Last resort: show the code itself
            }))
            .sort((a, b) => a.name.localeCompare(b.name));// Alphabetical by name for the dropdown
 
        if (!languages.length) {// Also where a body-read timeout ends up (data was {})
            console.error('[ERROR: apiRoutes.js, GET /languages] Langbly returned no languages');// Log an error message in the console for debugging purposes
            return res.status(502).json({ message: 'The translation service is unavailable. Please try again later.' });// Don't cache an empty list
        }
 
        languagesCache = { languages, expiresAt: Date.now() + LANGUAGES_CACHE_MS };// Cache the good result for 24 hours
        console.log(`[SUCCESS: apiRoutes.js, GET /languages] Fetched ${languages.length} languages`);//Log a message in the console for debugging purposes
        return res.status(200).json(languages);// Send the sorted list to the client
    } catch (error) {
        return sendError(res, 'GET /languages', error);// LangblyError -> its status; anything else -> 500
    }
})

/*──────────────────────────── POST ROUTES ──────────────────────────────
    POST: Used to send text to the provider
 ─────────────────────────────────────────────────────────────────────────*/
/* POST: /api/language/translate/v2 : Translates the text from the TranslateForm.
Nothing is saved here — the Save button sends the result to /translation/save.
Body: { sourceText, sourceLanguage ("auto" or blank to detect), targetLanguage } */
router.post('/language/translate/v2', translateLimiter, checkJwtToken, async (req, res) => {// Rate limit runs first so floods are rejected before JWT checks or Langbly calls
    try {
        const { sourceText, sourceLanguage, targetLanguage } = req.body || {};// Extract the translation fields from the request body
 
        const textError = checkSourceText(sourceText);// Validate before spending a Langbly call
        if (textError) {
            console.error(`[ERROR: apiRoutes.js, POST /translate] ${textError}`);// Log an error message in the console for debugging purposes
            return res.status(400).json({ message: textError });// Return a 400 (Bad Request) status code with a message
        }
 
        // Conditional rendering to check the target language is a valid code
        if (typeof targetLanguage !== 'string' || !languageCodeRegex.test(targetLanguage)) {
            console.error('[ERROR: apiRoutes.js, POST /translate] Invalid target language');// Log an error message in the console for debugging purposes
            return res.status(400).json({ message: 'Please choose a valid target language' });// Return a 400 (Bad Request) status code with a message
        }
 
        // "auto" or a blank source means Langbly detects it during the translation
        const autoDetect = !sourceLanguage || sourceLanguage === 'auto';// true -> omit 'source' so Langbly detects it
        if (!autoDetect && (typeof sourceLanguage !== 'string' || !languageCodeRegex.test(sourceLanguage))) {
            console.error('[ERROR: apiRoutes.js, POST /translate] Invalid source language');// Log an error message in the console for debugging purposes
            return res.status(400).json({ message: 'Please choose a valid source language' });// Return a 400 (Bad Request) status code with a message
        }
        if (!autoDetect && sourceLanguage === targetLanguage) {
            console.error('[ERROR: apiRoutes.js, POST /translate] Source and target languages match');// Log an error message in the console for debugging purposes
            return res.status(400).json({ message: 'Target language must differ from the source language' });// Return a 400 (Bad Request) status code with a message
        }
 
        const data = await langblyRequest('', {// '' = the base translate endpoint; protected by the 15s timeout inside langblyRequest
            method: 'POST',
            body: {
                q: sourceText,// The text to translate
                target: targetLanguage,// Language to translate into
                ...(autoDetect ? {} : { source: sourceLanguage }),// Only send 'source' when the user chose one
                format: 'text',// Plain text, so the result is not HTML-escaped
            },
        });
 
        const translation = data.translations?.[0];// Langbly returns one translation per q item; we sent one
        if (typeof translation?.translatedText !== 'string') {// Also catches a body-read timeout (data was {})
            console.error('[ERROR: apiRoutes.js, POST /translate] Langbly returned no translation');// Log an error message in the console for debugging purposes
            return res.status(502).json({ message: 'The translation service is unavailable. Please try again later.' });// Return a 502 (Bad Gateway): the upstream gave an unusable answer
        }
 
        // Only present when Langbly detected the source language itself
        const detectedLanguage = autoDetect ? (translation.detectedSourceLanguage || null) : null;// null when the user picked the source
 
        console.log(`[SUCCESS: apiRoutes.js, POST /translate] Translated ${sourceText.length} characters to ${targetLanguage}`);//Log a message in the console for debugging purposes
        return res.status(200).json({
            translatedText: translation.translatedText,// The translated text for the result box
            // The language the text was actually translated from, ready to save
            sourceLanguage: autoDetect ? detectedLanguage : sourceLanguage,
            targetLanguage,// Echoed back so the client can save it alongside the result
            detectedLanguage,// Code Langbly detected, or null
            detectedLanguageName: detectedLanguage ? (LANGUAGE_NAMES[detectedLanguage] || detectedLanguage) : null,// Readable name for the UI, e.g. 'Detected: isiXhosa'
        });
    } catch (error) {
        return sendError(res, 'POST /translate', error);// Timeouts arrive here as LangblyError(502)
    }
})

/* POST: /api/language/translate/v2/detect : Previews the source language while
the user types. Body: { sourceText }
Responds { language, name, confidence, isReliable }; language is null when
Langbly could not tell (it answers "und" for text that is too short). */
/* POST: /api/language/translate/v2/detect : Previews the source language while
the user types. Body: { sourceText }
Responds { language, name, confidence, isReliable }; language is null when
Langbly could not tell (it answers "und" for text that is too short). */
router.post('/language/translate/v2/detect', detectLimiter, checkJwtToken, async (req, res) => {// Separate limiter because this fires often while typing
    try {
        const { sourceText } = req.body || {};// Extract the text from the request body
 
        const textError = checkSourceText(sourceText);// Same text rules as translate
        if (textError) {
            console.error(`[ERROR: apiRoutes.js, POST /detect] ${textError}`);// Log an error message in the console for debugging purposes
            return res.status(400).json({ message: textError });// Return a 400 (Bad Request) status code with a message
        }
 
        const data = await langblyRequest('/detect', {// Only the 15s timeout can abort this; if the browser cancels its request, this call still runs to completion
            method: 'POST',
            body: { q: sourceText },// The text whose language should be detected
        });
 
        // One array of results per q item; Langbly currently returns one result in it
        const detection = data.detections?.[0]?.[0];// First result for the first (only) q item; undefined if data was {}
        const language = detection?.language && detection.language !== 'und' ? detection.language : null;// 'und' = undetermined -> null. A body-read timeout also ends up as null here, so it looks like 'undetermined' rather than an error
 
        console.log(`[SUCCESS: apiRoutes.js, POST /detect] Detected language: ${language || 'undetermined'}`);//Log a message in the console for debugging purposes
        return res.status(200).json({
            language,// Language code, or null
            name: language ? (LANGUAGE_NAMES[language] || language) : null,// Readable name for the UI
            confidence: typeof detection?.confidence === 'number' ? detection.confidence : null,// Langbly's confidence score, if provided
            isReliable: Boolean(language && detection?.isReliable),// Always false when no language was detected
        });
    } catch (error) {
        return sendError(res, 'POST /detect', error);// Timeouts arrive here as LangblyError(502)
    }
})

// Export the router to use in other parts of the application
module.exports = router// Mounted at /api in app.js
