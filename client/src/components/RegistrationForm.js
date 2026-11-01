// RegistrationForm.js
import React, { useState } from 'react'
import '../css/componentCss/FormSetup.css'
import '../css/componentCss/RegistrationForm.css'
import Stack from 'react-bootstrap/Stack';
import Button from 'react-bootstrap/Button';
import { Asterisk, Eye, EyeOff } from 'lucide-react';
import { languageData } from '../util/languageData';
import { emptyNewUser } from '../pages/Register';
export default function RegistrationForm(
  {//PROPS PASSED FROM PARENT COMPONENT (Register.js)
  newUserData,
  setNewUserData,
  submitRegistration,
  loading
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

    const handleAdminConsentChange = (event) => {
        const { checked } = event.target;
        setNewUserData((prev) => ({
            ...prev,
            adminDataConsent: checked
        }));
    };

    // Function to handle form submission
    const handleRegister = (event) => {
      event.preventDefault()
      submitRegistration();
    }

    //Function to clear form
    const clearForm = () => {
      const confirmClear = window.confirm('Are you sure you want to clear the form? All entered data will be lost.');
      if(!confirmClear) return;
      setNewUserData(emptyNewUser);
    }

    //==================JSX RENDERING=================
  return (
    <form id='registrationForm' method='POST' onSubmit={handleRegister} aria-labelledby='formTitle'>
      <p className='visually-hidden' id='formTitle'>REGISTRATION FORM</p>
      <div id='formHeadingBlock'>
        <h3 id='formHeading'>SIGN UP</h3>
      </div>
      <div id='registrationInput'>
      {/* GROUP 1 */}
        <fieldset id='regisGroup1'>
          <legend>USER DETAILS</legend>
          {/* STACK 1 */}
            <Stack direction="horizontal" gap={3} id='regisStack1'>
            {/* USERNAME: value={newUserData.username} */}
      <div className="p-2" id='regisUsernameBlock'>
        <label className='regisLabel' htmlFor='regisUsername'>USERNAME:</label>
        <div className='inputDiv'>
          <input
            className='input'
            id='regisUsername'
            placeholder='USERNAME'
            required
            type='text'
            autoComplete='username'
            minLength={3}
            maxLength={30}
            pattern='[a-zA-Z0-9_]+'
            title='Letters, numbers and underscores only'
            name='username'
            value={newUserData.username}
            onChange={handleInputChange}
          />
          <Asterisk color="#C22419" fontWeight={700} size={12} aria-hidden='true' focusable='false'/>
        </div>
      </div>
      <div className="p-2 ms-auto"></div>
      <div className="p-2"></div>
    </Stack>
    {/* STACK 2 */}
      <Stack direction="horizontal" gap={3} id='regisStack2'>
      {/* FULL NAME */}
      <div className="p-2" id='regisFullNameBlock'>
      
          <label className='regisLabel'>FULL NAME:</label>
          {/* FIRST NAME value={newUserData.fullName.firstName} */}
          <div className='inputDiv'>
            <label className='regisLabel' htmlFor='regisFirstName' hidden>FIRST NAME</label>
            <input
              className='input'
              id='regisFirstName'
              required
              type='text'
              autoComplete='given-name'
              placeholder='FIRST NAME'
                name='fullName.firstName'
                value={newUserData.fullName.firstName}
                onChange={handleInputChange}
                // ARIA ATTRIBUTES:
                aria-required='true'
                aria-label='First Name Input'
                aria-describedby='firstNameError'
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
              required
              name='fullName.lastName'
              value={newUserData.fullName.lastName}
              onChange={handleInputChange}
              aria-required='true'
              aria-label='Last Name Input'
              aria-describedby='lastNameError'
            />
            <Asterisk color="#C22419" fontWeight={700} size={12} aria-hidden='true' focusable='false'/>
          </div>
        
      </div>
      <div className="p-2 ms-auto"></div>
      <div className="p-2"></div>
    </Stack>
    {/* STACK 3 */}
          <Stack direction="horizontal" gap={3} id='regisStack3'>
        <div className="p-2" id='regisDateOfBirthBlock'>
        <label className='regisLabel' htmlFor='regisDOB'>DATE OF BIRTH</label>
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
      <div className="p-2 ms-auto"></div>
      <div className="p-2">
        <span id='regisAgeMsg'>
        <p className='infoText'> You must be at least 13 years old to register</p>
       </span>
      </div>
    </Stack>
        </fieldset>
        {/* GROUP 2 : CONTACT DETAILS */}
        <fieldset id='regisGroup2'>
          <legend>CONTACT DETAILS</legend>
          {/* STACK 4 */}
           <Stack gap={3} id='regisStack4'>
      <div className="p-2" id='regisEmailBlock'>
        <label className='regisLabel' htmlFor='emailRegis'>EMAIL:</label>
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
      {/* CONTACT NUMBER: value={newUserData.contactDetails.contactNumber} */}
      <div className="p-2" id='regisPhoneBlock'>
           <label className='regisLabel' htmlFor='regisPhone'>CONTACT NUMBER:</label>
        <div className='inputDiv'>
          <input
          type='tel'
            className='input'
            id='regisPhone'
            required
            autoComplete='tel'
            placeholder='082 123 4567'
            name='contactDetails.contactNumber'
            value={newUserData.contactDetails.contactNumber}
            onChange={handleInputChange}
          />
           <Asterisk color="#C22419" fontWeight={700} size={12} aria-hidden='true' focusable='false'/>
        </div>
      </div>
          </Stack>
        </fieldset>
        {/* GROUP 3: Optional loguage Preferences */}
        <fieldset id='regisGroup3'>
        <legend>Default Language Preferences</legend>
        {/* STACK 5 */}
         <Stack gap={3} id='regisStack5'>
      <div className="p-2" id='regisSourceLangBlock'>
        <label className='regisLabel' htmlFor='regisSourceLangInput'>DEFAULT SOURCE LANGAUGE:</label>
        <select 
          className='input' 
          onChange={handleInputChange} id='regisSourceLangInput' name='defaultSourceLang' value={newUserData.defaultSourceLang}
        // ARIA ATTRIBUTES:
        aria-label='Default Source Language Selection'
        aria-required='false'
        >
          <option value=''>SELECT</option>
          {languageData.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.name  }
            </option>
          ))}
        </select>
      </div>
      <div className="p-2" id='regisTargetLangBlock'>
        <label className='regisLabel' htmlFor='regisTargetLangInput'>DEFAULT TARGET LANGAUGE:</label>
        <select
          className='input'
          id='regisTargetLangInput'
          onChange={handleInputChange}
          name='defaultTargetLang'
          value={newUserData.defaultTargetLang}
          // ARIA ATTRIBUTES:
          aria-label='Default Target Language Selection'
          aria-required='false'
          >
          <option value=''>SELECT</option>
          {languageData.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.name  }
            </option>
          ))}
        </select>
      </div>
      <div className="p-2" id='regisNotesLangBlock'>
        <label className='regisLabel' htmlFor='regisNoteLangInput'>DEFAULT NOTES LANGAUGE:</label>
        <select 
          className='input' 
          id='regisNoteLangInput' 
          onChange={handleInputChange} 
          name='defaultNoteLang' 
          value={newUserData.defaultNoteLang}
          // ARIA ATTRIBUTES:
          aria-label='Default Notes Language Selection'
          aria-required='false'
          >
          <option value=''>SELECT</option>
          {languageData.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.name}
            </option>
          ))}
        </select>
      </div>
    </Stack>
        </fieldset>
        {/* GROUP 4: PASSWORD and ADMIN CONSENT */}
        <fieldset id='regisGroup4'>
          <legend>Password</legend>
          {/* STACK 6 */}
             <Stack direction="horizontal" gap={3} id='regisStack6'>
      <div className="p-2" id='regisPasswordBlock'>
         <label className='regisLabel' htmlFor='registrationPassword'>PASSWORD:</label>
         <div className='inputDiv'>
          <input
          className='input'
          id='registrationPassword'
          placeholder='PASSWORD'
            type={showPassword ? 'text' : 'password'}
            onChange={handleInputChange}
            name='password'
            value={newUserData.password}
            required
            minLength={8}
            autoComplete='new-password'
            // ARIA ATTRIBUTES:
            aria-required='true'
            aria-label='Password Input'
            aria-describedby='passwordError'
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
    {/* ====STACK 7=========== */}
     <Stack direction="horizontal" gap={3} id='regisStack7'>
     {/* Admins can list every account through /user/fetchUsers, so the
            account is only created once this consent is given. `required` stops
            an unchecked box in the browser; the route rejects it as well, since
            a request sent outside the form never sees that check. */}
      <div className="p-2" id='regisAdminConsentBlock'>
         <label className='regisLabel' htmlFor='adminConsentMsg'>I CONSENT TO ALLOW ADMIN USERS KNOWING MY DETAILS</label>
         <div id='adminConsentCheckboxDiv'>
          <input 
            type="checkbox" 
            id='adminConsentMsg' 
            name='adminConsentMsg' 
            checked={newUserData.adminDataConsent}
            required
            onChange={handleAdminConsentChange}
            // ARIA ATTRIBUTES:
            aria-required='true'
            aria-checked={newUserData.adminDataConsent}
            aria-label='Admin Consent Checkbox'
            />
            <small><Asterisk color="#C22419" fontWeight={700} size={12} aria-hidden='true' focusable='false' /></small>
         </div>
      </div>
      <div className="p-2 ms-auto"/>
      <div className="p-2"/>
    </Stack>
        </fieldset>       
      </div>
      {/* GROUP 5: FORM BUTTON Group */}
      <div id='regisFormBtnGroup'>
            <Stack direction="horizontal" gap={3} id='regisFormBtnStack'>
      <div className="p-2">
          <p className='infoMsg' aria-live='polite' aria-hidden='true'>
                        <small><Asterisk color="#C22419" fontWeight={700} size={12} aria-hidden='true' focusable='false' /> Indicates required information</small>
                    </p>
      </div>
      <div className="p-2 ms-auto">
        <Button
        variant='light'
        type='submit'
        id='registerBtn'
        disabled={loading}
        >
          {loading ? 'REGISTERING...' : 'REGISTER'}
        </Button>
      </div>
      <div className="vr" />
      <div className="p-2">
        <Button
        variant='danger'
        type='button'
        id='clearFormBtn'
        onClick={clearForm}
        >
          CLEAR FORM
        </Button>
      </div>
    </Stack>

      </div>

    </form>
  )
}
