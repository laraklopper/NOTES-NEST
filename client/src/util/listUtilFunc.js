export const PURGE_DAYS = 30;// Matches the TTL index on deletedAt in noteSchema
export const DAY_MS = 24 * 60 * 60 * 1000;

// Whole days left before the note is purged automatically (never below 0)
export const daysLeft = (deletedAt) => {
    const deleted = new Date(deletedAt).getTime()
    if (isNaN(deleted)) return null
    return Math.max(Math.ceil((deleted + PURGE_DAYS * DAY_MS - Date.now()) / DAY_MS), 0)
}

export const ARCHIVE_DAYS = 60;// Matches ARCHIVE_DAYS in server/util/schemaUtil.js

/* Whole days left before an archived note/translation is moved to the trash (never below 0).
Items archived before archivedAt existed fall back to updatedAt, the same as the server */
export const archiveDaysLeft = (item) => {
    const archived = new Date(item?.archivedAt || item?.updatedAt).getTime()
    if (isNaN(archived)) return null
    return Math.max(Math.ceil((archived + ARCHIVE_DAYS * DAY_MS - Date.now()) / DAY_MS), 0)
}

// Table text for a days-left value, e.g. "12 DAYS", "1 DAY", "TODAY" or "-"
export const formatDaysLeft = (remaining) => {
    if (remaining === null || remaining === undefined) return '-'
    if (remaining === 0) return 'TODAY'
    return `${remaining} DAY${remaining === 1 ? '' : 'S'}`
}

// Red, bold text for items with a week or less left
export const URGENT_DAYS = 7
export const urgentStyle = (remaining) => (
    remaining !== null && remaining <= URGENT_DAYS ? { color: '#B82C3A', fontWeight: '800' } : undefined
)