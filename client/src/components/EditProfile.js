import React, { useState } from 'react'
import '../css/componentCss/EditUser.css'
import '../css/componentCss/FormSetup.css'
import Stack from 'react-bootstrap/Stack';
import Button from 'react-bootstrap/Button';
import languageData from '../util/languageData';


export default function EditProfile(
  editProfile
) {
  const [contactMsg, setContactMsg] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    editProfile()
  }
  
  const handleInputChange = (event) => {

  }
  //====================================
  return (
    <form id='editProfileForm' onSubmit={handleSubmit} method='PATCH'>
      <div id='formHeadingBlock'>
          <h3 id='formHeading'>EDIT PROFILE</h3>    
      </div>
      <div id='editProfileInput'>
      {/* GROUP 1 */}
        <fieldset id='editProfileGroup1'>
          <legend>USERNAME AND FULLNAME</legend>
          {/* STACK 1 */}
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
        {/* GROUP 2 */}
        <fieldset id='editProfileGroup2'>
          <legend>Contact Details</legend>
          {/* STACK 2 */}
              <Stack direction="horizontal" gap={3} id=''>
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
        {/* STACK 3 */}
          <Stack gap={3} id='editProfileStack3'>
      <div className="p-2" id='editProfileLangBlock1'>
        <label className='editUserLabel'>EDIT SOURCE LANGUAGE:</label>
        <div className='inputDiv'>
          <select
          className='input'
          // id=''
          // name=''
          // value={}
          // onChange={}
          >
          <option value={''} className='input'>SELECT</option>
          {languageData.map((lang) => (
            <option 
            className='input'
            key={lang.code} value={lang.code}>
              {lang.name}
            </option>
          ))}
          </select>
        </div>
      </div>
      <div className="p-2" id='editProfileLangBlock2'>
        <label className='editUserLabel'>EDIT TARGET LANGUAGE:</label>
          <div className='inputDiv'>
          <select 
          className='input'
          value={''}>
          <option value={''}>SELECT</option>
            {languageData.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.name}
            </option>
          ))}
          </select>
        
        </div>
      </div>
      <div className="p-2" id='editProfileLangBlock1'>
      <label className='editUserLabel'>EDIT NOTES LANGUAGE:</label>
        <div className='inputDiv'>
          <select 
          className='input'
          value={''}>
          <option value={''}>SELECT</option>
            {languageData.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.name}
            </option>
          ))}
          </select>
        </div>
      </div>
    </Stack>
        </fieldset>
      </div>
          <Stack direction="horizontal" gap={3}>
        {/* ADMIN CONSENT CHECKBOX:
        Only required field for edit profile form*/}
         <div className="p-2" id='editProfileAdminConsentBlock'>
        <label className='editUserLabel' id='editAdminConsentLabel' htmlFor='adminEditConsent'>I CONSENT TO ALLOW ADMIN USERS KNOWING MY DETAILS</label>
        <input
          type='checkbox'
          id='adminEditConsent'
          required
          // name=''
          // value={}
          // onChange={}
          // ARIA ATTRIBUTES
          aria-required='true'
          />
    </div>
      <div className="p-2 ms-auto">
        <Button
         variant='warning'
         id='editProfileBtn'
         type='submit'
        >
        UPDATE PROFILE
        </Button>
      </div>
      <div className="vr" />
      <div className="p-2">
        <Button
        variant='danger'
        id='clearFormBtn'
        type='button'
        // onClick={}
        // ARIA ATTRIBUTES:
        >
          CLEAR FORM
        </Button>
      </div>
    </Stack>

    </form>
  )
}
