//EditProfile.js
import React, { useState } from 'react'
import '../css/componentCss/EditUser.css'
import '../css/componentCss/FormSetup.css'
import Stack from 'react-bootstrap/Stack';
import Button from 'react-bootstrap/Button';
import languageData from '../util/languageData';
// IMPORT ICONS FROM LUCIDE REACT
import { RotateCcw } from 'lucide-react';

/* Empty form values, shared by the initial state and the CLEAR FORM button.
Fields start empty and the user's current details are shown as placeholders,
so only the fields the user types into are sent */
const emptyProfileForm = {
  username: '',
  fullName: {
    firstName: '',
    lastName: ''
  },
  contactDetails: {
    email: '',
    contactNumber: ''
  },
  defaultSourceLang: '',
  defaultTargetLang: '',
  defaultNoteLang: '',
  adminDataConsent: false
}

//====MAIN EDIT PROFILE FUNCTION COMPONENT========
export default function EditProfile(
  {//PROPS PASSED FROM PARENT COMPONENT (Home.js)
    user = {},
    editUserProfile,
    loading
  }) {
  const [contactMsg, setContactMsg] = useState(false)
  const [formData, setFormData] = useState(emptyProfileForm)

  const handleInputChange = (event) => {
    const { name, value } = event.target;// Get the input name and value from the changed field
    if (name.includes('.')) {// Check if the input name represents a nested object field
      const [parent, field] = name.split('.');// Split the field name into parent and child keys
      setFormData((prev) => ({// Update nested state without removing existing nested values
        ...prev,
        [parent]: {
          ...prev[parent],
          [field]: value// Update only the specific nested field
        }
      }))
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }))// Update normal top-level fields
    }
  }

  const handleConsentChange = (event) => {
    const { checked } = event.target;
    setFormData((prev) => ({ ...prev, adminDataConsent: checked }))
  }

  /* Build the request body from the fields that were filled in and differ
  from the user's current details, in the same shape as the registration form */
  const buildChanges = () => {
    const changes = {};
    const changed = (value, current) => value.trim() && value.trim() !== (current || '');

    if (changed(formData.username, user.username)) changes.username = formData.username.trim();

    const fullName = {};
    if (changed(formData.fullName.firstName, user.fullName?.firstName)) fullName.firstName = formData.fullName.firstName.trim();
    if (changed(formData.fullName.lastName, user.fullName?.lastName)) fullName.lastName = formData.fullName.lastName.trim();
    if (Object.keys(fullName).length) changes.fullName = fullName;

    const contactDetails = {};
    if (changed(formData.contactDetails.email, user.contactDetails?.email)) contactDetails.email = formData.contactDetails.email.trim();
    if (changed(formData.contactDetails.contactNumber, user.contactDetails?.contactNumber)) contactDetails.contactNumber = formData.contactDetails.contactNumber.trim();
    if (Object.keys(contactDetails).length) changes.contactDetails = contactDetails;

    if (changed(formData.defaultSourceLang, user.defaultLanguages?.defaultSourceLanguage)) changes.defaultSourceLang = formData.defaultSourceLang;
    if (changed(formData.defaultTargetLang, user.defaultLanguages?.defaultTargetLanguage)) changes.defaultTargetLang = formData.defaultTargetLang;
    if (changed(formData.defaultNoteLang, user.defaultLanguages?.defaultNoteLanguage)) changes.defaultNoteLang = formData.defaultNoteLang;

    return changes;
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const changes = buildChanges();
    // Conditional rendering to check something was changed before sending the request
    if (Object.keys(changes).length === 0) {
      alert('Please change at least one field before updating your profile.')
      return
    }
    const success = await editUserProfile(changes)
    if (success) setFormData(emptyProfileForm)
  }

  //Function to clear form
  const clearForm = () => {
    const confirmClear = window.confirm('Are you sure you want to clear the form?');
    if (!confirmClear) return;
    setFormData(emptyProfileForm)
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
        <label className='editUserLabel' htmlFor='editUsernameInput'>USERNAME:</label>
        <div className='inputDiv'>
          <input
            className='input'
            id='editUsernameInput'
            type='text'
            autoComplete='username'
            minLength={3}
            maxLength={30}
            pattern='[a-zA-Z0-9_]+'
            title='Letters, numbers and underscores only'
            placeholder={user.username || 'USERNAME'}
            name='username'
            value={formData.username}
            onChange={handleInputChange}
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
            type='text'
            autoComplete='given-name'
            placeholder={user.fullName?.firstName || 'FIRST NAME'}
            name='fullName.firstName'
            value={formData.fullName.firstName}
            onChange={handleInputChange}
          />
        </div>
         <div className='inputDiv'>
          <label className='editUserLabel' htmlFor='editLastNameInput' hidden>LAST NAME:</label>
          <input
            className='input'
            id='editLastNameInput'
            type='text'
            autoComplete='family-name'
            placeholder={user.fullName?.lastName || 'LAST NAME'}
            name='fullName.lastName'
            value={formData.fullName.lastName}
            onChange={handleInputChange}
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
        <label className='editUserLabel' htmlFor='editEmailInput'>EMAIL:</label>
        <input
        type='email'
        className='input'
        id='editEmailInput'
        autoComplete='email'
        placeholder={user.contactDetails?.email || 'EMAIL'}
          name='contactDetails.email'
          value={formData.contactDetails.email}
          onChange={handleInputChange}
          onFocus={() => setContactMsg(true)}
            onBlur={() => setContactMsg(false)}
        />
        </div>
        <div className='inputDiv'>
          <label className='editUserLabel' htmlFor='editPhoneInput'>CONTACT NUMBER:</label>
          <input
          type='tel'
          className='input'
            id='editPhoneInput'
            autoComplete='tel'
            placeholder={user.contactDetails?.contactNumber || '082 123 4567'}
            name='contactDetails.contactNumber'
            value={formData.contactDetails.contactNumber}
            onChange={handleInputChange}
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
        {/* STACK 3: the SELECT option keeps the current language */}
          <Stack gap={3} id='editProfileStack3'>
      <div className="p-2" id='editProfileLangBlock1'>
        <label className='editUserLabel' htmlFor='editSourceLangInput'>EDIT SOURCE LANGUAGE:</label>
        <div className='inputDiv'>
          <select
          className='input'
          id='editSourceLangInput'
          name='defaultSourceLang'
          value={formData.defaultSourceLang}
          onChange={handleInputChange}
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
        <label className='editUserLabel' htmlFor='editTargetLangInput'>EDIT TARGET LANGUAGE:</label>
          <div className='inputDiv'>
          <select
          className='input'
          id='editTargetLangInput'
          name='defaultTargetLang'
          value={formData.defaultTargetLang}
          onChange={handleInputChange}
          >
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
      <label className='editUserLabel' htmlFor='editNoteLangInput'>EDIT NOTES LANGUAGE:</label>
        <div className='inputDiv'>
          <select
          className='input'
          id='editNoteLangInput'
          name='defaultNoteLang'
          value={formData.defaultNoteLang}
          onChange={handleInputChange}
          >
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
          name='adminDataConsent'
          checked={formData.adminDataConsent}
          onChange={handleConsentChange}
          // ARIA ATTRIBUTES
          aria-required='true'
          />
    </div>
      <div className="p-2 ms-auto">
        <Button
         variant='warning'
         id='editProfileBtn'
         type='submit'
         disabled={loading}
        >
        {loading ? 'SAVING...' : 'UPDATE PROFILE'}
        </Button>
      </div>
      <div className="vr" />
      <div className="p-2">
        <Button
        variant='danger'
        id='clearFormBtn'
        type='button'
        onClick={clearForm}
        disabled={loading}
        // ARIA ATTRIBUTES:
        aria-label='CLEAR FORM'
        >
          <RotateCcw aria-hidden='true' focusable='false' fontWeight={700} size={16}/>CLEAR FORM
        </Button>
      </div>
    </Stack>
    </form>
  )
}
