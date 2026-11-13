// apiUtil.js

const LANGBLY_PATH = '/language/translate/v2';// Base path shared by every Langbly endpoint this file calls
const LANGBLY_TIMEOUT_MS = 15000;// Give up on Langbly after 15 seconds (used by AbortSignal.timeout in langblyRequest)
const LANGUAGES_CACHE_MS = 1000 * 60 * 60 * 24;// The language list rarely changes, so cache it for 24 hours (ms * s * min * h)
 

const DEFAULT_LIMIT = 10;// Items per page when no limit is sent (notes and translations lists)
const MAX_LIMIT = 50;// Upper bound on the page size so one request can't pull the whole collection

/* Turns the page/limit query params into safe numbers, falling back to the defaults
when they are missing or not positive whole numbers. Used by every paged list (notes, translations, trash) */
const parsePagination = (page, limit) => {
    const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(limit, 10) || DEFAULT_LIMIT, 1), MAX_LIMIT);
    return { pageNumber, pageSize, skip: (pageNumber - 1) * pageSize };
};

// Builds the pagination object sent with every paged list (totalPages is at least 1)
const paginationInfo = (pageNumber, pageSize, total) => ({
    page: pageNumber,
    limit: pageSize,
    total,
    totalPages: Math.max(Math.ceil(total / pageSize), 1)
});

const MAX_EXPORT_ROWS = 10000;// Upper bound so one export can't pull an unbounded amount of data
const EXPORT_TIME_ZONE = 'Africa/Johannesburg';// Dates in exported files and filenames use South African time (SAST, UTC+2)

module.exports = {
    LANGBLY_PATH, LANGBLY_TIMEOUT_MS,
    LANGUAGES_CACHE_MS,
    DEFAULT_LIMIT,
    MAX_LIMIT,
    parsePagination,
    paginationInfo,
    MAX_EXPORT_ROWS,
    EXPORT_TIME_ZONE
}