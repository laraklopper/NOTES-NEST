//EditNoteForm.js
//IMPORT REQUIRED MODULES AND PACKAGES
import React, { useEffect, useMemo, useState } from 'react'
// IMPORT CSS STYLESHEETS
import '../css/componentCss/FormSetup.css'
import '../css/componentCss/NotesForm.css'
import '../css/componentCss/NoteEditor.css'
// IMPORT BOOTSTRAP COMPONENTS
import Stack from 'react-bootstrap/Stack';
import Button from 'react-bootstrap/Button';
// IMPORT UTILITY FUNCTIONS
import languageData from '../util/languageData';
import { noteToForm, textToHtml } from '../util/notesUtil';
// IMPORT ICONS FROM LUCIDE-REACT
import { Asterisk, RotateCw } from 'lucide-react';

// Splits the comma separated TAG input into lowercase names (how the server stores them)
const splitTags = (tags) => tags.split(',').map((tag) => tag.trim().toLowerCase()).filter(Boolean)

// EditNoteForm component
/*Form to edit the note selected in NotesList
PATCH request (sent by updateNote in Notes.js)*/
export default function EditNoteForm(
    {//PROPS PASSED FROM PARENT COMPONENT (Notes.js)
        note,// The selected note from GET /notes/fetchNotes
        updateNote,
        loading = false,
        notebooks = [],// The user's notebooks (no fetch route yet, so only the note's current notebook shows)
        tags = []// The user's existing tags from GET /tag/fetchTags
    }) {
    // The note's saved values, used to fill the form and to work out what changed
    const savedValues = useMemo(() => noteToForm(note), [note])
    const [editNoteData, setEditNoteData] = useState(savedValues)

    const formTitleId = 'editNoteFormTitle'

    // Refill the form when a different note is selected or the note is refreshed after saving
    useEffect(() => {
        setEditNoteData(savedValues)
    }, [savedValues])

    // Tag names currently in the TAG input
    const selectedTagNames = splitTags(editNoteData.tags)

    /* Notebook options: the user's notebooks plus the note's current one,
    so the select can show it even before the notebooks list is loaded */
    const notebookOptions = note?.notebook && !notebooks.some((nb) => nb._id === note.notebook._id)
        ? [note.notebook, ...notebooks]
        : notebooks

    // Date the note was created, in the YYYY-MM-DD format a date input needs
    const createdDate = note?.createdAt ? new Date(note.createdAt).toISOString().split('T')[0] : ''

    /* Build the PATCH body with only the fields that were changed.
    Content is only sent if the text changed, so untouched notes keep any rich formatting */
    const buildChanges = () => {
        const changes = {}
        if (editNoteData.title.trim() !== savedValues.title) changes.title = editNoteData.title.trim()
        if (editNoteData.content.trim() !== savedValues.content) changes.content = textToHtml(editNoteData.content)
        if (editNoteData.language !== savedValues.language) changes.language = editNoteData.language
        if (editNoteData.notebook !== savedValues.notebook) changes.notebook = editNoteData.notebook || null
        if (selectedTagNames.join(',') !== splitTags(savedValues.tags).join(',')) changes.tags = selectedTagNames
        if (editNoteData.isPinned !== savedValues.isPinned) changes.isPinned = editNoteData.isPinned
        return changes
    }

     //==============EVENT LISTENERS===================
    const handleInputChange = (event) => {
        const { name, value, type, checked } = event.target;// Get the input name and value from the changed field
        setEditNoteData((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }))
    }

    // Adds an existing tag picked from the dropdown to the comma separated TAG input
    const handleTagSelect = (event) => {
        const name = event.target.value;
        if (!name || selectedTagNames.includes(name)) return;
        setEditNoteData((prev) => ({ ...prev, tags: [...selectedTagNames, name].join(', ') }))
    }

    //Function to submit form
    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!note) return
        // `required` blocks an empty textarea, but not one that only holds spaces
        if (!editNoteData.content.trim()) {
            alert('Please enter the note text before saving.')
            return
        }
        const changes = buildChanges()
        if (Object.keys(changes).length === 0) {
            alert('No changes to save.')
            return
        }
        await updateNote(note._id, changes)// Notes.js refreshes the note, which refills this form
    }

    //Function to undo unsaved changes
    const resetForm = () => {
        const confirmReset = window.confirm(// Ask the user to confirm before discarding their changes
            'Are you sure you want to undo your changes?'
        );
        if (!confirmReset) return;// Stop if the user clicks Cancel
        setEditNoteData(savedValues)
    }

    //======================JSX RENDERING=========================
  return (
    <form id='updateNoteForm' method='PATCH' onSubmit={handleSubmit} aria-busy={loading} aria-labelledby={formTitleId}>
        <div id='formHeadingBlock'>
        {/* -------------Screen Reader Heading------------------- */}
            <p className='visually-hidden' id={formTitleId}>EDIT SELECTED NOTE FORM</p>
            <h3 id='formHeading'>EDIT NOTE</h3>
        </div>
        {/* =======INPUT=========== */}
        <div id='editNoteInput'>
            {/* GROUP 1: */}
            <fieldset id='editNoteGroup1' aria-describedby='editNoteGroup1Desc'>
            {/* -----Screen Reader Heading */}
            <p className='visually-hidden' id='editNoteGroup1Desc'>Edit note title</p>
                <legend>EDIT TITLE</legend>
                {/* STACK 1 */}
                <Stack direction="horizontal" gap={3} id='editNoteStack1'>
                {/* TITLE */}
                <div className="p-2" id='editTitleBlock'>
                    <label className='editNoteLabel' htmlFor='editNoteTitleInput'>TITLE:</label>
                    <input
                        className='input'
                        type='text'
                        id='editNoteTitleInput'
                        maxLength={200}
                        placeholder='TITLE'
                        name='title'
                        value={editNoteData.title}
                        onChange={handleInputChange}
                    />
                </div>
                <div className="p-2 ms-auto"/>
                <div className="p-2">
                    <div className='inputDiv'>
                    <label className='notePadLabel' htmlFor='editNoteDate'>DATE:</label>
                        <input
                            type='date'
                            className='input'
                            id='editNoteDate'
                            readOnly
                            // The date the note was created; it cannot be edited
                            value={createdDate}
                            // ARIA ATTRIBUTES:
                            aria-label='Date added'
                            aria-readonly='true'
                        />
                    </div>
                </div>
                </Stack>
            </fieldset>
            {/* GROUP 2 */}
            <fieldset id='editNoteGroup2'>
            <legend>EDIT NOTE DETAILS</legend>
                <Stack direction="horizontal" gap={3} id='editNoteStack2'>
                  <div className="p-2" id='editNoteTextBlock'>
                          <label className='notePadLabel' htmlFor='editNoteTextInput'>NOTE:</label>
                          <textarea
                            className='input notesTextArea'
                            id='editNoteTextInput'
                            required
                            placeholder='NOTE TEXT'
                            name='content'
                            value={editNoteData.content}
                            onChange={handleInputChange}
                            // ARIA ATTRIBUTES:
                            aria-required='true'
                          />
                          <small> <Asterisk color="#C22419" fontWeight={700} size={12} aria-hidden='true' focusable='false'/></small>
                      </div>
                <div className="ms-auto" id='editNoteDetailsBlock'>
                    <div className='noteInputDiv'>
                        <label className='notePadLabel' htmlFor='editLanguageInput'>EDIT LANGUAGE:</label>
                        <div className='inputDiv'>
                            <select
                            className='input'
                            id='editLanguageInput'
                            required
                            name='language'
                            value={editNoteData.language}
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
                            {/* BUTTON to detect language */}
                            <Button
                                variant="outline-secondary"
                                type='button'
                            >
                            DETECT</Button>
                        </div>
                    </div>
                    <div className='noteInputDiv'>
                        <label className='editNoteLabel' htmlFor='editNotebookInput'>NOTEBOOK:</label>
                            <select
                            className='input'
                            id='editNotebookInput'
                            name='notebook'
                            value={editNoteData.notebook}
                            onChange={handleInputChange}
                            >
                                <option value=''>NO NOTEBOOK</option>
                                {notebookOptions.map((notebook) => (
                                    <option key={notebook._id} value={notebook._id}>
                                        {notebook.name}
                                    </option>
                                ))}
                            </select>
                    </div>
                    <div className='noteInputDiv'>
                        <label className='notePadLabel' htmlFor='editNoteTagsInput'>TAG:</label>
                        <input
                            className='input'
                            id='editNoteTagsInput'
                            type='text'
                            placeholder='TAG, TAG'
                            title='Separate tags with commas'
                            name='tags'
                            value={editNoteData.tags}
                            onChange={handleInputChange}
                        />
                        <select
                        className='input'
                        id='editNoteTagSelect'
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
                        <label className='notePadLabel' htmlFor='editNotePinnedInput'>IS PINNED:</label>
                        <input
                        type='checkbox'
                        id='editNotePinnedInput'
                            name='isPinned'
                            checked={editNoteData.isPinned}
                            onChange={handleInputChange}
                        />
                    </div>
                </div>
                </Stack>
            </fieldset>
        </div>
        {/* STACK 3 */}
         <Stack direction="horizontal" gap={3} id='editNoteBtnStack'>
      <div className="p-2">
        <p className='infoMsg' aria-hidden='true'>
          <small><Asterisk color="#C22419" fontWeight={700} size={12} aria-hidden='true' focusable='false' /> Indicates required information</small>
        </p>
      </div>
      <div className="p-2 ms-auto">
        <Button
        variant='warning'
        id='submitEditNoteBtn'
        type='submit'
        disabled={loading}
        // ARIA ATTRIBUTES
        aria-label='SAVE NOTE CHANGES'
        >
            {loading ? 'SAVING...' : 'EDIT NOTE'}
        </Button>
      </div>
      <div className="vr" />
      <div className="p-2">
        <Button
            variant='danger'
            id='clearFormBtn'
            type='button'
            onClick={resetForm}
            disabled={loading}
            // ARIA ATTRIBUTES:
            aria-label='UNDO CHANGES'
            >
                <RotateCw aria-hidden='true' focusable='false'/> RESET
            </Button>
      </div>
    </Stack>

    </form>
  )
}
