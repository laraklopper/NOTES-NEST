//EditNoteForm.js
//IMPORT REQUIRED MODULES AND PACKAGES
import React, { useEffect, useMemo, useState } from 'react'
// IMPORT CSS STYLESHEETS
import '../css/componentCss/FormSetup.css'
import '../css/componentCss/NoteEditor.css'
// IMPORT BOOTSTRAP COMPONENTS
import Stack from 'react-bootstrap/Stack';
import Button from 'react-bootstrap/Button';
// IMPORT UTILITY FUNCTIONS
import languageData from '../util/languageData';
import { noteToForm, textToHtml, toLocalDateInput, changeCreatedDay } from '../util/notesUtil';
// IMPORT ICONS FROM LUCIDE-REACT
import { Pin, RotateCw } from 'lucide-react';

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
        notebooks = [],// The user's notebooks from GET /notebooks (passed down by Notes.js)
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

    // Today's local date (YYYY-MM-DD): the latest day a note can be moved to
    const today = toLocalDateInput(new Date())

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
        // Date moved: send the full timestamp so the note shows on the new day in the calendar
        if (editNoteData.createdAt && editNoteData.createdAt !== savedValues.createdAt) {
            changes.createdAt = changeCreatedDay(note.createdAt, editNoteData.createdAt)
        }
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
        // The date picker's max isn't enforced when a date is typed, so check it here too
        if (editNoteData.createdAt && editNoteData.createdAt > today) {
            alert('The note date cannot be in the future.')
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
                {/* GROUP 1: Edit Title + Edit date*/}
                <fieldset id='editNoteGroup1' aria-describedby='editNoteGroup1Desc'>
                    {/* -----Screen Reader Heading---------- */}
                    <legend  className='visually-hidden' id='editNoteGroup1Desc'>EDIT TITLE OR DATE</legend>
                    {/* STACK 1 */}
                    <Stack gap={3} id='editNoteStack1'>
                         {/* TITLE: value={editNoteData.title} */}
                        <div className="p-2" id='editTitleBlock'>
                            <label className='editNoteLabel' htmlFor='editNoteTitleInput'>TITLE:</label>
                            <input
                                className='editNoteInput'
                                type='text'
                                id='editNoteTitleInput'
                                maxLength={200}
                                placeholder='TITLE'
                                name='title'
                                value={editNoteData.title}
                                onChange={handleInputChange}
                                // ARIA ATTRIBUTES:
                                aria-label='Edit Note Title'
                                aria-required='false'
                            />
                        </div>
                        {/* DATE: value={editNoteData.createdAt}: edit the day the note was created
                        (moves it on the calendar). Only past and current dates are allowed */}
                        <div className="p-2" id='editNoteDateBlock'>       
                        <label className='notePadLabel' htmlFor='editNoteDate'>DATE:</label>
                            <div className='inputDiv'>
                                <input
                                    type='date'
                                    className='editNoteInput'
                                    id='editNoteDate'
                                    name='createdAt'
                                    value={editNoteData.createdAt || ''}
                                    max={today}// Blocks future dates in the date picker
                                    onChange={handleInputChange}
                                    // ARIA ATTRIBUTES:
                                    aria-required='false'
                                    aria-label='Edit date added'
                                />
                            </div>
                        </div>
    </Stack>
                </fieldset>
                {/* GROUP 2: note content + edit Language */}
                <fieldset id='editNoteGroup2' aria-labelledby='editNoteSec2'>
                    <legend className='visually-hidden' id='editNoteSec2'>EDIT NOTE DETAILS</legend>
                    <Stack gap={3} id='editNoteStack2'>
                        {/* EDIT NOTE: value={editNoteData.content} */}
                        <div className="p-2" id='editNoteTextBlock'>
                            <label className='notePadLabel' htmlFor='editNoteTextInput'>NOTE:</label>
                            <textarea
                                id='editNoteTextInput'
                                placeholder='NOTE TEXT'
                                name='content'
                                rows={5}
                                value={editNoteData.content}
                                onChange={handleInputChange}
                                // ARIA ATTRIBUTES:
                                aria-required='false'
                            />
                        </div>
                        <div className="p-2" id='editNoteDetailsBlock'>
                        {/* EDIT LANGUAGE:
                        select: value={editNoteData.language} 
                        mappedLanguages: value={lang.code}
                        */}
                            <div className='noteInputDiv'>
                                <label className='notePadLabel' htmlFor='editLanguageInput'>EDIT LANGUAGE:</label>
                                <div className='inputDiv'>
                                    <select
                                        className='editNoteInput'
                                        id='editLanguageInput'
                                        autoComplete=''
                                        name='language'
                                        value={editNoteData.language}
                                        onChange={handleInputChange}
                                        // ARIA ATTRIBUTES:
                                        aria-required='false'
                                    >
                                        <option value=''>SELECT</option>
                                        {languageData.map((lang) => (
                                            <option key={lang.code} value={lang.code}>
                                                {lang.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </Stack>
                </fieldset>
                {/* GROUP 3 */}
                <fieldset id='editNoteGroup3' aria-labelledby='optionalInputGroup'>
                <legend id='optionalInputGroup'>Optional Input</legend>
                {/* STACK 3: edit notebook + edit Tag + edit pinned checkbox */}
                  <Stack gap={3} id='editNoteStack3'>
      <div className="p-2" id='optEditNoteBlock1'>
         {/* NOTEBOOK:  
                            select: value={editNoteData.notebook}
                            mappedNotebook options: value={notebook._id}*/}
                            <div className='noteInputDiv'>
                                <label className='editNoteLabel' htmlFor='editNotebookInput'>NOTEBOOK:</label>
                                <select
                                    className='input'
                                    id='editNotebookInput'
                                    name='notebook'
                                    value={editNoteData.notebook}
                                    onChange={handleInputChange}
                                    // ARIA ATTRIBUTES:
                                    aria-required='false'
                                    aria-label='Edit Note Notebook'
                                >
                                {/* MAP NOTEBOOKS */}
                                    <option value=''>NO NOTEBOOK</option>
                                    {notebookOptions.map((notebook) => (
                                        <option key={notebook._id} value={notebook._id}>
                                            {notebook.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
      </div>
      <div className="p-2" id='optEditNoteBlock2'>
           {/* TAG: 
                            Input:value={editNoteData.tags}
                            mappedTagOptions: value={tag.name}*/}
                            <div className='noteInputDiv'>
                                <label className='notePadLabel' htmlFor='editNoteTagsInput'>TAG:</label>
                                <input
                                    className='editNoteInput'
                                    id='editNoteTagsInput'
                                    type='text'
                                    placeholder='TAG, TAG'
                                    title='Separate tags with commas'
                                    name='tags'
                                    value={editNoteData.tags}
                                    onChange={handleInputChange}
                                    // ARIA ATTRIBUTES:
                                    aria-required='false'
                                    aria-label='Edit Note Tag'
                                />
                                <select
                                    className='editNoteInput'
                                    id='editNoteTagSelect'
                                    value=''// Always shows "ADD TAG"; picking a tag appends it to the input above
                                    onChange={handleTagSelect}
                                    disabled={tags.length === 0}
                                    // ARIA ATTRIBUTES:
                                    aria-label='ADD AN EXISTING TAG'
                                >
                                {/* MAP ALL AVAILABLE TAGS */}
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
      </div>
      <div className="p-2" id='editPinnedBlock'>
         {/* IS PINNED: checked={editNoteData.isPinned} */}
                            <div id='checkBoxInputDiv'>
                                <label className='notePadLabel' htmlFor='editNotePinnedInput'>IS PINNED:</label>
                                <input
                                    type='checkbox'
                                    id='editNotePinnedInput'
                                    name='isPinned'
                                    checked={editNoteData.isPinned}
                                    onChange={handleInputChange}
                                    // ARIA ATTRIBUTES:
                                    aria-label='edit pinned note'
                                    aria-required='false'
                                />
                                <Pin size={16}/>
                            </div>
                        </div>
                        </Stack>
                </fieldset>
            </div>
            {/* STACK 3 */}
            <Stack direction="horizontal" gap={3} id='editNoteBtnStack'>
                <div className="p-2"/>
                <div className="p-2 ms-auto">
                    <Button
                        variant='warning'
                        id='submitEditNoteBtn'
                        type='submit'
                        disabled={loading}
                        // ARIA ATTRIBUTES
                        aria-disabled={loading ? 'true': 'false'}
                        aria-label={loading ? 'SAVING...' : 'SAVE NOTE CHANGES'}
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
                        aria-disabled={loading ? 'true': 'false'}
                    >
                        <RotateCw aria-hidden='true' focusable='false'/> RESET
                    </Button>
                </div>
            </Stack>
        </form>
    )
}
