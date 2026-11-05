import React, { useState } from 'react'
import '../css/componentCss/AddNotebook.css'
import '../css/componentCss/FormSetup.css'
import Stack from 'react-bootstrap/Stack';
import { Asterisk, RotateCcw, Save } from 'lucide-react';
import Button from 'react-bootstrap/Button';
// AddTag component
/*Form to create a new tag
POST request*/
export default function AddTag(
  {//PROPS PASSED FROM PARENT COMPONENT (NotePad.js)
    addTag,
    loading,
    tags = []
  }) {
  const [name, setName] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    // Conditional rendering to check the name is not only spaces (required only checks for empty)
    if (!name.trim()) {
      alert('Please enter a tag name.')
      return
    }
    const success = await addTag(name.trim())
    if (success) setName('')
  }

  //Function to clear form
  const clearForm = () => {
    const confirmClear = window.confirm('Are you sure you want to clear the form?');
    if (!confirmClear) return;
    setName('')
  }
  return (
    <form id='addTagForm' method='POST' onSubmit={handleSubmit}>
      <div id='formHeadingBlock'>
        <h3 id='formHeading'>CREATE NEW TAG</h3>
      </div>
      <div id='tagInput'>
           <Stack gap={3} id='tagStack1'>
      <div className="p-2" id='tagBlock1'>
              <label className='notePadLabel' htmlFor='tagNameInput'>NAME:</label>
              <div className='inputDiv'>
                <input
                  className='input'
                  id='tagNameInput'
                  type='text'
                  placeholder='TAG NAME'
                  required
                  maxLength={30}
                  name='name'
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  // ARIA ATTRIBUTES:
                  aria-required='true'
                />
                <small> <Asterisk color="#C22419" fontWeight={700} size={12} aria-hidden='true' focusable='false'/></small>
              </div>
            </div>
     <div className="p-2">
          <p className='infoMsg' aria-live='polite' aria-hidden='true'>
            <small><Asterisk color="#C22419" fontWeight={700} size={12} aria-hidden='true' focusable='false' /> Indicates required information</small>
          </p>
        </div>
      <div className="p-2" id='tagBtnBlock'>
          <Button
            variant='light'
            type='submit'
            id='saveTagBtn'
            disabled={loading}
            // ARIA ATTRIBUTES
            aria-label='SAVE TAG'
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
      <div className="p-2" id='tagListBlock'>
          <h4 id='tagListHeading'>YOUR TAGS</h4>
          {tags.length === 0 ? (
            <p className='infoMsg'>You have no tags yet.</p>
          ) : (
            <ul id='tagList'>
              {tags.map((tag) => (
                <li key={tag._id} className='tagListItem'>
                  {tag.name} ({tag.noteCount})
                </li>
              ))}
            </ul>
          )}
        </div>
    </Stack>
    </div>

    </form>
  )
}
