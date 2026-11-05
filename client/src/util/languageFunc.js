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

/* The language pair used only when the signed-in account has no saved
preference, and while GET /user/me is still in flight. 'auto' asks the server to
detect the source language. */
export const FALLBACK_SOURCE_LANG = 'auto';
export const FALLBACK_TARGET_LANG = 'fr';