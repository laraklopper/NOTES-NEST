//LoginForm.js
//IMPORT REQUIRED MODULES AND PACKAGES
import React, { useMemo, useState } from 'react'
// IMPORT CSS STYLESHEETS
import '../css/componentCss/LoginForm.css'
import '../css/componentCss/FormSetup.css'
// IMPORT BOOTSTRAP COMPONENTS
import Stack from 'react-bootstrap/Stack';
import Button from 'react-bootstrap/Button';
// IMPORT ICONS FROM LUCIDE-REACT
import { Bug, Eye, EyeOff } from 'lucide-react';

//LoginForm function component
export default function LoginForm(//Export default LoginForm component
  {//Export default LoginForm component
    userData,
    setUserData,
    submitLogin,
    loading
  }) {
  // =========STATE VARIABLES==============
  const [showPswd, setShowPswd] = useState(false)// State to toggle password visibility
  const [usernameMsg, setUsernameMsg] = useState(false)// State to control display of username help message
  const [showPswdMsg, setShowPswdMsg] = useState(false)// State to control display of password help message
  const [touched, setTouched] = useState({// State to track if fields have been touched for validation purposes
    username: false,
    password: false
  })

  // Checks if username is empty
  const usernameEmpty = useMemo(// Memorises the validation result until userData.username changes
    () => !String(userData.username || '').trim(),// Returns true if username is empty, missing, or only contains spaces
    [userData.username] // Recalculate only when the username value changes
  )
  // Checks if password is empty
  const passwordEmpty = useMemo(// Memorises the validation result until userData.password changes
    () => !String(userData.password || '').trim(),// Returns true if password is empty, missing, or only contains spaces
    [userData.password]// Recalculate only when the password value changes
  )

  const showUsernameError = touched.username && usernameEmpty;// Show username error only after field was touched
  const showPasswordError = touched.password && passwordEmpty;// Show password error only after field was touched

  //=================EVENT LISTENERS===================
  // Function to handle form submission
  const handleLogin = (event) => {
    event.preventDefault()
    submitLogin();
  }
  //Function to handle Input change in the Login Form
  const handleLoginInput = (event) => {
    const { name, value } = event.target;// Get the input field's name attribute and its current typed value.
    setUserData((prev) => ({// Update the userData object stored in the parent component.
      ...prev, // Keep the existing values in userData, such as the other input field.
      // Update only the field that the user is currently typing into.
      [name]: value,// [name] uses the input's name attribute as the object key.
    }))
  }

  // ========= IDs USED BY aria-labelledby / aria-describedby =========
  // Keeps ARIA references stable and readable
  const formTitleId = 'loginFormTitle';
  const usernameHelpId = 'loginUsernameHelp';
  const passwordHelpId = 'loginPasswordHelp';
  // error IDs (for aria-describedby)
  const usernameErrorId = 'loginUsernameError';
  const passwordErrorId = 'loginPasswordError';

  //==================JSX RENDERING======================
  return (
    <form id='loginForm' method='POST' onSubmit={handleLogin} aria-labelledby={formTitleId}>
      {/* ---------Screen Reader Heading---------- */}
      <p className='visually-hidden' id={formTitleId}>LOGIN FORM</p>
      {/* ==========FORM HEADING=============== */}
      <div id='formHeadingBlock'>
        <h3 id='formHeading'>SIGN IN</h3>
      </div>
      {/* =========LOGIN DETAILS================ */}
      <div id='loginFormInput'>
        {/* =========STACK 1======================= */}
        <Stack gap={3} id='loginStack1'>
          {/* USERNAME: value={userData.username} */}
          <div className="p-2" id='loginBlock1'>
            <label className='loginLabel' htmlFor='loginUsername'>USERNAME</label>
            <input
              className='input'
              placeholder='USERNAME'
              id='loginUsername'
              type='text'
              required
              autoComplete='username'
              name='username'
              value={userData.username}
              onChange={handleLoginInput}
              onFocus={() => setUsernameMsg(true)}
              onBlur={() => {
                setUsernameMsg(false)
                setTouched((prev) => ({ ...prev, username: true }))
              }}
              inputMode='text'
              // ARIA ATTRIBUTES:
              aria-label='Login Username Input'
              aria-required='true'
              aria-invalid={showUsernameError ? 'true' : 'false'}
              aria-describedby={[
                usernameMsg ? usernameHelpId : null,
                showUsernameError ? usernameErrorId : null,
              ]
                .filter(Boolean)
                .join(' ')}
            />
          </div>
          {/* Username error message */}
          {showUsernameError && (
            <div className="p-2" id={usernameErrorId} aria-live='assertive'>
              <p className='loginErrorMsg'><Bug />Username is required</p>
            </div>
          )}
          {/* Username help message */}
          {usernameMsg && (
            <div className="p-2" id={usernameHelpId} aria-live='polite'>
              <p className='loginHelpMessage'>Enter Your Username</p>
            </div>
          )}
        </Stack>
        {/* ========STACK 2============== */}
        <Stack gap={3} id='loginStack2'>
          {/* PASSWORD INPUT:value={userData.password} */}
          <div className="p-2" id='loginPswdBlock1'>
            <label className='loginLabel' htmlFor='loginPasswordInput'>PASSWORD:</label>
            <div id='pswdInputDiv'>
              <input
                type={showPswd ? 'text' : 'password'}
                id='loginPasswordInput'
                className='input'
                required
                placeholder='PASSWORD'
                inputMode='text'
                name='password'
                autoComplete='current-password'
                value={userData.password}
                onChange={handleLoginInput}
                onFocus={() => setShowPswdMsg(true)}
                onBlur={() => {
                  setShowPswdMsg(false)
                  setTouched((prev) => ({ ...prev, password: true }))
                }}
                //ARIA ATTRIBUTES:
                aria-label='password'
                aria-required="true"
                aria-invalid={showPasswordError ? 'true' : 'false'}
                aria-describedby={[
                  showPswdMsg ? passwordHelpId : null,
                  showPasswordError ? passwordErrorId : null,
                ]
                  .filter(Boolean)
                  .join(' ')}
              />
            </div>
          </div>
          <div className="p-2" id='loginPswdBlock2'>
            {/* Button to toggle Password Visibility */}
            <Button
              id='showPswdBtn'
              variant='warning'
              size='sm'
              onClick={() => setShowPswd(!showPswd)}
              // ARIA ATTRIBUTES
              aria-pressed={showPswd}
              aria-expanded={showPswd}
              aria-controls='loginPasswordInput'
              aria-label={showPswd ? 'Hide Password' : 'Show Password'}
            >
              {showPswd ?
                <>
                  Hide Password
                  <EyeOff
                    size={20}
                    fontWeight={700}
                    // ARIA ATTRIBUTES:
                    aria-label='Hide password'
                    aria-hidden='true'
                    focusable='false' />
                </> : <>
                  Show Password
                  <Eye
                    size={20}
                    fontWeight={700}
                    // ARIA ATTRIBUTES:
                    aria-label='Show password'
                    aria-hidden='true'
                    focusable='false' />
                </>
              }
            </Button>
          </div>
          {/* password error message */}
          {showPasswordError && (
            <div id={passwordErrorId} aria-live='assertive'>
              <p className='loginErrorMessage'>
                <Bug size={20} fontWeight={900} aria-hidden='true' focusable='false' />Password is required</p>
            </div>
          )}
          {/* password help message */}
          {showPswdMsg && (
            <div className="p-2" id={passwordHelpId} aria-live='polite'>
              <p className='loginHelpMessage'>We will never share your password</p>
            </div>
          )}
        </Stack>
      </div>
      {/* ---------END OF INPUT-------------------- */}
      <div>
        {/* Button to submit Login form */}
        <Button
          id='loginBtn'
          variant='light'
          type='submit'
          disabled={loading}
          // ARIA ATTRIBUTES
          role='button'
          aria-busy={loading}
          aria-label={loading ? 'LOGGING IN...' : 'LOGIN'}
          aria-disabled={loading}
        >
          {loading ? 'LOGGING IN...' : 'LOGIN'}
        </Button>
      </div>
    </form>
  )
}
