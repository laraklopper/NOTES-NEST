// Shared validation rules — reuse these in express-validator and on the client so rules never drift apart

// =======REGULAR EXPRESSIONS=================
/*Basic email format: Regular expression for validating email formats*/
export const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; 
/*Regular expression for validating South African phone numbers
SA mobile: 0821234567 or +27821234567*/
export const phoneRegex = /^(\+27|0)[6-8][0-9]{8}$/;

// Normalize SA phone to a consistent format for uniqueness
export function normalizePhoneSA(phone) {
    if (!phone) return phone;

    let p = String(phone).trim().replace(/\s+/g, '');// Remove all spaces

    if (p.startsWith('0')) {
        p = '+27' + p.slice(1);
    }
    return p;
}

export const languageCodeRegex = /^[a-z]{2,3}(-[A-Za-z]{2,4})?$/; // language codes from Langbly, e.g. en, af, zu, zh-CN
export const hexColourRegex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/; // #1F4E79 or #fff

export const ADMIN_MIN_AGE = 21; // admins must be at least 21
export const ADMIN_MIN_ACCOUNT_AGE_MS = process.env.NODE_ENV === 'production'
  ? 1000 * 60 * 60 * 24 * 90 // 3 months (90 days) in production
  : 1000 * 60 * 60 * 24; // 1 day during development

export const THIRTY_DAYS_IN_SECONDS = 60 * 60 * 24 * 30; // trash retention period
export const MAX_TRANSLATION_CHARS = 10000; // Langbly free-tier limit per request

