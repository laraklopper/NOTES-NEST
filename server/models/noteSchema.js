//noteSchema.js
const mongoose = require('mongoose');
const sanitizeHtml = require('sanitize-html');
const { languageCodeRegex, THIRTY_DAYS_IN_SECONDS } = require('../util/schemaUtil');

const ALLOWED_HTML = { // what a note's HTML content is allowed to store
  allowedTags: ['p', 'br', 'strong', 'em', 'u', 's', 'h1', 'h2', 'h3', 'ul', 'ol', 'li',
    'blockquote', 'code', 'pre', 'hr', 'a', 'div', 'span'],
  allowedAttributes: {// every attribute not listed here is removed
    a: ['href', 'target', 'rel'] // links
  },
  allowedSchemes: ['http', 'https', 'mailto'] // blocks javascript: links
};

const toSafeHtml = (html) => sanitizeHtml(html || '', ALLOWED_HTML); // strip anything dangerous
const BLOCK_END = /(<\/?(?:p|div|li|h[1-6]|blockquote|pre|ul|ol)\b[^>]*>|<br\s*\/?>)/gi; // block tags that start or end a line of text

const toPlainText = (html) => sanitizeHtml(
  (html || '').replace(BLOCK_END, '$1 '), // add a space so "<p>a</p><p>b</p>" becomes "a b", not "ab"
  { allowedTags: [], allowedAttributes: {} } // remove all tags
)
  .replace(/\s+/g, ' ') // collapse whitespace
  .trim();// remove leading/trailing spaces

//Define new NoteSchema
const noteSchema = new mongoose.Schema(
  {
    //User
    user: {
      type: mongoose.Schema.Types.ObjectId,// stores the User's _id
      ref: 'User',// enables .populate('user')
      required: true,
      index: true // every query is filtered by owner
    },
    // Field for Note notebood
    notebook: {
      type: mongoose.Schema.Types.ObjectId,// stores the Notebook's _id
      ref: 'Notebook',// enables .populate('notebook')
      default: null // null means "No notebook"
    },
    title: {
      type: String,
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
      default: 'Untitled'
    },
    content: {// note body as HTML
      type: String,
      default: '' // HTML built from the note textarea (textToHtml), sanitised before saving
    },
    plainText: {
      type: String,
      default: '' // generated from content; used for search and translation
    },
    language: {
      type: String,
      required: [true, 'Note language is required'], // controller defaults it to the user's noteLanguage
      trim: true,//Remove surrounding whitespace
      match: [languageCodeRegex, 'Invalid language code']// keeps titles list-friendly
    },
    tags: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tag' // many-to-many via array
    }],
    isPinned: { type: Boolean, default: false }, // shows at top of list
    isArchived: { type: Boolean, default: false }, // hidden from main list; cannot be translated
    archivedAt: { type: Date, default: null }, // when the note was archived; moved to the trash ARCHIVE_DAYS (60) later
    deletedAt: { type: Date, default: null } // soft-delete marker; null while active
  },
  { timestamps: true } // createdAt / updatedAt
);

// ---------- Indexes ----------

noteSchema.index({ title: 'text', plainText: 'text' }, { weights: { title: 3, plainText: 1 } }); // full-text search; title matches rank higher
noteSchema.index({ user: 1, isPinned: -1, updatedAt: -1 }); // dashboard sort: pinned first, newest first
noteSchema.index({ deletedAt: 1 }, { expireAfterSeconds: THIRTY_DAYS_IN_SECONDS }); // TTL purge 30 days after soft delete
noteSchema.index({ user: 1, isArchived: 1, deletedAt: 1, archivedAt: -1 }); // archive list filter + sort (GET /archive/fetchNotes)
noteSchema.index({ isArchived: 1, archivedAt: 1 }); // 60-day archive sweep (util/archiveUtil.js)

// ---------- Hooks ----------

noteSchema.pre('validate', function () { // runs on create and .save()
  if (this.isModified('content')) {
    this.content = toSafeHtml(this.content); // block stored XSS
    this.plainText = toPlainText(this.content); // keep search text in sync
  }
});

noteSchema.pre('findOneAndUpdate', function () { // runs on findOneAndUpdate / findByIdAndUpdate (PATCH /notes/:id)
  const update = this.getUpdate() || {};// the update object passed to the query
  [update, update.$set].forEach((target) => { // content can arrive as { content } or { $set: { content } }
    if (target && typeof target.content === 'string') {
      target.content = toSafeHtml(target.content); // block stored XSS
      target.plainText = toPlainText(target.content); // keep search text in sync
    }
  });
  this.setOptions({ runValidators: true, returnDocument: 'after' }); // validate updates and return the updated note (`new: true` is deprecated in Mongoose 9)
});

noteSchema.post('findOneAndDelete', async function (note) { // safety net: DELETE /notes/:id/permanent removes the translations first, so this normally finds none
  if (!note) return; // nothing was deleted
  await mongoose.model('Translation').deleteMany({ note: note._id });// remove orphaned translations of this note
});

noteSchema.set('toJSON', {// controls what res.json() sends to the client
  transform: (doc, ret) => { delete ret.__v; return ret; } // hide version key
});

//========EXPORT THE SCHEMA===============
module.exports = mongoose.model('Note', noteSchema);