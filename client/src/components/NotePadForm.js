//NotePadForm.js
//IMPORT REQUIRED MODULES AND PACKAGES
import React, { useState } from 'react'
// IMPORT CSS STYLESHEETS
import '../css/componentCss/NotesForm.css'
// IMPORT BOOTSTRAP COMPONENTS
import Stack from 'react-bootstrap/Stack';
import Button from 'react-bootstrap/Button';
// IMPORT UTILITY FUNCTIONS
import languageData from '../util/languageData';
import { TODAY } from '../util/dateFunctions';
import { emptyNoteForm, textToHtml } from '../util/notesUtil';
import { LANGUAGE_NAMES, MAX_LENGTH, MIN_DETECT_CHARS } from '../util/languageFunc';
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
  const [detecting, setDetecting] = useState(false)// True while POST /detect is in flight

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

  //========DETECT LANGUAGE REQUEST===============
  /* Sends the note text to POST /api/language/translate/v2/detect and sets the
  LANGUAGE select to the detected language */
  const detectLanguage = async () => {
    const text = formData.content.trim();
    if (text.length < MIN_DETECT_CHARS) {
      alert(`Please enter at least ${MIN_DETECT_CHARS} characters of note text to detect the language.`)
      return
    }
    setDetecting(true)
    try {
      // The browser sends the JWT cookie with the request
      const response = await fetch('/api/language/translate/v2/detect', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        // The server caps detection text at MAX_LENGTH, and the start of the note is enough to go on
        body: JSON.stringify({ sourceText: text.slice(0, MAX_LENGTH) })
      })
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || 'Failed to detect language')
      }
      if (!data.language) {
        alert('The language of this note could not be detected.')
        return
      }
      /* The provider can return a region-qualified code (e.g. 'zh-CN') that is not
      in the dropdown, so fall back to the base code ('zh') before giving up */
      const baseCode = data.language.split('-')[0];
      const code = LANGUAGE_NAMES[data.language] ? data.language : (LANGUAGE_NAMES[baseCode] ? baseCode : null);
      if (!code) {
        alert(`Detected "${data.name || data.language}", which is not in the language list.`)
        return
      }
      setFormData((prev) => ({ ...prev, language: code }))
      if (!data.isReliable) {
        alert(`Detected ${LANGUAGE_NAMES[code]} with low confidence. Please check the selected language.`)
      }
    } catch (error) {
      console.error('[ERROR: NotePadForm.js] Language detection failed:', error.message);
      alert(error.message || 'An error occurred while detecting the language.')
    } finally {
      setDetecting(false)
    }
  }

  const resetForm = () => {
    setFormData(emptyNoteForm)
  }

  // Build the request body in the shape POST /notes/addNote expects
  const buildNote = () => ({
    title: formData.title.trim(),
    content: textToHtml(formData.content),// The server stores note content as HTML
    language: formData.language || defaultLanguage,
    notebook: formData.notebook || null,
    tags: formData.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
    isPinned: formData.isPinned
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    // `required` blocks an empty textarea, but not one that only holds spaces
    if (!formData.content.trim()) {
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
    <form id='notePadForm' method='POST' onSubmit={handleSubmit} aria-labelledby='formTitle' aria-busy={loading}>
    {/* --------Screen Reader Heading--------- */}
    <p className='visually-hidden' id='formTitle'>CREATE NEW NOT FORM</p>
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
        {/* USERNAME */}
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
          <label className='notePadLabel' htmlFor='noteTextInput'>NOTE:</label>
          <textarea
            className='input notesTextArea'
            id='noteTextInput'
            required
            placeholder='NOTE TEXT'
            name='content'
            value={formData.content}
            onChange={handleInputChange}
            // ARIA ATTRIBUTES:
            aria-required='true'
          />
           <small> <Asterisk color="#C22419" fontWeight={700} size={12} aria-hidden='true' focusable='false'/></small>
      </div>
      <div className="vr" style={{width:'2px', color : '#000',}}/>
      <div className="p-2 ms-auto">
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
          {/* MAP ALL AVAILBLE LANGUAGES */}
            <option value=''>SELECT</option>
            {languageData.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.name}
              </option>
            ))}
          </select>
          {/* Button to detect language */}
          <Button
          variant="outline-secondary"
          type='button'// Stops the button submitting the form
          id='detectLanguageBtn'
          onClick={detectLanguage}
          disabled={detecting || loading || !formData.content.trim()}
          // ARIA ATTRIBUTES:
          aria-label='DETECT NOTE LANGUAGE'
          aria-busy={detecting}
          >{detecting ? 'DETECTING...' : 'DETECT'}</Button>
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
          {/* MAP ALL NOTEBOOKS */}
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
