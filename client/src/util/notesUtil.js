//notesUtil.js
/* Empty form values, shared by the initial state and the RESET button */
export const emptyNoteForm = {
  title: '',
  content: '',// Plain text from the NOTE textarea, converted with textToHtml on save
  language: '',// '' falls back to the user's default note language
  notebook: '',// '' means "No notebook"
  tags: '',// Comma separated tag names, e.g. "work, ideas"
  isPinned: false
}

// Escape characters that HTML would otherwise read as markup
const escapeHtml = (text) => text
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;')

/* Converts textarea text to the HTML the server stores in `content`.
Blank lines start a new paragraph and single line breaks become <br>,
so the note keeps its layout when NotesList shows it as HTML.
e.g. "Line 1\nLine 2\n\nLine 3" -> "<p>Line 1<br>Line 2</p><p>Line 3</p>" */
export const textToHtml = (text = '') => text
  .replace(/\r\n/g, '\n')
  .trim()
  .split(/\n{2,}/)
  .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`)
  .join('')
