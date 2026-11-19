//docTranslateSchema.js
const mongoose = require('mongoose');

const MAX_DOCUMENT_TEXT_LENGTH = 20000;

const docTranslateSchema = new mongoose.Schema({
    userId:{},
    fileName:{},
    sourceText:{},
     translatedText: {},
     sourceLanguage:{},
     targetLanguage: {},
     provider:{},
     pageCount:{},
     pageCount:{},
     characterCount:{}
},{
    timestamps: true
})

module.exports = mongoose.model('DocumentTranslation', docTranslateSchema)