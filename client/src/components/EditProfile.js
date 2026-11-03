import React, { useState } from 'react'
import '../css/componentCss/EditUser.css'
import '../css/componentCss/FormSetup.css'
import Stack from 'react-bootstrap/Stack';


export default function EditProfile(
  // {setError}
) {
  const [contactMsg, setContactMsg] = useState(false)
  return (
    <form id='editProfileForm'>
      <div id='formHeadingBlock'>
        <div>
          <h3>EDIT PROFILE</h3>
        </div>
      </div>
      <div id='editProfileInput'>
        <fieldset id='editProfileGroup1'>
          <legend>USERNAME AND FULLNAME</legend>
          <Stack gap={3}>
      <div className="p-2" id='editProfileBlock1'>
        <label className='editUserLabel'>USERNAME:</label>
        <div className='inputDiv'>
          <input
            className='input'
            // id=''
            // placeholder=''//currentUser.username
            // name=''
            // value={}
            // onChange={}
          />
        </div>
      </div>
      <div className="p-2" id='editProfileBlock2'>
        <label className='editUserLabel'>EDIT FULL NAME: </label>
        <div className='inputDiv'>
          <label className='editUserLabel' htmlFor='editFirstNameInput' hidden>FIRST NAME:</label>
          <input
            className='input'
            id='editFirstNameInput'
            // placeholder=''//currentUser.fullName.firstName
            // name=''
            // value={}
            // onChange={}
          />
        </div>
         <div className='inputDiv'>
          <label className='editUserLabel' htmlFor='editLastNameInput' hidden>LAST NAME:</label>
          <input
            className='input'
            id='editLastNameInput'
            // placeholder=''//currentUser.fullName.lastName
            // name=''
            // value={}
            // onChange={}
          />
        </div>
      </div>
    </Stack>

        </fieldset>
        <fieldset id='editProfileGroup2'>
          <legend>Contact Details</legend>
              <Stack direction="horizontal" gap={3}>
      <div className="p-2">
        <div className='inputDiv'>
        <label className='editUserLabel'>EMAIL:</label>
        <input
        type='email'
        className='input'
        // placeholder=''
          // name=''
          // value={}
          // onChange={}
          onFocus={() => setContactMsg(true)}
            onBlur={() => setContactMsg(false)}
        />
        </div>
        <div className='inputDiv'>
          <label className='editUserLabel'>CONTACT NUMBER:</label>
          <input
          className='input'
            // id=''
            // placeholder=''
            // name=''
            // value={}
            // onChange={}
            onFocus={() => setContactMsg(true)}
            onBlur={() => setContactMsg(false)}
          />
        </div>
      </div>
      <div className="p-2 ms-auto"></div>
      <div className="p-2">
        {contactMsg && (
          <p>WE WILL NEVER SHARE YOUR CONTACT DETAILS</p>
        )}
      </div>
    </Stack>
        </fieldset>
        <fieldset id='editProfileGroup3'>
        <legend>Default Language options</legend>
          <Stack gap={3}>
      <div className="p-2">
        <label>SOURCE LANGUAGE:</label>
      </div>
      <div className="p-2">Second item</div>
      <div className="p-2">Third item</div>
    </Stack>

        </fieldset>
      </div>
    </form>
  )
}
