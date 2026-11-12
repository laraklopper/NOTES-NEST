//AddNotebookForm.js
// IMPORT REQUIRED MODULES AND PACKAGES
import React, { useState } from 'react'
// IMPORT CSS STYLESHEETS
import '../css/componentCss/AddNotebook.css'
import '../css/componentCss/FormSetup.css'
// IMPORT BOOTSTRAP COMPONENTS
import Stack from 'react-bootstrap/Stack';
import Button from 'react-bootstrap/Button';
// IMPORT ICONS FROM LUCIDE-REACT
import { Asterisk, RotateCcw, Save } from 'lucide-react';


const DEFAULT_COLOUR = '#1F4E79'// Matches the notebookSchema default
// AddNoteBook component
/*Form to create a new notebook
POST request*/
export default function AddNoteBook(//Export default AddNoteBook.js function component
  {//PROPS PASSED FROM PARENT COMPONENT (NotePad.js)
    addNotebook,
    loading,
    notebooks = []
  }) {
    // ==========STATE VARIABLES===================
  const [name, setName] = useState('')
  const [colour, setColour] = useState(DEFAULT_COLOUR)

  const handleSubmit = async (e) => {
    e.preventDefault()
    // Conditional rendering to check the name is not only spaces (required only checks for empty)
    if (!name.trim()) {
      alert('Please enter a notebook name.')
      return
    }
    const success = await addNotebook({ name: name.trim(), colour })
    if (success) {
      setName('')
      setColour(DEFAULT_COLOUR)
    }
  }

  //Function to clear form
  const clearForm = () => {
    const confirmClear = window.confirm('Are you sure you want to clear the form?');
    if (!confirmClear) return;
    setName('')
    setColour(DEFAULT_COLOUR)
  }

  // ==========JSX RENDERING=================
  return (
    <form id='addNoteBookForm' method='POST' onSubmit={handleSubmit}>
      <div id='formHeadingBlock'>
        <h3 id='formHeading'>CREATE NEW NOTEBOOK</h3>
      </div>
      <div id='noteBookInput'>
        <fieldset id='noteBookGroup1'>
          <legend>NOTEBOOK DETAILS</legend>
           <Stack gap={3} id='noteBookStack1'>
    <div className="p-2" id='noteBookBlock1'> 
            {/* NOTEBOOK NAME: value={name} */}
              <label className='notePadLabel' htmlFor='noteBookNameInput'>NAME:</label>
              <div className='inputDiv'>
                <input
                  className='input'
                  id='noteBookNameInput'
                  type='text'
                  placeholder='NOTEBOOK NAME'
                  required
                  maxLength={80}
                  name='name'
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  // ARIA ATTRIBUTES:
                  aria-required='true'
                />
                <small> <Asterisk color="#C22419" fontWeight={700} size={12} aria-hidden='true' focusable='false'/></small>
              </div>
            </div>
       <div className="p-2" id='noteBookBlock2'>
       {/* COLOUR:  value={colour} */}
              <label className='notePadLabel' htmlFor='noteBookColourInput'>COLOUR:</label>
              <div className='inputDiv'>
                <input
                  className='input'
                  id='noteBookColourInput'
                  type='color'
                  name='colour'
                  value={colour}
                  onChange={(e) => setColour(e.target.value)}
                //   ARIA ATTRIBUTES:
                aria-required='false'
                />
              </div>
            </div>
    </Stack>
        </fieldset>
      </div>
      {/* -------END OF INPUT------------ */}
      <Stack gap={3} id='addNotebookBtnStack'>
        <div className="p-2" id='requiredInputBlock'>
            <span className='reqInfoSpan'>
            <small><Asterisk color="#C22419" fontWeight={700} size={14} aria-hidden='true' focusable='false' /> </small>
            <p className='reqInfo'>Indicates required information</p>
            </span>
        </div>
       <div className="p-2" id='noteBookBtnBlock'>
          <Button
            variant='light'
            type='submit'
            id='saveNoteBookBtn'
            disabled={loading}
            // ARIA ATTRIBUTES
            aria-label='SAVE NOTEBOOK'
            aria-disabled={loading ? 'true' : 'false'}
          >
            {loading ? 'SAVING...' : 'SAVE'} <Save fontWeight={700} aria-hidden='true' focusable='false'/>
          </Button>
          <Button
            variant='danger'
            id='clearFormBtn'
            type='button'
            onClick={clearForm}
            disabled={loading}
            // ARIA ATTRIBUTES:
            aria-label='RESET FORM'
          >
            <RotateCcw aria-hidden='true' focusable='false'/> RESET
          </Button>
        </div>
        {/* NOTE BOOK LIST */}
        <div className="p-2" id='noteBookListBlock'>
          <h4 id='noteBookListHeading'>YOUR NOTEBOOKS</h4>
          {notebooks.length === 0 ? (
            <p className='infoMsg'>You have no notebooks yet.</p>
          ) : (
            <ul id='noteBookList'>
              {notebooks.map((notebook) => (
                <li key={notebook._id} className='noteBookListItem'>
                  <span
                    className='noteBookSwatch'
                    style={{ display: 'inline-block', width: '0.8em', height: '0.8em', marginRight: '0.4em', backgroundColor: notebook.colour }}
                    aria-hidden='true'
                  />
                  {notebook.name} ({notebook.noteCount})
                  
                </li>
              ))}
            </ul>
          )}
        </div>
    </Stack>
    </form>
  )
}
