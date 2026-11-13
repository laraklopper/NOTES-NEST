export const PURGE_DAYS = 30;// Matches the TTL index on deletedAt in noteSchema
export const DAY_MS = 24 * 60 * 60 * 1000;

// Whole days left before the note is purged automatically (never below 0)
export const daysLeft = (deletedAt) => {
    const deleted = new Date(deletedAt).getTime()
    if (isNaN(deleted)) return null
    return Math.max(Math.ceil((deleted + PURGE_DAYS * DAY_MS - Date.now()) / DAY_MS), 0)
}

export const ARCHIVE_DAYS = 60;// Matches ARCHIVE_DAYS in server/util/schemaUtil.js

/* Whole days left before an archived note is moved to the trash (never below 0).
Notes archived before archivedAt existed fall back to updatedAt, the same as the server */
export const archiveDaysLeft = (note) => {
    const archived = new Date(note?.archivedAt || note?.updatedAt).getTime()
    if (isNaN(archived)) return null
    return Math.max(Math.ceil((archived + ARCHIVE_DAYS * DAY_MS - Date.now()) / DAY_MS), 0)
}