//NotePadForm.js
//IMPORT REQUIRED MODULES AND PACKAGES
import React, { useState } from 'react'
// IMPORT CSS STYLESHEETS
import '../css/componentCss/NotesForm.css'
// IMPORT BOOTSTRAP COMPONENTS
import Stack from 'react-bootstrap/Stack';
import Button from 'react-bootstrap/Button';
//IMPORT CUSTOM COMPONENTS
import NoteEditor from './NoteEditor';
// IMPORT UTILITY FUNCTIONS
import languageData from '../util/languageData';
import { TODAY } from '../util/dateFunctions';
import { emptyNoteForm } from '../util/notesUtil';
// IMPORT ICONS FROM LUCIDE-REACT
import { Asterisk, RotateCcw, Save } from 'lucide-react';
// NotePadForm component
/*Form to create a new note
POST request*/
export default function NotePadForm(
  {//PROPS PASSED FROM PARENT COMPONENT (NotePad.js)
    addNote,
    loading,
    username = '',
    defaultLanguage = '',
    notebooks = [],
    tags = []// The user's existing tags from GET /tag/fetchTags
  }) {
  const [formData, setFormData] = useState(emptyNoteForm)
  const [content, setContent] = useState(''); // TipTap HTML, sent as `content` on save
  const [editorKey, setEditorKey] = useState(0)// Changing the key remounts NoteEditor so it clears

  const handleInputChange = (event) => {
    const { name, value, type, checked } = event.target;// Get the input name and value from the changed field
    setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  // Tag names currently in the TAG input, lowercased to match how the server stores them
  const selectedTagNames = formData.tags.split(',').map((tag) => tag.trim().toLowerCase()).filter(Boolean)

  // Adds an existing tag picked from the dropdown to the comma separated TAG input
  const handleTagSelect = (event) => {
    const name = event.target.value;
    if (!name || selectedTagNames.includes(name)) return;
    setFormData((prev) => ({ ...prev, tags: [...selectedTagNames, name].join(', ') }))
  }

  const resetForm = () => {
    setFormData(emptyNoteForm)
    setContent('')
    setEditorKey((prev) => prev + 1)
  }

  // Build the request body in the shape POST /notes/addNote expects
  const buildNote = () => ({
    title: formData.title.trim(),
    content,
    language: formData.language || defaultLanguage,
    notebook: formData.notebook || null,
    tags: formData.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
    isPinned: formData.isPinned
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    // Conditional rendering to check the note has text, as the editor is not a native input
    if (!content.trim()) {
      alert('Please enter the note text before saving.')
      return
    }
    const success = await addNote(buildNote())
    if (success) resetForm()
  }

  //Function to clear form
  const clearForm = () => {
    const confirmClear = window.confirm('Are you sure you want to clear the form?');
    if (!confirmClear) return;
    resetForm()
  }

  //=======================JSX RENDERING=======================================
  return (
    <form id='notePadForm' method='POST' onSubmit={handleSubmit}>
      <div id='formHeadingBlock'>
        <h3 id='formHeading'>CREATE NEW NOTE</h3>
      </div>
      <div id='notePadInput'>
     {/* GROUP 1 */}
<fieldset id='notePadGroup1'>
          <legend>TITLE</legend>
          {/* STACK ONE */}
          <Stack direction="horizontal" gap={3} id='notePadStack1'>
      <div className="p-2" id='notePadBlock1'>
      <label className='notePadLabel' htmlFor='noteTitleInput'>TITLE:</label>
        <div className='inputDiv'>
          <input
            className='input'
            id='noteTitleInput'
            type='text'
            required
            maxLength={200}
            placeholder='TITLE'
            name='title'
            value={formData.title}
            onChange={handleInputChange}
            // ARIA ATTRIBUTES:
            aria-required='true'
          />
          <small> <Asterisk color="#C22419" fontWeight={700} size={12} aria-hidden='true' focusable='false'/></small>
        </div>
      </div>
      {/* Hidden Readonly input */}
      <div className="p-2 ms-auto" id='notePadBlock2'>
        
        <div className='inputDiv' hidden>
        <label className='notePadLabel' htmlFor='noteUsername'>USERNAME:</label>
          <input
            className='input'
            id='noteUsername'
            readOnly
            placeholder='USERNAME'
            name='username'
            value={username}
            // ARIA ATTRIBUTES:
            aria-readonly='true'
            />
            <small> <Asterisk color="#C22419" fontWeight={700} size={12} aria-hidden='true' focusable='false'/></small>

        </div>
      </div>
      <div className="p-2" id='notePadBlock3'>
        <label className='notePadLabel' htmlFor='newNoteDate' hidden>DATE:</label>
        <div className='inputDiv'>
        <input
          className='input'
          id='newNoteDate'
          required
          readOnly
          placeholder=''
          type='date'
          // The server sets createdAt, so this only shows the date the note is made
          value={TODAY}
          // ARIA ATTRIBUTES:
          aria-required='true'
          aria-readonly='true'
        />
        <small> <Asterisk color="#C22419" fontWeight={700} size={12} aria-hidden='true' focusable='false'/></small>
        </div>
      </div>
    </Stack>
        </fieldset>
        {/* GROUP 2 */}
        <fieldset id='notePadGroup2'>
        <legend>Notes Details</legend>
          <Stack direction="horizontal" gap={3} id='notePadStack2'>
      <div className="p-2" id='noteTextBlock'>
          <label className='notePadLabel'>NOTE:</label>
          <NoteEditor key={editorKey} content={content} onChange={setContent} />
           <small> <Asterisk color="#C22419" fontWeight={700} size={12} aria-hidden='true' focusable='false'/></small>
      </div>
      <div className="p-2 ms-auto"/>
      <div className="vr" />
      <div className="p-2">
       <label className='notePadLabel' htmlFor='noteLanguageInput'>LANGAUGE:</label>
        <div className='inputDiv'>
          <select
          className='input'
          id='noteLanguageInput'
          required
          name='language'
          value={formData.language || defaultLanguage}
          onChange={handleInputChange}
          // ARIA ATTRIBUTES:
          aria-required='true'
          >
            <option value=''>SELECT</option>
            {languageData.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.name}
              </option>
            ))}
          </select>
          <Button
          variant="outline-secondary"
          >DETECT</Button>
          <small> <Asterisk color="#C22419" fontWeight={700} size={12} aria-hidden='true' focusable='false'/></small>
        </div>
        <div className='noteInputDiv'>
          <label className='notePadLabel' htmlFor='noteNotebookInput'>NOTE BOOK:</label>
          <select
          className='input'
          id='noteNotebookInput'
          name='notebook'
          value={formData.notebook}
          onChange={handleInputChange}
          >
            <option value=''>SELECT</option>
            {notebooks.map((notebook) => (
              <option key={notebook._id} value={notebook._id}>
                {notebook.name}
              </option>
            ))}
          </select>
        </div>
        <div className='noteInputDiv'>
          <label className='notePadLabel' htmlFor='noteTagsInput'>TAG:</label>
          <input
          className='input'
          id='noteTagsInput'
          type='text'
          placeholder='TAG, TAG'
          title='Separate tags with commas'
          name='tags'
          value={formData.tags}
          onChange={handleInputChange}
          />
          <select
          className='input'
          id='noteTagSelect'
          value=''// Always shows "ADD TAG"; picking a tag appends it to the input above
          onChange={handleTagSelect}
          disabled={tags.length === 0}
          // ARIA ATTRIBUTES:
          aria-label='ADD AN EXISTING TAG'
          >
            <option value=''>ADD TAG</option>
            {tags
              .filter((tag) => !selectedTagNames.includes(tag.name))
              .map((tag) => (
                <option key={tag._id} value={tag.name}>
                  {tag.name}
                </option>
              ))}
          </select>
        </div>
        <div id='checkBoxInputDiv'>
          <label className='notePadLabel' htmlFor='notePinnedInput'>IS PINNED:</label>
          <input
            type='checkbox'
            id='notePinnedInput'
            name='isPinned'
            checked={formData.isPinned}
            onChange={handleInputChange}
          />
        </div>
      </div>
    </Stack>
        </fieldset>
      </div>
         <Stack direction="horizontal" gap={3}>
      <div className="p-2">
        <p className='infoMsg' aria-live='polite' aria-hidden='true'>
          <small><Asterisk color="#C22419" fontWeight={700} size={12} aria-hidden='true' focusable='false' /> Indicates required information</small>
        </p>
      </div>
      <div className="p-2 ms-auto">

      </div>
      <div className="p-2" id='notePadBtnBlock'>
         <Button
        variant='light'
        type='submit'
        id='saveNoteBtn'
        disabled={loading}
        // ARIA ATTRIBUTES
        aria-label='SAVE NOTE'
        >
          {loading ? 'SAVING...' : 'SAVE'} <Save fontWeight={700} aria-hidden='true' focusable='false'/>
        </Button>
       <Button
       variant='danger'
       id='clearFormBtn'
       onClick={clearForm}
       disabled={loading}
      type='button'
      // ARIA ATTRIBUTES:
      aria-label='RESET FORM'
       >
        <RotateCcw aria-hidden='true' focusable='false'/> RESET
       </Button>
      </div>
    </Stack>

    </form>
  )
}
