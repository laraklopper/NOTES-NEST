// Shared validation rules — reuse these in express-validator and on the client so rules never drift apart

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // basic email format
const phoneRegex = /^(\+27|0)[6-8][0-9]{8}$/; // SA mobile: 0821234567 or +27821234567
const languageCodeRegex = /^[a-z]{2,3}(-[A-Za-z]{2,4})?$/; // language codes from Langbly, e.g. en, af, zu, zh-CN
const hexColourRegex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/; // #1F4E79 or #fff

const ADMIN_MIN_AGE = 21; // admins must be at least 21
const ADMIN_MIN_ACCOUNT_AGE_MS = process.env.NODE_ENV === 'production'
  ? 1000 * 60 * 60 * 24 * 90 // 3 months (90 days) in production
  : 1000 * 60 * 60 * 24; // 1 day during development

const MAX_TRANSLATION_CHARS = 10000; // Langbly free-tier limit per request

module.exports = {
  emailRegex,
  phoneRegex,
  languageCodeRegex,
  hexColourRegex,
  ADMIN_MIN_AGE,
  ADMIN_MIN_ACCOUNT_AGE_MS,
  MAX_TRANSLATION_CHARS
};