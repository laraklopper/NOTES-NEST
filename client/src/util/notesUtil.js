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

/* The reverse of textToHtml: turns stored note HTML back into textarea text
so the EditNoteForm can show it. Block tags become blank lines and <br> becomes
a line break; DOMParser decodes entities like &amp; without running any scripts.
e.g. "<p>Line 1<br>Line 2</p><p>Line 3</p>" -> "Line 1\nLine 2\n\nLine 3" */
export const htmlToText = (html = '') => {
  const withBreaks = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6]|blockquote|pre)>/gi, '\n\n')
  const doc = new DOMParser().parseFromString(withBreaks, 'text/html')
  return (doc.body.textContent || '').replace(/\n{3,}/g, '\n\n').trim()
}

/* A date as YYYY-MM-DD in the user's LOCAL time zone (the format a date input needs).
toISOString() is not used because it gives the UTC day, which can be a day off
from the day shown on the calendar */
export const toLocalDateInput = (value) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/* Moves a note's createdAt to the day picked in the date input (YYYY-MM-DD),
keeping the original time of day so notes on the same day stay in order.
A time later than now (e.g. moving a note to today) is capped at now */
export const changeCreatedDay = (createdAt, dayString) => {
  const [year, month, day] = dayString.split('-').map(Number)
  const date = createdAt ? new Date(createdAt) : new Date()
  date.setFullYear(year, month - 1, day)
  const now = new Date()
  return (date > now ? now : date).toISOString()
}

/* Form values for editing an existing note (shape matches emptyNoteForm).
The note comes from GET /notes/fetchNotes, so notebook and tags are populated objects */
export const noteToForm = (note) => note ? {
  createdAt: note.createdAt ? toLocalDateInput(note.createdAt) : '',// YYYY-MM-DD for the DATE input
  title: note.title || '',
  content: htmlToText(note.content),
  language: note.language || '',
  notebook: note.notebook?._id || '',
  tags: (note.tags || []).map((tag) => tag?.name).filter(Boolean).join(', '),
  isPinned: note.isPinned === true
} : emptyNoteForm
