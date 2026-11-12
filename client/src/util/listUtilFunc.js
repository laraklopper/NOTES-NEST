export const PURGE_DAYS = 30;// Matches the TTL index on deletedAt in noteSchema
export const DAY_MS = 24 * 60 * 60 * 1000;

// Whole days left before the note is purged automatically (never below 0)
export const daysLeft = (deletedAt) => {
    const deleted = new Date(deletedAt).getTime()
    if (isNaN(deleted)) return null
    return Math.max(Math.ceil((deleted + PURGE_DAYS * DAY_MS - Date.now()) / DAY_MS), 0)
}