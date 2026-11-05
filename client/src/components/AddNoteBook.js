import React from 'react'
import '../css/componentCss/AddNotebook.css'
import '../css/componentCss/FormSetup.css'
import Stack from 'react-bootstrap/Stack';
import { Asterisk, RotateCcw, Save } from 'lucide-react';
import Button from 'react-bootstrap/Button';
// AddNoteBook component
/*Form to create a new notebook
POST request*/
export default function AddNoteBook() {
  return (
    <form id='addNoteBookForm'>
      <div id='formHeadingBlock'>
        <h3 id='formHeading'>CREATE NEW NOTEBOOK</h3>
      </div>
      <div id='noteBookInput'>
        <fieldset id='noteBookGroup1'>
          <legend>NOTEBOOK DETAILS</legend>
          <Stack direction="horizontal" gap={3} id='noteBookStack1'>
            <div className="p-2" id='noteBookBlock1'>
              <label className='notePadLabel' htmlFor='noteBookNameInput'>NAME:</label>
              <div className='inputDiv'>
                <input
                  className='input'
                  id='noteBookNameInput'
                  placeholder='NOTEBOOK NAME'
                  required
                  maxLength={80}
                  // name='name'
                  // value={}
                  // onChange={}
                  // ARIA ATTRIBUTES:
                  aria-required='true'
                />
                <small> <Asterisk color="#C22419" fontWeight={700} size={12} aria-hidden='true' focusable='false'/></small>
              </div>
            </div>
            <div className="p-2 ms-auto" id='noteBookBlock2'>
              <label className='notePadLabel' htmlFor='noteBookColourInput'>COLOUR:</label>
              <div className='inputDiv'>
                <input
                  className='input'
                  id='noteBookColourInput'
                  type='color'
                  defaultValue='#1F4E79'
                  // name='colour'
                  // value={}
                  // onChange={}
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
        <div className="p-2 ms-auto"/>
        <div className="p-2" id='noteBookBtnBlock'>
          <Button
            variant='light'
            type='submit'
            id='saveNoteBookBtn'
            // ARIA ATTRIBUTES
          >
            SAVE <Save fontWeight={700}/>
          </Button>
          <Button
            variant='danger'
            id='clearNoteBookFormBtn'
            type='button'
            // onClick={}
            // ARIA ATTRIBUTES:
          >
            <RotateCcw/> RESET
          </Button>
        </div>
      </Stack>
    </form>
  )
}
