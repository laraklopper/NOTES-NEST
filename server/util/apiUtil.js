// apiUtil.js

const LANGBLY_PATH = '/language/translate/v2';// Base path shared by every Langbly endpoint this file calls
const LANGBLY_TIMEOUT_MS = 15000;// Give up on Langbly after 15 seconds (used by AbortSignal.timeout in langblyRequest)
const LANGUAGES_CACHE_MS = 1000 * 60 * 60 * 24;// The language list rarely changes, so cache it for 24 hours (ms * s * min * h)
 
module.exports = {LANGBLY_PATH, LANGBLY_TIMEOUT_MS, LANGUAGES_CACHE_MS}