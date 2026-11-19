//docTranslateSchema.js
const mongoose = require('mongoose');

const MAX_DOCUMENT_TEXT_LENGTH = 20000;

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
        trim: true,
     },
     //Field for text source language
     sourceLanguage:{
        type: String,
        required: [true, 'Document Source Language is required'],
        trim: true,
        // enum: [],
     },
     //Field for text Target Language,
     targetLanguage: {
        type: String,
        required: [true, 'Translation target language is required'],
        trim: true,
        // enum: [],
     },
    // Field for provider
     provider:{
        type: String,//e.g. "langbly"
     },
    //  Field for
     pageCount:{
        type: Number,
        min: 0,
        default: 0,
     },
    //  Field for
     characterCount: {
        type: Number,
        min: 0,
        default: 0,
    },
},{
    timestamps: true
})

module.exports = mongoose.model('DocumentTranslation', docTranslateSchema)