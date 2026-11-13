//translationSchema.js
const mongoose = require('mongoose');
const { languageCodeRegex, MAX_TRANSLATION_CHARS } = require('../util/schemaUtil');

const translationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true // every query is filtered by owner
    },
    note: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Note',
      default: null, // null for free text typed into the translate form; when set, the controller checks it belongs to the user and is not archived
      index: true // fetch translations for one note
    },
    sourceText: {
      type: String,
      required: [true, 'Source text is required'], // snapshot of note.plainText at translation time
      maxlength: [MAX_TRANSLATION_CHARS, `Text cannot exceed ${MAX_TRANSLATION_CHARS} characters`]
    },
    translatedText: {
      type: String,
      required: [true, 'Translated text is required'] // stored as returned by Langbly
    },
    sourceLanguage: {
      type: String,
      required: [true, 'Source language is required'], // chosen, or Langbly's detectedSourceLanguage
      trim: true,
      match: [languageCodeRegex, 'Invalid language code']
    },
    targetLanguage: {
      type: String,
      required: [true, 'Target language is required'],
      trim: true,
      match: [languageCodeRegex, 'Invalid language code'],
      validate: {
        validator: function (value) {
          return value !== this.sourceLanguage; // can't translate into the same language
        },
        message: 'Target language must differ from the source language'
      }
    },
    characterCount: {
      type: Number,
      min: 0 // set automatically from sourceText; tracks usage against the free-tier quota
    },
    isArchived: {
      type: Boolean,
      default: false // true = hidden from the translations list and shown in the archive
    },
    archivedAt: {
      type: Date,
      default: null // when the translation was archived; moved to the trash ARCHIVE_DAYS (60) later
    },
    deletedAt: {
      type: Date,
      default: null // a date = in the trash (soft delete); null = not in the trash
    },
  },
  { timestamps: true } // createdAt / updatedAt
);

translationSchema.index({ user: 1, createdAt: -1 }); // translations list, newest first
translationSchema.index({ user: 1, isArchived: 1, deletedAt: 1, archivedAt: -1 }); // archive list filter + sort
translationSchema.index({ isArchived: 1, archivedAt: 1 }); // 60-day archive sweep (util/archiveUtil.js)

translationSchema.pre('validate', function () {
  if (this.isModified('sourceText')) this.characterCount = this.sourceText.length; // characters sent to Langbly
});

translationSchema.statics.getMonthlyUsage = async function (userId) { // characters used this calendar month
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0); // first day of the month at midnight
  const [result] = await this.aggregate([
    { $match: { user: new mongoose.Types.ObjectId(userId), createdAt: { $gte: start } } },
    { $group: { _id: null, total: { $sum: '$characterCount' } } }
  ]);
  return result ? result.total : 0; // 0 when nothing translated yet
};

translationSchema.set('toJSON', {
  transform: (doc, ret) => { delete ret.__v; return ret; } // hide version key
});

module.exports = mongoose.model('Translation', translationSchema);