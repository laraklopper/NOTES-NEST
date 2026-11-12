// EditPassword.js
//IMPORT REQUIRED MODULES AND PACKAGES
import React, { useState, useMemo, useCallback } from 'react';
// IMPORT CSS STYLESHEETS
import '../css/componentCss/EditUser.css'
import '../css/componentCss/FormSetup.css'
// IMPORT BOOTSTRAP COMPONENTS
import Stack from 'react-bootstrap/Stack';
import Button from 'react-bootstrap/Button';
// IMPORT ICONS FROM LUCIDE REACT
import { Asterisk , Bug, Eye, EyeOff} from 'lucide-react';

//EditPassword function component
export default function EditPassword(//Export default EditPassword.js function component
    {//PROPS PASSED FROM PARENT COMPONENT(Home.js)
        setError
    }
) {//===========STATE VARIABLES=============
    const [currentPassword, setCurrentPassword] = useState('')// Stores the user's current password entered into the form
    const [newPassword, setNewPassword] = useState('')// Stores the new password that the user wants to change to
    const [confirmNewPassword, setConfirmNewPassword] = useState('')// Client-side only, never sent to the API
    const [showCurrentPswd, setShowCurrentPswd] = useState(false)
     // Controls whether the new password is displayed as plain text (true) or hidden behind dots/asterisks (false)
    const [showNewPswd, setShowNewPswd] = useState(false)
    const [passwordMsg, setPasswordMsg] = useState(false)// Controls the visibility of the password guidance message
    const [touched, setTouched] = useState({
        currentPassword: false,
        newPassword: false
    })
    // Tracks whether the password update request is in progress.
    const [loading, setLoading] = useState(false)// Used to disable buttons and display a loading message while saving.

    const currentPswdEmpty = useMemo(() =>
        !String(currentPassword || '').trim(),
        [currentPassword]
    )
    const newPswdEmpty = useMemo(() => 
        !String(newPassword || '').trim(),
        [newPassword]
    )

    const showCurrentPswdError = touched.currentPassword && currentPswdEmpty;
    const showNewPswdError = touched.newPassword && newPswdEmpty;

     //=============================================
    const isStrongPassword =useCallback((pwd)=> {
        return /^(?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z\d!@#$%^&*(),.?":{}|<>]{8,}$/ //Regex pattern to check for at least 8 characters and one special character
            .test(
                String(pwd || '')// Ensure pwd is a string before testing
            );
    },[])

    //Function to reset editPassword form
    const resetForm = useCallback(() => {
        const confirmReset = window.confirm(
            "Are you sure you want to clear the form?"
        )
        if (!confirmReset) return;// If user cancels, exit the function
        setCurrentPassword('')// Clear the current password field
        setNewPassword('')// Clear the new password field
        setConfirmNewPassword('')
    },[])

    //=========REQUESTS=========================
    //Function to edit user password
    const editPassword = useCallback(async(e) => {
        e.preventDefault()//Prevent default form submission
        setLoading(true)
        setError?.(null)//Clear any previous error messages
        try {
             if (!currentPassword || !newPassword) {
                const msg = 'Both current and new passwords are required.';
                setError?.(msg);// Set the error state to display the error in the UI
                alert(msg);// Alert the user of the error
                return;// Exit the function early
            }
              // Conditional rendering to check if new password is different from current password
            if (newPassword === currentPassword) {
                const msg = 'New password must be different from the current password.';// Error message
                setError?.(msg);// Set the error state to display the error in the UI
                alert(msg);// Alert user of error
                return;// Exit the function early
            }
            // Conditional rendering to check password strength
            if (!isStrongPassword(newPassword)) {
                const msg = //Message for weak password
                    'New password must be at least 8 characters long and include at least one special character.';
                setError?.(msg);// Set the error state to display the error in the UI
                alert(msg);// Alert user of error
                return;// Exit the function early
            }
            // Conditional rendering to check the new password was typed the same way twice
            if (newPassword !== confirmNewPassword) {
                const msg = 'New passwords do not match.';// Error message
                setError?.(msg);// Set the error state to display the error in the UI
                alert(msg);// Alert user of error
                return;// Exit the function early
            }
            // The browser sends the HTTP-only JWT cookie with the request
            const response = await fetch('/user/editPassword', {
                method: 'PATCH',//HTTP request method
                headers: {
                    'Content-Type': 'application/json',// Specify the Content-Type in the request payload
                },
                body: JSON.stringify({// Convert the password data to a JSON string
                    currentPassword,
                    newPassword
                })
            })
             const data = await response.json().catch(() => ({}));// Safely parse the JSON response (avoid crash if server returns non-JSON)
             if (!response.ok) {
                const errorMessage = data.message || 'Failed to change password.';//Default error message
                setError?.(errorMessage);// Set the error state to display the error in the UI
                alert(errorMessage);// Alert user of error
                return;// Exit the function early
            }

            // Clear form fields directly — avoids the window.confirm in resetForm
            setCurrentPassword('');
            setNewPassword('');
            setConfirmNewPassword('');
            setTouched({ currentPassword: false, newPassword: false });// Don't show "required" errors on the emptied fields
            setError?.(null);//Clear any previous error messages
            console.log('[SUCCESS: EditPasswordForm.js] Password successfully changed');// Log success message to console for debugging
            setLoading(false);// Set loading to false after successful response
            alert('Password changed successfully.');// Notify the user of success
        } catch (error) {
             const msg = error?.message || 'An error occurred while changing the password.';// Default error message
            setError?.(msg);// Set the error state to display the error in the UI
            console.error('[ERROR: EditPasswordForm.js, editPassword]', msg);// Log the error message in the console for debugging
            alert('Error changing password');// Alert user of error
        }finally{
            setLoading(false)//Set Loading state to false
        }
    },[setError, currentPassword, newPassword, confirmNewPassword, isStrongPassword])
     // ========= IDs USED BY aria-labelledby / aria-describedby =========
const formTitleId = 'editPasswordFormTitle';
const passwordHelpId = 'EditChangePasswordHelp'
const currentPasswordErrorId = 'currentPasswordError'
const newPasswordErrorId = 'newPasswordError'

    //================JSX RENDERING===========
  return (
    <form id='editPasswordForm' onSubmit={editPassword} method='PATCH' aria-labelledby={formTitleId}>
        <div id='formHeadingBlock'>
            <p className='visually-hidden' id={formTitleId}>EDIT PASSWORD FORM</p>
            <h3 id='formHeading'>EDIT PASSWORD:</h3>
        </div>
        <div id='editPasswordInput'>
        {/* GROUP 1: CURRENT PASSOWORD */}
        <fieldset id='editPasswordGroup1'>
        <legend>Current password</legend>
   <Stack gap={3} id='editPasswordStack1'>
      <div className="p-2" id='currentPasswordBlock1'>
        <label className='editUserLabel'>CURRENT PASSWORD:</label>
        <div className='inputDiv'>
            <input
                className='input'
                id='currentPasswordInput'
                type={showCurrentPswd ? 'text' : 'password'}
                placeholder='CURRENT PASSWORD'
                required
                name='currentPassword'
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                onFocus={() => setPasswordMsg(true)}
                onBlur={() => {
                        setPasswordMsg(false)
                        setTouched((prev)=> ({...prev, currentPassword: true}))}}
                // ARIA ATTRIBUTES:
                aria-required='true'
                aria-label='Current PasswordInput'
                aria-invalid={currentPswdEmpty ? 'true': 'false'}
                aria-describedby={[
                    passwordMsg ? passwordHelpId : null,
                    currentPswdEmpty ? currentPasswordErrorId : null,
                ]
                    .filter(Boolean)
                    .join(' ')
                }

            />
             <small><Asterisk color='#C22419' fontWeight={700} size={12} aria-hidden='true' focusable='false' /></small>
        </div>
      </div>
      <div className="p-2" id='currentPasswordBlock2'>
        <Button
            variant='warning'
            id='showCurrentPswdBtn'
            onClick={() => setShowCurrentPswd ((prev) => !prev)}
            type='button'
            // ARIA ATTRIBUTES:
            aria-pressed={showCurrentPswd}
            aria-expanded={showCurrentPswd}
            aria-label={showCurrentPswd ? 'Hide Current Password': 'Show Current Password'}
            >
                {showCurrentPswd ? (
                    <>
                        Hide Password
                        <EyeOff  style={{marginLeft: 6}} fontWeight={700} aria-hidden='true' focusable='false'/>
                    </>
                ): (
                    <>
                        Show Password
                        <Eye style={{ marginLeft: 6 }} fontWeight={700}  aria-hidden='true' focusable='false'/>
                    </>
                )}
            </Button>
      </div>
      {/* Error Message */}
      {showCurrentPswdError && (
        <div className="p-2">
             <span>
                <Bug aria-hidden='true' focusable='false'/>
                <p>CURRENT PASSWORD IS REQUIRED</p>
            </span>
        </div>
      )}
    </Stack>
        </fieldset>
         {/* GROUP 2: NEW PASSWORD */}
    <fieldset id='editPasswordGroup2'>
        <legend>NEW PASSWORD</legend>
         {/* ========EDIT PASSWORD STACK 2=============== */}
<Stack gap={3} id='editPasswordStack2'>
{/* NEW PASSWORD value={newPassword} */}
      <div className="p-2" id='newPasswordBlock1'>
        <label className='editUserLabel'>NEW PASSWORD</label>
        <div className='inputDiv'>
            <input
                className='input'
                id='newPasswordInput'
                type={showNewPswd ? 'text' : 'password'}
                required
                placeholder='NEW PASSWOED'
                name='newPassword'
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                onFocus={() => setPasswordMsg(true)}
                onBlur={() => {
                    setPasswordMsg(false)
                    setTouched((prev) => ({...prev, newPassword: true}))
                }}
                // ARIA ATTRIBUTES:
                aria-label='newPasswordInput'
                aria-required='true'
                aria-invalid={newPswdEmpty ? 'true': 'false'}
                aria-describedby={[
                    passwordMsg ? passwordHelpId : null,
                    newPswdEmpty ? newPasswordErrorId: null,
                ]
                .filter(Boolean)
                .join(' ')
                }
            />
            <small><Asterisk color='#C22419' fontWeight={700} size={12} aria-hidden='true' focusable='false' /></small>
        </div>
      </div>
      {/* SHOW NEW PASSWORD BUTTON */}
      <div className="p-2" id='newPasswordBlock2'>
        <Button
            variant='warning'
            id='showNewPswdBtn'
            type='button'
            onClick={() => setShowNewPswd((prev) => !prev)}
            // ARIA ATTRIBUTES:
            aria-pressed={showNewPswd}
            aria-expanded={showNewPswd}
            aria-label={showNewPswd ? 'Hide New Password' : 'Show New Password'}
        >
            {showNewPswd ? (
                <>
                    Hide Password
                    <EyeOff aria-hidden='true' focusable='false' style={{marginLeft: 6}} fontWeight={700}/>
                </>
            ):(
                <>
                    Show Password
                    <Eye aria-hidden="true" focusable='false' style={{ marginLeft: 6 }} fontWeight={700} />
                </>
            )}
        </Button>
      </div>
      {/* Error message 
      Show message if input is touched
      */}
      {showNewPswdError && (
        <div className="p-2">
        <span>
            <Bug aria-hidden='true' focusable='false'/>
            <p>NEW PASSWORD IS REQUIRED</p>
        </span>
      </div>
      )}
      {/* CONFIRM NEW PASSWORD: uses the same show/hide toggle as the new password */}
      <div className="p-2" id='newPasswordBlock3'>
        <label className='editUserLabel' htmlFor='confirmNewPasswordInput'>CONFIRM NEW PASSWORD</label>
        <div className='inputDiv'>
            <input
                className='input'
                id='confirmNewPasswordInput'
                type={showNewPswd ? 'text' : 'password'}
                required
                autoComplete='new-password'
                placeholder='CONFIRM NEW PASSWORD'
                name='confirmNewPassword'
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                // ARIA ATTRIBUTES:
                aria-required='true'
                aria-invalid={confirmNewPassword && confirmNewPassword !== newPassword ? 'true' : 'false'}
            />
            <small><Asterisk color='#C22419' fontWeight={700} size={12} aria-hidden='true' focusable='false' /></small>
        </div>
      </div>
      {confirmNewPassword && confirmNewPassword !== newPassword && (
        <div className="p-2">
        <span>
            <Bug aria-hidden='true' focusable='false'/>
            <p>PASSWORDS DO NOT MATCH</p>
        </span>
      </div>
      )}
    </Stack>
    </fieldset>
        {/* Password Message */}
            {passwordMsg && (
                <div id='editPswdMsgDiv' aria-live='polite'>
                    <h6 className='msgText' aria-label='Password Message Text'>
                        We will never share <br/>your password
                    </h6>
                </div>
            )}
        </div>
        {/* =====EDIT PASSWORD STACK 3============= */}
       <Stack gap={3} id='editPasswordStack3'>
        <div className="p-2" id='editPswdBlock1'>
        <span className='requiredInfoSpan'>
        <small className='required'>
                        <Asterisk color='#C22419' fontWeight={700} size={12} aria-hidden='true' focusable='false' /> 
                    </small>
            <p>Indicates required information</p>
        </span>
                    {/* Legend explaining what the asterisk icons mean throughout the form */}
                    
                </div>
                 <div className="p-2" id='editPswdBlock2'>
                    <Button
                    variant='light'
                    id='editPswdBtn'
                    type='submit'
                    disabled={loading}
                    // ARIA ATTRIBUTES:
                    role='button'
                    aria-label={loading ? 'Saving…' : 'EDIT PASSWORD'}
                    aria-disabled={loading}
                    >
                    {loading ? 'Saving...': 'EDIT PASSWORD'}

                    </Button>
                 </div>
      <div className="p-2" id='editPswdBlock3'>
        <Button
            variant='danger'
            type='button'
            id='clearFormBtn'
            onClick={resetForm}
            disabled={loading}
            // ARIA ATTRIBUTES
        >
            CLEAR FORM
        </Button>
      </div>
    </Stack>
    </form>
  )
}
