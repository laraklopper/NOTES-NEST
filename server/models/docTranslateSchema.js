//docTranslateSchema.js
const mongoose = require('mongoose');
const { languageCodeRegex, THIRTY_DAYS_IN_SECONDS } = require('../util/schemaUtil');

const MAX_DOCUMENT_TEXT_LENGTH = 20000;// Longest text read out of one document (docTranslateRoutes.js enforces the same limit)

const docTranslateSchema = new mongoose.Schema({
    // Field for userId
    userId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    // Field for the name of the PDF the text was read out of
    fileName:{
        type: String,
        required: [true, "Document name is required"],
        maxLength: [255, "Document name cannot exceed 255 characters"],
        trim: true,
    },
    // The text extracted from the document
    sourceText:{
        type: String,
        required: [true, "Source text is required"],
        maxLength: [MAX_DOCUMENT_TEXT_LENGTH, `text cannot exceed ${MAX_DOCUMENT_TEXT_LENGTH} characters`],
        trim: true,
    },
    // Result returned by the provider
     translatedText: {
        type: String,
        required: [true, 'Translated Text is required'],
        maxLength: [MAX_DOCUMENT_TEXT_LENGTH * 2, 'Translated text is too long'],// headroom: a translation can run longer than its source
        trim: true,
     },
     //Field for text source language
     sourceLanguage:{
        type: String,
        required: [true, 'Document Source Language is required'],
        trim: true,
        match: [languageCodeRegex, 'Invalid language code'],
     },
     //Field for text Target Language,
     targetLanguage: {
        type: String,
        required: [true, 'Translation target language is required'],
        trim: true,
        match: [languageCodeRegex, 'Invalid language code'],
        validate: {
            validator: function (value) {
                return value !== this.sourceLanguage;// can't translate into the same language
            },
            message: 'Target language must differ from the source language'
        }
     },
    // Field for provider
     provider:{
        type: String,//e.g. "langbly"
        default: 'langbly',
     },
    //  Field for the number of pages in the PDF
     pageCount:{
        type: Number,
        min: 0,
        default: 0,
     },
    //  Field for the length of sourceText (set automatically below)
     characterCount: {
        type: Number,
        min: 0,
        default: 0,
    },
    // Field for the archived flag
    isArchived: {
        type: Boolean,
        default: false// true = hidden from the document list and shown in the archive
    },
    archivedAt: {
        type: Date,
        default: null// when the document translation was archived
    },
    deletedAt: {
        type: Date,
        default: null// a date = in the trash (soft delete); null = not in the trash
    },
},{
    timestamps: true
})

//===================INDEXES==================
docTranslateSchema.index({ userId: 1, createdAt: -1 });// document list, newest first
docTranslateSchema.index({ userId: 1, isArchived: 1, deletedAt: 1, archivedAt: -1 });// archive list filter + sort
docTranslateSchema.index({ isArchived: 1, archivedAt: 1 });// 60-day archive sweep (util/archiveUtil.js)
docTranslateSchema.index({ deletedAt: 1 }, { expireAfterSeconds: THIRTY_DAYS_IN_SECONDS });// TTL purge 30 days after soft delete (same as notes and translations)

// characterCount is always worked out from the stored text, never trusted from the client
docTranslateSchema.pre('validate', function () {
    if (this.isModified('sourceText') && typeof this.sourceText === 'string') this.characterCount = this.sourceText.length;
});

docTranslateSchema.set('toJSON', {
    transform: (doc, ret) => { delete ret.__v; return ret; }// hide the version key
});

module.exports = mongoose.model('DocumentTranslation', docTranslateSchema)
module.exports.MAX_DOCUMENT_TEXT_LENGTH = MAX_DOCUMENT_TEXT_LENGTH;
