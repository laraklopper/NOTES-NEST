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
require('dotenv').config();
// IMPORT REQUIRED MODULES AND PACKAGES
const express = require('express');//Express framework for building web applications
const { checkJwtToken } = require('../middleware/securityMiddleware');// Import the JWT middleware
const { translateLimiter, detectLimiter } = require('../middleware/rateLimitMiddleware');// Limits translation and language detection requests per IP
const { languageData } = require('../util/langaugeData');// Local copy of the Langbly language list
const { languageCodeRegex, MAX_TRANSLATION_CHARS } = require('../util/schemaUtil');
const router = express.Router()// Create Express router instance

// =======LANGBLY CONNECTION SETTINGS===============
const LANGBLY_BASE_URL = (process.env.LANGBLY_BASE_URL || 'https://api.langbly.com').replace(/\/+$/, '');
const LANGBLY_API_KEY = process.env.LANGBLY_API_KEY;
const LANGBLY_PATH = '/language/translate/v2';
const LANGBLY_TIMEOUT_MS = 15000;// Give up on Langbly after 15 seconds
const LANGUAGES_CACHE_MS = 1000 * 60 * 60 * 24;// The language list rarely changes, so cache it for 24 hours

// Language code -> readable name, used to name detected languages
const LANGUAGE_NAMES = languageData.reduce((names, lang) => {
    names[lang.code] = lang.name;
    return names;
}, {});

// In-memory cache for GET /language/translate/v2/languages
let languagesCache = { languages: null, expiresAt: 0 };

/* An error raised by a Langbly request, carrying the status this server should
answer with and a message that is safe to show the user. */
class LangblyError extends Error {
    constructor(status, message) {
        super(message);
        this.name = 'LangblyError';
        this.status = status;
    }
}

/* Function to send a request to Langbly and return the parsed `data` object.
Langbly errors are mapped onto the statuses the client handles:
  - 400: the text or a language code was rejected
  - 429: quota or rate limit reached
  - 502: Langbly is unreachable, timed out, or rejected the API key
(a rejected key is a server configuration problem, so it is not passed on as a
401 — that would log the user out). */
const langblyRequest = async (path, { method = 'GET', body } = {}) => {
    //Conditional rendering 
    if (!LANGBLY_API_KEY) {
        console.error('[ERROR: apiRoutes.js, langblyRequest] LANGBLY_API_KEY is missing from .env');// Log an error message in the console for debugging purposes
        throw new LangblyError(502, 'The translation service is not configured.');
    }

    let response;
    try {
        response = await fetch(`${LANGBLY_BASE_URL}${LANGBLY_PATH}${path}`, {
            method,
            headers: {
                /* The Langbly docs show both schemes, so both are sent */
                'X-API-Key': LANGBLY_API_KEY,
                'Authorization': `Bearer ${LANGBLY_API_KEY}`,
                ...(body ? { 'Content-Type': 'application/json' } : {}),
            },
            body: body ? JSON.stringify(body) : undefined,
            signal: AbortSignal.timeout(LANGBLY_TIMEOUT_MS),
        });
    } catch (error) {
        console.error(`[ERROR: apiRoutes.js, langblyRequest] ${method} ${path} could not reach Langbly:`, error.message);// Log an error message in the console for debugging purposes
        throw new LangblyError(502, 'The translation service is unavailable. Please try again later.');
    }

    const payload = await response.json().catch(() => ({}));// Safely parse the JSON response (avoid crash if Langbly returns non-JSON)
    if (!response.ok) {
        const providerMessage = payload?.error?.message;
        console.error(`[ERROR: apiRoutes.js, langblyRequest] ${method} ${path} failed (${response.status}):`, providerMessage);// Log an error message in the console for debugging purposes
        if (response.status === 400) throw new LangblyError(400, providerMessage || 'The translation request was invalid.');
        if (response.status === 429) throw new LangblyError(429, 'Too many requests — please wait and try again.');
        throw new LangblyError(502, 'The translation service is unavailable. Please try again later.');
    }
    return payload.data || {};
}

/* Function to send a route's error response: Langbly errors keep their mapped
status, anything else is a 500. */
const sendError = (res, route, error) => {
    if (error instanceof LangblyError) {
        return res.status(error.status).json({ message: error.message });
    }
    console.error(`[ERROR: apiRoutes.js, ${route}]`, error.message);// Log an error message in the console for debugging purposes
    return res.status(500).json({ message: 'Internal Server Error' });// Return a 500 (Internal Server Error) status code with a message
}

/* Function to check the text sent for detection or translation. Returns an
error message, or null when the text is usable. */
const checkSourceText = (sourceText) => {
    // Must be a string, so it cannot inject anything other than text into the request
    if (typeof sourceText !== 'string' || !sourceText.trim()) return 'Text to translate is required';
    if (sourceText.length > MAX_TRANSLATION_CHARS) return `Text cannot exceed ${MAX_TRANSLATION_CHARS} characters`;
    return null;
}

/*──────────────────────────── GET ROUTES ─────────────────────────────────────
   GET: READ — Used to fetch information from the provider
────────────────────────────────────────────────────────────────────────────────*/
/* GET: /api/language/translate/v2/languages : The languages Langbly supports,
as [{ code, name }] sorted by name, for the language dropdowns. */
router.get('/language/translate/v2/languages', checkJwtToken, async (req, res) => {
    try {
        // Serve the cached list while it is still fresh
        if (languagesCache.languages && Date.now() < languagesCache.expiresAt) {
            return res.status(200).json(languagesCache.languages);
        }

        // target=en asks Langbly to name each language in English
        const data = await langblyRequest('/languages?target=en');
        const languages = (data.languages || [])
            .filter((lang) => typeof lang?.language === 'string')
            .map((lang) => ({
                code: lang.language,
                // Langbly can return codes without names, so fall back to the local list
                name: lang.name || LANGUAGE_NAMES[lang.language] || lang.language,
            }))
            .sort((a, b) => a.name.localeCompare(b.name));

        if (!languages.length) {
            console.error('[ERROR: apiRoutes.js, GET /languages] Langbly returned no languages');// Log an error message in the console for debugging purposes
            return res.status(502).json({ message: 'The translation service is unavailable. Please try again later.' });
        }

        languagesCache = { languages, expiresAt: Date.now() + LANGUAGES_CACHE_MS };
        console.log(`[SUCCESS: apiRoutes.js, GET /languages] Fetched ${languages.length} languages`);//Log a message in the console for debugging purposes
        return res.status(200).json(languages);
    } catch (error) {
        return sendError(res, 'GET /languages', error);
    }
})

/*──────────────────────────── POST ROUTES ──────────────────────────────
    POST: Used to send text to the provider
 ─────────────────────────────────────────────────────────────────────────*/
/* POST: /api/language/translate/v2 : Translates the text from the TranslateForm.
Nothing is saved here — the Save button sends the result to /translation/save.
Body: { sourceText, sourceLanguage ("auto" or blank to detect), targetLanguage } */
router.post('/language/translate/v2', translateLimiter, checkJwtToken, async (req, res) => {
    try {
        const { sourceText, sourceLanguage, targetLanguage } = req.body || {};// Extract the translation fields from the request body

        const textError = checkSourceText(sourceText);
        if (textError) {
            console.error(`[ERROR: apiRoutes.js, POST /translate] ${textError}`);// Log an error message in the console for debugging purposes
            return res.status(400).json({ message: textError });// Return a 400 (Bad Request) status code with a message
        }

        // Conditional rendering to check the target language is a valid code
        if (typeof targetLanguage !== 'string' || !languageCodeRegex.test(targetLanguage)) {
            console.error('[ERROR: apiRoutes.js, POST /translate] Invalid target language');// Log an error message in the console for debugging purposes
            return res.status(400).json({ message: 'Please choose a valid target language' });
        }

        // "auto" or a blank source means Langbly detects it during the translation
        const autoDetect = !sourceLanguage || sourceLanguage === 'auto';
        if (!autoDetect && (typeof sourceLanguage !== 'string' || !languageCodeRegex.test(sourceLanguage))) {
            console.error('[ERROR: apiRoutes.js, POST /translate] Invalid source language');// Log an error message in the console for debugging purposes
            return res.status(400).json({ message: 'Please choose a valid source language' });
        }
        if (!autoDetect && sourceLanguage === targetLanguage) {
            console.error('[ERROR: apiRoutes.js, POST /translate] Source and target languages match');// Log an error message in the console for debugging purposes
            return res.status(400).json({ message: 'Target language must differ from the source language' });
        }

        const data = await langblyRequest('', {
            method: 'POST',
            body: {
                q: sourceText,
                target: targetLanguage,
                ...(autoDetect ? {} : { source: sourceLanguage }),
                format: 'text',// Plain text, so the result is not HTML-escaped
            },
        });

        const translation = data.translations?.[0];
        if (typeof translation?.translatedText !== 'string') {
            console.error('[ERROR: apiRoutes.js, POST /translate] Langbly returned no translation');// Log an error message in the console for debugging purposes
            return res.status(502).json({ message: 'The translation service is unavailable. Please try again later.' });
        }

        // Only present when Langbly detected the source language itself
        const detectedLanguage = autoDetect ? (translation.detectedSourceLanguage || null) : null;

        console.log(`[SUCCESS: apiRoutes.js, POST /translate] Translated ${sourceText.length} characters to ${targetLanguage}`);//Log a message in the console for debugging purposes
        return res.status(200).json({
            translatedText: translation.translatedText,
            // The language the text was actually translated from, ready to save
            sourceLanguage: autoDetect ? detectedLanguage : sourceLanguage,
            targetLanguage,
            detectedLanguage,
            detectedLanguageName: detectedLanguage ? (LANGUAGE_NAMES[detectedLanguage] || detectedLanguage) : null,
        });
    } catch (error) {
        return sendError(res, 'POST /translate', error);
    }
})

/* POST: /api/language/translate/v2/detect : Previews the source language while
the user types. Body: { sourceText }
Responds { language, name, confidence, isReliable }; language is null when
Langbly could not tell (it answers "und" for text that is too short). */
router.post('/language/translate/v2/detect', detectLimiter, checkJwtToken, async (req, res) => {
    try {
        const { sourceText } = req.body || {};// Extract the text from the request body

        const textError = checkSourceText(sourceText);
        if (textError) {
            console.error(`[ERROR: apiRoutes.js, POST /detect] ${textError}`);// Log an error message in the console for debugging purposes
            return res.status(400).json({ message: textError });// Return a 400 (Bad Request) status code with a message
        }

        const data = await langblyRequest('/detect', {
            method: 'POST',
            body: { q: sourceText },
        });

        // One array of results per q item; Langbly currently returns one result in it
        const detection = data.detections?.[0]?.[0];
        const language = detection?.language && detection.language !== 'und' ? detection.language : null;

        console.log(`[SUCCESS: apiRoutes.js, POST /detect] Detected language: ${language || 'undetermined'}`);//Log a message in the console for debugging purposes
        return res.status(200).json({
            language,
            name: language ? (LANGUAGE_NAMES[language] || language) : null,
            confidence: typeof detection?.confidence === 'number' ? detection.confidence : null,
            isReliable: Boolean(language && detection?.isReliable),
        });
    } catch (error) {
        return sendError(res, 'POST /detect', error);
    }
})

module.exports = router
