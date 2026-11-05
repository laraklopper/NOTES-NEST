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
           <Stack gap={3} id='noteBookStack1'>
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
       <div className="p-2" id='noteBookBlock2'>
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
                //   ARIA ATTRIBUTES:
                aria-required='false'
                />
              </div>
            </div>
    </Stack>
        </fieldset>
      </div>
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
            // ARIA ATTRIBUTES
            role='button'
          >
            SAVE <Save fontWeight={700} aria-hidden='true' focusable='false'/>
          </Button>
          <Button
            variant='danger'
            id='clearFormBtn'
            type='button'
            // onClick={}
            // ARIA ATTRIBUTES:
          >
            <RotateCcw aria-hidden='true' focusable='false'/> RESET
          </Button>
        </div>
    </Stack>
      <Stack gap={3} >
      
        <div className="p-2 ms-auto"/>
       
      </Stack>
    </form>
  )
}
