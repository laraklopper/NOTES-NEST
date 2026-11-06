//notesUtil.js
/* Empty form values, shared by the initial state and the RESET button.
The note text (content) is kept in its own state because NoteEditor manages it */
export const emptyNoteForm = {
  title: '',
  language: '',// '' falls back to the user's default note language
  notebook: '',// '' means "No notebook"
  tags: '',// Comma separated tag names, e.g. "work, ideas"
  isPinned: false
}