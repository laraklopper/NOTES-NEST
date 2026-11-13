//archiveUtil.js
/* The 60-day archive rule: an archived note is moved to the trash ARCHIVE_DAYS
after it was archived. A TTL index can only delete documents, not change them,
so this sweep does the move instead. It runs:
  - for one user before GET /archive/fetchNotes and GET /notes/trash, so those lists are always accurate
  - for every user on server start and then every hour (app.js) */
const mongoose = require('mongoose');
const Note = require('../models/noteSchema');
const { ARCHIVE_RETENTION_MS } = require('./schemaUtil');

const ARCHIVE_SWEEP_INTERVAL_MS = 1000 * 60 * 60;// Run the global sweep every hour

/* Moves expired archived notes to the trash. Pass a userId to sweep only that user's notes.
Notes archived before archivedAt existed have no archivedAt, so updatedAt is used for them.
Returns the number of notes moved */
const trashExpiredArchivedNotes = async (userId) => {
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

    // Same end state as DELETE /archive/:id, so a trash restore returns the note to the main list
    const result = await Note.updateMany(filter, {
        $set: { deletedAt: new Date(), isArchived: false, isPinned: false, archivedAt: null }
    });
    if (result.modifiedCount > 0) {
        console.log(`[INFO: archiveUtil.js] Moved ${result.modifiedCount} expired archived note(s) to the trash`);
    }
    return result.modifiedCount;
};

// Runs the sweep for every user now and then every hour. Errors are logged, never thrown
const startArchiveSweep = () => {
    const run = () => trashExpiredArchivedNotes().catch((error) => {
        console.error('[ERROR: archiveUtil.js] Archive sweep failed:', error.message);
    });
    run();
    const timer = setInterval(run, ARCHIVE_SWEEP_INTERVAL_MS);
    timer.unref();// Don't keep the process alive just for the sweep
    return timer;
};

module.exports = { trashExpiredArchivedNotes, startArchiveSweep };
