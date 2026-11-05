import languageData from "./languageData";

export const NOT_SET = 'Not set'
/* Language code -> readable name, so a stored code can still be resolved if the
server response predates the schema's language-name virtuals. "auto" is not a
language in the list, so it is seeded separately. */
/* Language code -> readable name, so the codes the filters hold can be named
in the note below rather than shown as codes. */
export const LANGUAGE_NAMES = languageData.reduce((names, lang) => {
  names[lang.code] = lang.name
  return names
}, { auto: 'Auto-detect' })

export const FALLBACK_LANGUAGES = languageData;// The full Langbly language list

// Resolves a stored language code to its readable name, falling back to the code
export const languageName = (code) => (code ? (LANGUAGE_NAMES[code] || code) : NOT_SET)
export const MAX_LENGTH = 5000;// Matches the server-side limit on Translation.sourceText


/* How long to wait after the last keystroke before asking the server to detect
the source language. A detection costs the server a provider call, so the wait
is long enough that typing a sentence asks for one, not one per word. */
export const DETECT_DEBOUNCE_MS = 900;
/* Below this there is too little to go on for the answer to mean anything, so
the request is not worth making. Langbly answers "und" (undetermined) for
anything shorter than 20 characters. */
export const MIN_DETECT_CHARS = 20;
/* The language pair used only when the signed-in account has no saved
preference, and while GET /user/me is still in flight. 'auto' asks the server to
detect the source language. */
export const FALLBACK_SOURCE_LANG = 'auto';
export const FALLBACK_TARGET_LANG = 'fr';