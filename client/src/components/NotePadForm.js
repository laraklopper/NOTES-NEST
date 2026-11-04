import React from 'react'
import '../css/componentCss/NotesForm.css'
import Stack from 'react-bootstrap/Stack';
import { Asterisk, RotateCcw, Save } from 'lucide-react';
import Button from 'react-bootstrap/Button';
import languageData from '../util/languageData';
// NotePadForm component 
/*Form to create a new note
POST request*/
export default function NotePadForm() {
  return (
    <form id='notePadForm'>
      <div id='formHeadingBlock'>
        <h3 id='formHeading'>CREATE NEW NOTE</h3>
      </div>
      <div id='notePadInput'>
     
<fieldset id='notePadGroup1'>
          <legend>TITLE</legend>
          {/* STACK ONE */}
          <Stack direction="horizontal" gap={3} id='notePadStack1'>
      <div className="p-2" id='notePadBlock1'>
      <label className='notePadLabel'>TITLE:</label>
        <div className='inputDiv'>
          <input
            className='input'
            id='noteTitleInput'
            placeholder='TITLE'
          />
          <small> <Asterisk color="#C22419" fontWeight={700} size={12} aria-hidden='true' focusable='false'/></small>
        </div>
      </div>
      {/* Hidden Readonly input */}
      <div className="p-2 ms-auto" id='notePadBlock2'>
        <label className='notePadLabel' >USERNAME:</label>
        <div className='inputDiv'>
          <input
            className='input'
            id='noteUsername'
            readOnly
            // placeholder=''//currentUser.username
            name='username'
            // value={}
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
          // name=''
          // value={}
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
       
          <textarea
            className='notesTextArea'
            id='noteTextInput'
            placeholder='NOTE TEXT'
            // name=''
            // value={}
            // onChange={}
          />
           <small> <Asterisk color="#C22419" fontWeight={700} size={12} aria-hidden='true' focusable='false'/></small>
      </div>
      <div className="p-2 ms-auto"/>
      <div className="vr" />
      <div className="p-2">
       <label className='notePadLabel'>LANGAUGE:</label>
        <div className='inputDiv'>
          <select
          className='input'
          // name=''
          // value={}
          // onChange={}
          >
            <option>SELECT</option>
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
          <label className='notePadLabel'>NOTE BOOK:</label>
          <select
          className='input'
          // name=''
          // value={}
          // onChange={}

          >
            <option>SELECT</option>
          </select>
        </div>
        <div className='noteInputDiv'>
          <label className='notePadLabel'>TAG:</label>
          <input
          className='input'/>
        </div>
        <div id='checkBoxInputDiv'>
          <label className='notePadLabel'>IS PINNED:</label>
          <input
            type='checkBox'
            // name=''
            // value={}
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
        // ARIA ATTRIBUTES
        >
          SAVE <Save fontWeight={700}/>
        </Button>
       <Button
       variant='danger'
       id='clearFormBtn'
      //  onClick={}
      type='button'
      // ARIA ATTRIBUTES:
       >
        <RotateCcw/> RESET
       </Button>
      </div>
    </Stack>
      
    </form>
  )
}
