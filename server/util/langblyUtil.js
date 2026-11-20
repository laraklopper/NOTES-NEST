// langblyUtil.js
/* Shared Langbly helpers, used by apiRoutes.js (text translation) and
docTranslateRoutes.js (document translation), so both call the provider the
same way and map its errors onto the same statuses. */
/* Load environment variables from a .env
file using the dotenv package*/
require('dotenv').config();// Must run before any process.env reads below, otherwise LANGBLY_API_KEY would be undefined
const { languageData } = require('./languageData');// Local copy of the Langbly language list
const { LANGBLY_TIMEOUT_MS, LANGBLY_PATH } = require('./apiUtil');

// =======LANGBLY CONNECTION SETTINGS===============
const LANGBLY_BASE_URL = (process.env.LANGBLY_BASE_URL || 'https://api.langbly.com').replace(/\/+$/, '');// Use the .env URL if set, else the default; the regex strips trailing slashes so the joined URL never has '//'
const LANGBLY_API_KEY = process.env.LANGBLY_API_KEY;// Secret key, only ever used server-side

// Language code -> readable name, used to name detected languages
const LANGUAGE_NAMES = languageData.reduce((names, lang) => {// Turns [{ code, name }] into { code: name } for fast lookups
    names[lang.code] = lang.name;// e.g. names['af'] = 'Afrikaans'
    return names;// Pass the growing object to the next iteration
}, {});// Start from an empty object

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
The options object is optional (method defaults to GET). Pass `signal` to cancel
the call when the browser disconnects (see clientAbortSignal below).
Langbly errors are mapped onto the statuses the client handles:
  - 400: the text or a language code was rejected
  - 429: quota or rate limit reached
  - 502: Langbly is unreachable, timed out, or rejected the API key
(a rejected key is a server configuration problem, so it is not passed on as a
401 — that would log the user out). */
const langblyRequest = async (path, { method = 'GET', body, signal } = {}) => {// path is the suffix after LANGBLY_PATH, e.g. '/detect' or '' for translate
    // Guard clause: stop before making the request if the server's API key is missing.
    if (!LANGBLY_API_KEY) {
        console.error('[ERROR: langblyUtil.js, langblyRequest] LANGBLY_API_KEY is missing from .env');// Log an error message in the console for debugging purposes
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
            signal: signal
                ? AbortSignal.any([signal, AbortSignal.timeout(LANGBLY_TIMEOUT_MS)])// Whichever comes first: the browser disconnecting or the 15s timeout
                : AbortSignal.timeout(LANGBLY_TIMEOUT_MS),// ABORT SIGNAL: a ready-made signal (no AbortController needed) that aborts itself after 15s.
            /* When the timeout fires, Node drops the connection and this fetch rejects with a DOMException named 'TimeoutError'
            (the browser-disconnect signal gives 'AbortError' instead).
            Without it, Node's fetch has no overall time limit, so a hung Langbly server would keep the user's request open indefinitely.
            The signal stays attached to the response after headers arrive, so the same 15s budget also covers reading the body (response.json() below).
            AbortSignal.timeout needs Node 17.3+, AbortSignal.any needs Node 20.3+.*/
        });
    } catch (error) {
        console.error(`[ERROR: langblyUtil.js, langblyRequest] ${method} ${path} could not reach Langbly:`, error.message);// Log an error message in the console for debugging purposes
        throw new LangblyError(502, 'The translation service is unavailable. Please try again later.');// Hide the technical cause from the user; the route turns this into a 502 response
    }

    /* Parse the JSON body. A non-JSON body (e.g. an HTML gateway error) falls back to {},
    but a timeout or abort while the body is still downloading is a real failure, so it
    becomes a 502 instead of looking like "no data" (or "undetermined" on /detect) */
    let payload;
    try {
        payload = await response.json();
    } catch (error) {
        if (error.name === 'TimeoutError' || error.name === 'AbortError') {
            console.error(`[ERROR: langblyUtil.js, langblyRequest] ${method} ${path} timed out while reading the response:`, error.message);// Log an error message in the console for debugging purposes
            throw new LangblyError(502, 'The translation service is unavailable. Please try again later.');
        }
        payload = {};// Non-JSON body: carry on with an empty object
    }
    if (!response.ok) {
        const providerMessage = payload?.error?.message;// Langbly's own error text, if it sent one
        console.error(`[ERROR: langblyUtil.js, langblyRequest] ${method} ${path} failed (${response.status}):`, providerMessage);// Log an error message in the console for debugging purposes
        if (response.status === 400) throw new LangblyError(400, providerMessage || 'The translation request was invalid.');// User-fixable input problem: pass Langbly's reason on
        if (response.status === 429) throw new LangblyError(429, 'Too many requests — please wait and try again.');// Quota/rate limit: the client can retry later
        throw new LangblyError(502, 'The translation service is unavailable. Please try again later.');// Everything else (401/403 bad key, 5xx) is our/Langbly's problem, not the user's
    }
    return payload.data || {};// Langbly wraps results in { data: ... }; return {} so callers can safely use optional chaining
}

/* Function to send a route's error response: Langbly errors keep their mapped
status, anything else is a 500. `file` names the route file in the log. */
const sendError = (res, route, error, file = 'apiRoutes.js') => {
    if (res.writableEnded || res.destroyed) return;// The browser already disconnected (e.g. a cancelled /detect), so there is no one to answer
    if (error instanceof LangblyError) {// Expected, already-logged errors from langblyRequest (including timeouts)
        return res.status(error.status).json({ message: error.message });// Use the mapped status and the user-safe message
    }
    console.error(`[ERROR: ${file}, ${route}]`, error.message);// Log an error message in the console for debugging purposes
    return res.status(500).json({ message: 'Internal Server Error' });// Return a 500 (Internal Server Error) status code with a message
}

/* Function to get a signal that aborts when the browser disconnects before this
server has answered (e.g. TranslateForm cancels an older /detect call while the
user keeps typing). Passed to langblyRequest so the Langbly call stops too and
doesn't use up quota on a result nobody will see. */
const clientAbortSignal = (res) => {
    const controller = new AbortController();
    res.on('close', () => {
        if (!res.writableFinished) controller.abort();// Closed before the response finished = the client left
    });
    return controller.signal;
}

module.exports = {
    LANGUAGE_NAMES,
    LangblyError,
    langblyRequest,
    sendError,
    clientAbortSignal
}
