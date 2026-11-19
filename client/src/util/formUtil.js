// formUtil.js

/* EXPORT FORM: ExportForm.js */
/* Every export request in the app, keyed by the `type` prop.
    - filterKeys: the list filters sent as query params when exporting the filtered list
    - filename:   fallback name of the downloaded file (the server's Content-Disposition name is used when available)
    - title:      screen reader heading for the form */
export const EXPORT_TYPES = {
    notes:        { filterKeys: ['language', 'notebook', 'tag'],           filename: 'note-nest-notes',        title: 'EXPORT NOTES FORM' },
    translations: { filterKeys: ['sourceLanguage', 'targetLanguage'],      filename: 'note-nest-translations', title: 'EXPORT TRANSLATIONS FORM' },
}

// Reads the filename from a Content-Disposition header, e.g. attachment; filename="note-nest-notes-2026-11-09.csv"
export const filenameFromHeader = (header) => header?.match(/filename="?([^";]+)"?/i)?.[1] || null

/*FILTER FORMS */
export const EMPTY_FILTERS = { sourceLanguage: '', targetLanguage: '' }// '' = all languages
export const EMPTY_NOTE_FILTERS = { language: '', notebook: '', tag: '' }// '' = all

//DOCUMENT TRANSLATOR: DocTranslator.js
// ACCEPTED DATA 
export const ACCEPTED_EXTENSION = '.pdf';//What the file input accepts and what a chosen file is checked
export const ACCEPTED_MIME_TYPE = 'application/pdf';//Accepted MIME type
/*File size limits*/
export const MAX_FILE_SIZE_MB = 5;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

// Names the downloaded translation after the document it came from
export const downloadName = (fileName, targetLang) => {
    const base = String(fileName || 'document').replace(/\.pdf$/i, '');
    return `${base}-${targetLang}.txt`;
}