//archiveUtil.js
/* The 60-day archive rule: an archived note or translation is moved to the trash
ARCHIVE_DAYS after it was archived. A TTL index can only delete documents, not
change them, so this sweep does the move instead. It runs:
  - for one user before GET /archive/fetchNotes, GET /archive/fetchTranslations and
    GET /notes/trash, so those lists are always accurate
  - for every user on server start and then every hour (app.js)
The hourly sweep also deletes translations whose note was purged by the notes TTL index */
const mongoose = require('mongoose');
const Note = require('../models/noteSchema');
const Translation = require('../models/translationSchema');
const { ARCHIVE_RETENTION_MS } = require('./schemaUtil');

const ARCHIVE_SWEEP_INTERVAL_MS = 1000 * 60 * 60;// Run the global sweep every hour

/* Moves a model's expired archived documents to the trash. Pass a userId to sweep only that user's.
Documents archived before archivedAt existed have no archivedAt, so updatedAt is used for them.
Returns the number of documents moved */
const trashExpired = async (Model, extraSet, userId) => {
    const cutoff = new Date(Date.now() - ARCHIVE_RETENTION_MS);
    const filter = {
        isArchived: true,
        deletedAt: null,
        $or: [
            { archivedAt: { $lte: cutoff } },
            { archivedAt: null, updatedAt: { $lte: cutoff } }
        ]
    };
    if (userId) filter.user = new mongoose.Types.ObjectId(userId);

    // Same end state as the archive DELETE routes, so a trash restore returns it to the main list
    const result = await Model.updateMany(filter, {
        $set: { deletedAt: new Date(), isArchived: false, archivedAt: null, ...extraSet }
    });
    if (result.modifiedCount > 0) {
        console.log(`[INFO: archiveUtil.js] Moved ${result.modifiedCount} expired archived ${Model.modelName.toLowerCase()}(s) to the trash`);
    }
    return result.modifiedCount;
};

const trashExpiredArchivedNotes = (userId) => trashExpired(Note, { isPinned: false }, userId);
const trashExpiredArchivedTranslations = (userId) => trashExpired(Translation, {}, userId);

/* Deletes translations whose linked note no longer exists. The 30-day TTL index purges
trashed notes inside MongoDB, so the cascade in DELETE /notes/:id/permanent never runs
for them. This gives auto-purged notes the same result. Returns the number deleted */
const removeOrphanedTranslations = async () => {
    const linkedNoteIds = await Translation.distinct('note', { note: { $ne: null } });
    if (linkedNoteIds.length === 0) return 0;

    const existingIds = await Note.distinct('_id', { _id: { $in: linkedNoteIds } });
    const existing = new Set(existingIds.map(String));
    const missingIds = linkedNoteIds.filter((id) => !existing.has(String(id)));
    if (missingIds.length === 0) return 0;

    const result = await Translation.deleteMany({ note: { $in: missingIds } });
    if (result.deletedCount > 0) {
        console.log(`[INFO: archiveUtil.js] Deleted ${result.deletedCount} translation(s) of purged notes`);
    }
    return result.deletedCount;
};

// Runs the sweep for every user now and then every hour. Errors are logged, never thrown
const startArchiveSweep = () => {
    const run = () => Promise.all([
        trashExpiredArchivedNotes(),
        trashExpiredArchivedTranslations(),
        removeOrphanedTranslations()
    ]).catch((error) => {
        console.error('[ERROR: archiveUtil.js] Archive sweep failed:', error.message);
    });
    run();
    const timer = setInterval(run, ARCHIVE_SWEEP_INTERVAL_MS);
    timer.unref();// Don't keep the process alive just for the sweep
    return timer;
};

module.exports = { trashExpiredArchivedNotes, trashExpiredArchivedTranslations, removeOrphanedTranslations, startArchiveSweep };
