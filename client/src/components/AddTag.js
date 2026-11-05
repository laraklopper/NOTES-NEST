import React from 'react'
import '../css/componentCss/NotesForm.css'
import Stack from 'react-bootstrap/Stack';
import { Asterisk, RotateCcw, Save } from 'lucide-react';
import Button from 'react-bootstrap/Button';
// AddTag component
/*Form to create a new tag
POST request*/
export default function AddTag() {
  return (
    <form id='addTagForm'>
      <div id='formHeadingBlock'>
        <h3 id='formHeading'>CREATE NEW TAG</h3>
      </div>
      <div id='tagInput'>
        <fieldset id='tagGroup1'>
          <legend>TAG DETAILS</legend>
          <Stack direction="horizontal" gap={3} id='tagStack1'>
            <div className="p-2" id='tagBlock1'>
              <label className='notePadLabel' htmlFor='tagNameInput'>NAME:</label>
              <div className='inputDiv'>
                <input
                  className='input'
                  id='tagNameInput'
                  placeholder='TAG NAME'
                  required
                  maxLength={30}
                  // name='name'
                  // value={}
                  // onChange={}
                  // ARIA ATTRIBUTES:
                  aria-required='true'
                />
                <small> <Asterisk color="#C22419" fontWeight={700} size={12} aria-hidden='true' focusable='false'/></small>
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
        <div className="p-2" id='tagBtnBlock'>
          <Button
            variant='light'
            type='submit'
            id='saveTagBtn'
            // ARIA ATTRIBUTES
          >
            SAVE <Save fontWeight={700}/>
          </Button>
          <Button
            variant='danger'
            id='clearTagFormBtn'
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
