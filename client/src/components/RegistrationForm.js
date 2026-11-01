// RegistrationForm.js
import React, { useState } from 'react'
import '../css/componentCss/FormSetup.css'
import '../css/componentCss/RegistrationForm.css'
import Stack from 'react-bootstrap/Stack';
import Button from 'react-bootstrap/Button';
import { Asterisk, Eye, EyeOff } from 'lucide-react';

export default function RegistrationForm(
  {//PROPS PASSED FROM PARENT COMPONENT (Registration.js)
  newUserData,
  setNewUserData
}) {
  //==================STATE VARIABLES=================
  const [showPassword, setShowPassword] = useState(false)// State to toggle password visibility

      const handleInputChange = (event) => {
        const { name, value } = event.target;// Get the input name and value from the changed field
        if (name.includes('.')) {// Check if the input name represents a nested object field
            const [parent, field] = name.split('.');// Split the field name into parent and child keys
            setNewUserData((prevState) => ({// Update nested state without removing existing nested values
                ...prevState,
                [parent]: {// Update the parent object, such as fullName or preferences
                    ...prevState[parent],
                    [field]: value// Update only the specific nested field

                }
            }))
        } else {
            // Update normal top-level fields
            setNewUserData((prev) => ({  // Example: username, email, dateOfBirth, password
                ...prev,
                [name]: value
            }))
        }
    };
  return (
    <form id='registrationForm' method='POST'>
      <p className='visually-hidden' id='formTitle'>REGISTRATION FORM</p>
      <div id='formHeadingBlock'>
        <h3 id='formHeading'>SIGN UP</h3>
      </div>
      <div id='registrationInput'>
      {/* GROUP 1 */}
        <fieldset id='regisGroup1'>
          <legend>USER DETAILS</legend>
          {/* STACK 1 */}
           <Stack gap={3}>
      <div className="p-2" id='regisUsernameBlock'>
        <label className='regisLabel' htmlFor='regisUsername'>USERNAME:</label>
        <div className='inputDiv'>
          <input
            className='input'
            id='regisUsername'
            placeholder='USERNAME'
            required
            name='username'
            value={newUserData.username}
            onChange={handleInputChange}
          />
          <Asterisk color="#C22419" fontWeight={700} size={12} aria-hidden='true' focusable='false'/>
        </div>
      </div>
      <div className="p-2" id='regisFullNameBlock'>
      
          <label className='regisLabel'>FULL NAME:</label>
          <div className='inputDiv'>
            <label className='regisLabel' htmlFor='' hidden>FIRST NAME</label>
            <input
              className='input'
              // id=''
              placeholder='FIRST NAME'
                name='fullName.firstName'
                                        value={newUserData.fullName.firstName}
            />
            <Asterisk color="#C22419" fontWeight={700} size={12} aria-hidden='true' focusable='false'/>
          </div>
          <div className='inputDiv'>
            <label className='regisLabel' htmlFor='regisLastName' hidden>LAST NAME</label>
            <input
            type='text'
            autoComplete='family-name'
            placeholder='LAST NAME'
            id='regisLastName'
              className='input'
              name='fullName.lastName'
              value={newUserData.fullName.lastName}
            />
            <Asterisk color="#C22419" fontWeight={700} size={12} aria-hidden='true' focusable='false'/>
          </div>
        
      </div>
      <div className="p-2" id='regisDateOfBirthBlock'>
        <label className='regisLabel'>DATE OF BIRTH</label>
        <div className='inputDiv'>
          <input
            type='date'
            required
            id='regisDOB'
            className='input'
            name='dateOfBirth'
            value={newUserData.dateOfBirth}
            onChange={handleInputChange}
          />
          <Asterisk color="#C22419" fontWeight={700} size={12} aria-hidden='true' focusable='false'/>
        </div>
      </div>
    </Stack>
        </fieldset>
        {/* GROUP 2 */}
        <fieldset id='regisGroup2'>
          <legend>CONTACT DETAILS</legend>
          {/* STACK 2 */}
           <Stack gap={3}>
      <div className="p-2" id='regisEmailBlock'>
        <label className='regisLabel'>EMAIL:</label>
        <div className='inputDiv'>
          <input
            className='input'
            id='emailRegis'
            required
            type='email'
            autoComplete='email'
            placeholder='EMAIL'
            name='contactDetails.email'
            value={newUserData.contactDetails.email}
            onChange={handleInputChange}


            />
            <Asterisk color="#C22419" fontWeight={700} size={12} aria-hidden='true' focusable='false'/>
        </div>
      </div>
      <div className="p-2" id='regisPhoneBlock'>
           <label className='regisLabel'>PHONE</label>
        <div className='inputDiv'>
          <input
          type='text'
            className='input'
            // id=''
            required
            placeholder='CONTACT NUMBER'
            name='contactDetails.phone'
            value={newUserData.contactDetails.phone}
            onChange={handleInputChange}
          />
           <Asterisk color="#C22419" fontWeight={700} size={12} aria-hidden='true' focusable='false'/>
        </div>
      </div>
    </Stack>
        </fieldset>
        {/* GROUP 3: Optional loguage Preferences */}
        <fieldset id='regisGroup3'>
        <legend>Language Preferences</legend>
        {/* STACK 3 */}
         <Stack gap={3}>
      <div className="p-2">
        <label className='regisLabel' htmlFor='regisSourceLangInput'>DEFAULT SOURCE LANGAUGE:</label>
        <select className='input'>
          <option>SELECT</option>
        </select>
      </div>
      <div className="p-2">
        <label className='regisLabel' htmlFor='regisSourceLangInput'>DEFAULT SOURCE LANGAUGE:</label>
        <select className='input'>
          <option>SELECT</option>
        </select>
      </div>
    </Stack>
        </fieldset>
        {/* GROUP 4: PASSWORD and ADMIN CONSENT */}
        <fieldset id='regisGroup4'>
          <legend>Password</legend>
          {/* STACK 4 */}
             <Stack direction="horizontal" gap={3} id='regisStack4'>
      <div className="p-2" id='regisPasswordBlock'>
         <label className='regisLabel' htmlFor='registrationPassword'>PASSWORD:</label>
         <div className='inputDiv'>
          <input
          className='input'
          placeholder='PASSWORD'
            type={showPassword ? 'text' : 'password'}
            onClick={handleInputChange}
            name='password'
            value={newUserData.value}
            required
          />
          {/* SHOW/HIDE PASSWORD BUTTON */}
                            <Button
                                variant='warning'
                                id='showPswdBtn'
                                onClick={() => setShowPassword(!showPassword)}
                                type='button'
                                // ARIA ATTRIBUTES:
                                aria-label={showPassword ? 'Hide Password' : 'Show Password'}
                                aria-controls='registrationPassword'
                                aria-pressed={showPassword}
                                aria-expanded={showPassword}
                            >
                                {/* BUTTON TEXT */}
                                {showPassword ? (
                                    <>
                                        Hide Password
                                        <EyeOff fontWeight={700} style={{marginLeft: 6}} aria-hidden='true' focusable='false'/>
                                    </>
                                ) : (
                                    <>
                                        Show Password
                                        <Eye fontWeight={700} style={{marginLeft: 6}} aria-hidden='true' focusable='false'/>
                                    </>
                                )}
                            </Button>
                        <Asterisk color="#C22419" fontWeight={700} size={12} aria-hidden='true' focusable='false'/>
         </div>
      </div>
      {/* <div className="p-2 ms-auto">Second item</div> */}
      {/* <div className="p-2">Third item</div> */}
    </Stack>
    {/* ====STACK 5=========== */}
     <Stack direction="horizontal" gap={3}>
     {/* Admins can list every account through /user/fetchUsers, so the
            account is only created once this consent is given. `required` stops
            an unchecked box in the browser; the route rejects it as well, since
            a request sent outside the form never sees that check. */}
      <div className="p-2">
         <label className='regisLabel' htmlFor='adminConsentMsg'>I CONSENT TO ALLOW ADMIN USERS KNOWING MY DETAILS</label>
         <div id='adminConsentCheckboxDiv'>
          <input 
            type="checkbox" 
            id='adminConsentMsg' 
            // name='adminConsentMsg' 
            // value={newUserData.adminDataConsent}
            required
            onChange={handleInputChange}
            // ARIA ATTRIBUTES:
            aria-required='true'
            aria-checked={newUserData.adminDataConsent}
            aria-label='Admin Consent Checkbox'
            />

         </div>
      </div>
      <div className="p-2 ms-auto">
      </div>
      <div className="p-2">Third item</div>
    </Stack>
        </fieldset>
       
      </div>
      <div id='regisFormBtnGroup'>
            <Stack direction="horizontal" gap={3} id='regisFormBtnStack'>
      <div className="p-2"></div>
      <div className="p-2 ms-auto">
        <Button
        variant='light'
        type='submit'
        id='registerBtn'
        >
          REGISTER
        </Button>
      </div>
      <div className="vr" />
      <div className="p-2">
        <Button
        variant='danger'
        id='clearFormBtn'
        // onClick={}
        >
          CLEAR FORM
        </Button>
      </div>
    </Stack>

      </div>

    </form>
  )
}
