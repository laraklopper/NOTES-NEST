import React, { useCallback, useState } from 'react'
import '../css/componentCss/FormSetup.css'
import '../css/componentCss/NotesForm.css'
import '../css/componentCss/NoteEditor.css'
// IMPORT BOOTSTRAP COMPONENTS
import Stack from 'react-bootstrap/Stack';
import Button from 'react-bootstrap/Button';
import { Asterisk, RotateCw } from 'lucide-react';
import languageData from '../util/languageData';
import { emptyNoteForm } from '../util/notesUtil';

export default function EditNoteForm({setError, currentUser}) {
    const [editNoteData, setEditNoteData] = useState(emptyNoteForm)
    const [updatingNote, setUpdatingNote] = useState(false)

      const resetForm = () => {
        setEditNoteData(emptyNoteForm)
      }
    const formTitleId = 'editNoteFormTitle'

      const updateNote = useCallback(async () => {
        setError?.();
        setUpdatingNote(true)
      try {
        const token = localStorage.getItem('token')
        const response = await fetch(`http://localhost:3001/notes/:id`,{
          method: 'PATCH',
          mode: 'cors',
          headers: {
            'Content-Type': 'application/json',
            'Authorization' :`Bearer ${token}`
          },
          body: JSON.stringify(
            editNoteData
        )
        })
           const data = await response.json().catch(() => ({}))// Safely parse JSON (avoid crash if server returns non-JSON)

           if(!response.ok){
              const errorMessage = data.message || 'Failed to update user.'
        setError?.(errorMessage)// Store global error
        alert(errorMessage)// Notify the user
        return
           }
           setError?.(null)//clear any existing errors
           alert('Note successfully updated')
      } catch (error) {
        setError()
        // console.error();
        // alert()
      }
     },[editNoteData, setError])

     //==============EVENT LISTENERS===================
     const handleInputChange = (event) => {
    const { name, value, type, checked } = event.target;// Get the input name and value from the changed field
    setEditNoteData((prev) => ({ 
        ...prev, [name]: 
        type === 'checkbox' ? checked : value 
    })
)}

//Function to submit form
    const handleSubmit = (e) => {
        e.preventDefault()
        updateNote()
    }
    //Function to clear form
    const clearForm = () => {
          const confirmClear = window.confirm(// Ask the user to confirm before clearing all input fields
            "Are you sure you want to clear the form?"
        );
        if (!confirmClear) return;// Stop if the user clicks Cancel
        resetForm()
    }
    //======================JSX RENDERING=========================
  return (
    <form id='updateNoteForm' method='PATCH' onSubmit={handleSubmit} aria-labelledby={formTitleId}>
        <div id='formHeadingBlock'>
            <p className='visually-hidden' id={formTitleId}>EDIT SELECTED NOTE FORM</p>
            <h3 id='formHeading'>EDIT NOTE</h3>
        </div>
        {/* =======INPUT=========== */}
        <div id='editNoteInput'>
            {/* GROUP 1: */}
            <fieldset id='editNoteGroup1' aria-describedby='editNoteGroup1'>
            {/* -----Screen Reader Heading */}
            <p className='visually-hidden' id='editNoteGroup1'>Edit note title and hidden input</p>
                <legend>EDIT TITLE</legend>
                {/* STACK 1 */}
                <Stack direction="horizontal" gap={3} id='editNoteStack1'>
                {/* TITLE */}
                <div className="p-2" id='editTitleBlock'>
                    <label className='editNoteLabel'>TITLE:</label>
                    <input
                        className='input'
                        type='text'
                        // id=''
                        placeholder='TITLE'
                        // name=''
                        // value={}
                        onChange={handleInputChange}
                        // ARIA ATTRIBUTES:
                    />
                </div>
                <div className="p-2 ms-auto">
                {/* USERNAME */}
                    <div className='inputDiv' hidden>
                        <label className='notePadLabel' htmlFor='editNoteUsername'>USERNAME:</label>
                        <input
                            className='input'
                            readOnly
                            id='editNoteUsername'
                            placeholder='USERNAME'//currentUser.username
                            // name=''
                            // value={}
                            // ARIA ATTRIBUTES
                            aria-required='true'
                            aria-readonly='true'
                            aria-label='Username'
                        />
                        <small> <Asterisk color="#C22419" fontWeight={700} size={12} aria-hidden='true' focusable='false'/></small>
                    </div>
                </div>
                <div className="p-2">
                    <div className='inputDiv'>
                    <label className='notePadLabel' htmlFor=''>DATE:</label>
                        <input
                            type='date'
                            className='input'
                            required
                            readOnly
                            // name=''
                            // value={}
                            // ARIA ATTRIBUTES:
                            // aria-label=''
                            aria-required='true'
                            aria-readonly='true'
                        />
                         <small><Asterisk color="#C22419" fontWeight={700} size={12} aria-hidden='true' focusable='false'/></small>
                    </div>
                </div>
                </Stack>
            </fieldset>
            {/* GROUP 2 */}
            <fieldset id='editNoteGroup2'> 
            <legend>EDIT NOTE DETAILS</legend>
                <Stack direction="horizontal" gap={3} id='editNoteStack2'>
                  <div className="p-2" id='editNoteTextBlock'>
                          <label className='notePadLabel' htmlFor='noteTextInput'>NOTE:</label>
                          <textarea
                            className='input notesTextArea'
                            id='noteTextInput'
                            placeholder='NOTE TEXT'//set current note text as placeholder or set 'NOTE TEXT' if current text is notfound
                            // name=''
                            // value={}
                            onChange={handleInputChange}
                            // ARIA ATTRIBUTES:
                            // aria-label=''
                          />
                      </div>
                <div className="ms-auto" id='editNoteDetailsBlock'>
                    <div className='noteInputDiv'>
                        <label className='notePadLabel'>EDIT LANGUAGE:</label>
                        <div className='inputDiv'>
                            <select
                            className='input'
                            id='editLanguageInput'
                            // name=''
                            // value={}
                            onChange={handleInputChange}
                            // ARIA ATTRIBUTES:
                            // aria-label=''
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
                            >
                            DETECT</Button>
                        </div>
                    </div>
                    <div className='noteInputDiv'>
                        <label className='editNoteLabel'>NOTEBOOK:</label>
                            <select
                            className='input'
                            >
                            {/* MAP ALL NOTEBOOKS USE THE CURRENT NOTEBOOK AS PLACEHOLDER
                            OR SELECT IF THE NOTE IS NOT PART OF A NOTEBOOK */}
                                <option>SELECT</option>
                            </select>
                       
                    </div>
                    <div>
                        <label className='notePadLabel' htmlFor='noteTagsInput'>TAG:</label>
                        <input
                            className='input'
                            placeholder='TAG, TAG'//currentTag(s) as placeholder or 'TAG, TAG' if none exist
          title='Separate tags with commas'
        //   name=''
        // value={}
        onChange={handleInputChange}
                        />
                        <select
                        className='input'
                        // name=''
                        // value={}
                        onChange={handleInputChange}
                        >
                            <option>ADD TAG</option>
                            {/* MAP TAGS */}
                        </select>
                    </div>
                    <div id='checkBoxInputDiv'>
                        <label className='notePadLabel' htmlFor='notePinnedInput'>IS PINNED:</label>
                        <input
                        type='checkBox'
                        id='notePinnedInput'
                            // name=''
                            // checked={}
                            onChange={handleInputChange}
                            // ARIA ATTRIBUTES
                            // aria-label=''
                            aria-required='false'
                        />
                    </div>
                </div>
                </Stack>
            </fieldset>
        </div>
        {/* STACK 3 */}
         <Stack direction="horizontal" gap={3} id='editNoteBtnStack'>
      <div className="p-2"></div>
      <div className="p-2 ms-auto">
        <Button
        variant='warning'
        id='submitEditNoteBtn'
        type='submit'
        // disabled
        // ARIA ATTRIBUTES
        >
            EDIT NOTE
        </Button>
      </div>
      <div className="vr" />
      <div className="p-2">
        <Button
            variant='danger'
            id='clearFormBtn'
            type='button'
            onClick={clearForm}
            >
                <RotateCw/> CLEAR
            </Button>
      </div>
    </Stack>

    </form>
  )
}
