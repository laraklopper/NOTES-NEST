//noteSchema.js
const mongoose = require('mongoose');
const sanitizeHtml = require('sanitize-html');
const { languageCodeRegex, THIRTY_DAYS_IN_SECONDS } = require('../util/schemaUtil');

const ALLOWED_HTML = { // what the TipTap editor is allowed to store
  allowedTags: ['p', 'br', 'strong', 'em', 'u', 's', 'h1', 'h2', 'h3', 'ul', 'ol', 'li',
    'blockquote', 'code', 'pre', 'hr', 'a', 'label', 'input', 'div', 'span'],
  allowedAttributes: {
    a: ['href', 'target', 'rel'], // links
    input: ['type', 'checked', 'disabled'], // checklist checkboxes
    li: ['data-type', 'data-checked'], // TipTap task items
    ul: ['data-type'] // TipTap task lists
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
  .trim();

const noteSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true // every query is filtered by owner
    },
    notebook: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Notebook',
      default: null // null means "No notebook"
    },
    title: {
      type: String,
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
      default: 'Untitled'
    },
    content: {
      type: String,
      default: '' // TipTap HTML, sanitised before saving
    },
    plainText: {
      type: String,
      default: '' // generated from content; used for search and translation
    },
    language: {
      type: String,
      required: [true, 'Note language is required'], // controller defaults it to the user's noteLanguage
      trim: true,
      match: [languageCodeRegex, 'Invalid language code']
    },
    tags: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tag' // many-to-many via array
    }],
    isPinned: { type: Boolean, default: false }, // shows at top of list
    isArchived: { type: Boolean, default: false }, // hidden from main list; cannot be translated
    deletedAt: { type: Date, default: null } // soft-delete marker; null while active
  },
  { timestamps: true } // createdAt / updatedAt
);

// ---------- Indexes ----------

noteSchema.index({ title: 'text', plainText: 'text' }, { weights: { title: 3, plainText: 1 } }); // full-text search; title matches rank higher
noteSchema.index({ user: 1, isPinned: -1, updatedAt: -1 }); // dashboard sort: pinned first, newest first
noteSchema.index({ deletedAt: 1 }, { expireAfterSeconds: THIRTY_DAYS_IN_SECONDS }); // TTL purge 30 days after soft delete

// ---------- Hooks ----------

noteSchema.pre('validate', function () { // runs on create and .save()
  if (this.isModified('content')) {
    this.content = toSafeHtml(this.content); // block stored XSS
    this.plainText = toPlainText(this.content); // keep search text in sync
  }
});

noteSchema.pre('findOneAndUpdate', function () { // runs on findOneAndUpdate / findByIdAndUpdate (PATCH /notes/:id)
  const update = this.getUpdate() || {};
  [update, update.$set].forEach((target) => { // content can arrive as { content } or { $set: { content } }
    if (target && typeof target.content === 'string') {
      target.content = toSafeHtml(target.content); // block stored XSS
      target.plainText = toPlainText(target.content); // keep search text in sync
    }
  });
  this.setOptions({ runValidators: true, new: true }); // validate updates and return the updated note
});

noteSchema.post('findOneAndDelete', async function (note) { // permanent delete also removes translations
  if (!note) return; // nothing was deleted
  await mongoose.model('Translation').deleteMany({ note: note._id });
});

noteSchema.set('toJSON', {
  transform: (doc, ret) => { delete ret.__v; return ret; } // hide version key
});

module.exports = mongoose.model('Note', noteSchema);