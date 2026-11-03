import React, { useState, useMemo, useCallback } from 'react'
import '../css/componentCss/EditUser.css'
import '../css/componentCss/FormSetup.css'
import Stack from 'react-bootstrap/Stack';
import Button from 'react-bootstrap/Button';
import { Asterisk , Bug, Eye, EyeOff} from 'lucide-react';


export default function EditPassword(
    {
        setError
    }
) {
    const [currentPassword, setCurrentPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
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
        !String(newPassword || '').trim, 
        [newPassword]
    )

    const currentPswdError = touched.currentPassword && currentPswdEmpty;
    const newPswdError = touched.newPassword && newPswdEmpty;

     //=============================================
    const isStrongPassword =useCallback((pwd)=> {
        return /^(?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z\d!@#$%^&*(),.?":{}|<>]{8,}$/ //Regex pattern to check for at least 8 characters and one special character
            .test(
                String(pwd || '')// Ensure pwd is a string before testing
            );
    },[])
    const resetForm = useCallback(() => {
        const confirmReset = window.confirm(
            "Are you sure you want to clear the form?"
        )
        if (!confirmReset) return;
        setCurrentPassword('')
        setNewPassword('')
    },[])

    const editPassword = useCallback(async(e) => {
        e.preventDefault()//Prevent default form submission
        setLoading(true)
        setError?.(null)
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
            const token = localStorage.getItem('token');// Retrieve JWT token from local storage
            //Conditional rendering to check if token exists
            if (!token) {
                const msg = 'User is not authenticated. Please log in again.';// Error message for missing token
                setError?.(msg);// Set the error state to display the error in the UI
                alert(msg);// Alert user of error
                return;// Exit the function early
            }
            const response = await fetch (`http://localhost:3001/users/editPassword`, {
                method: 'PATCH',
                mode: 'cors',
                headers: {
                    'Content-Type': 'application/json',// Specify the Content-Type in the request payload
                    'Authorization': `Bearer ${token}`,// Attach JWT token for authorization
                },
                body: JSON.stringify({// Convert the password data to a JSON string
                    currentPassword,
                    newPassword
                })
            })
             const data = await response.json().catch(() => ({}));
             if (!response.ok) {
                const errorMessage = data.message || 'Failed to change password.';//Default error message
                setError?.(errorMessage);// Set the error state to display the error in the UI
                alert(errorMessage);// Alert user of error
                return;// Exit the function early
            }

            // Clear form fields directly — avoids the window.confirm in resetForm
            setCurrentPassword('');
            setNewPassword('');
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
            setLoading(false)
        }
    },[setError, currentPassword, newPassword, isStrongPassword])
     // ========= IDs USED BY aria-labelledby / aria-describedby =========
const formTitleId = 'editPasswordFormTitle';
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
   <Stack gap={3}>
      <div className="p-2" id='currentPasswordBlock1'>
        <label className='editUserLabel'>CURRENT PASSWORD:</label>
        <div className='inputDiv'>
            <input
                className='input'
                id='currentPasswordInput'
                type={showCurrentPswd ? 'text' : 'password'}
                name='currentPassword'
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                onFocus={() => setPasswordMsg(true)}
                onBlur={() => setPasswordMsg(false)}
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
      {/* <div className="p-2"></div> */}
    </Stack>
        </fieldset>
         
    <fieldset id='editPasswordGroup2'>
        <legend>NEW PASSWORD</legend>
         {/* ========EDIT PASSWORD STACK 2=============== */}
<Stack gap={3} id='editPasswordStack2'>
      <div className="p-2" id='newPasswordBlock1'>
        <label className='editUserLabel'>NEW PASSWORD</label>
        <div className='inputDiv'>
            <input
                className='input'
                id='newPasswordInput'
                type={showNewPswd ? 'text' : 'password'}
                name='newPassword'
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                onFocus={() => setPasswordMsg(true)}
                onBlur={() => setPasswordMsg(false)}
            />
            <small><Asterisk color='#C22419' fontWeight={700} size={12} aria-hidden='true' focusable='false' /></small>
        </div>
      </div>
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
      <div className="p-2">
        <span>
            <Bug aria-hidden='true' focusable='false'/>
            <p>NEW PASSWORD IS REQUIRED</p>
        </span>
      </div>
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
        <div className="p-2" id='requiredInfo'>
                    {/* Legend explaining what the asterisk icons mean throughout the form */}
                    <small className='required'>
                        <Asterisk color='#C22419' fontWeight={700} size={12} aria-hidden='true' focusable='false' /> Indicates required information
                    </small>
                </div>
      <div className="p-2">
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
