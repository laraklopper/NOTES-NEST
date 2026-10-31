import React, { useMemo, useState } from 'react'
import '../css/componentCss/LoginForm.css'
import '../css/componentCss/FormSetup.css'
import Stack from 'react-bootstrap/Stack';
import Button from 'react-bootstrap/Button';
import { Bug, Eye, EyeOff } from 'lucide-react';

export default function LoginForm({
  userData, 
  setUserData,
submitLogin
}) {
  const [showPswd, setShowPswd] = useState(false)
  const [usernameMsg, setUsernameMsg] = useState(false)// State to control display of username help message
  const [showPswdMsg, setShowPswdMsg] = useState(false)
  const [touched, setTouched] = useState({// State to track if fields have been touched for validation purposes
        username: false,
        password: false
    })

  const usernameEmpty = useMemo(
    () => !String(userData.username || '').trim(),
    [userData.username]
  )
  const passwordEmpty = useMemo(
    () => !String (userData.password || '').trim,
    [userData.password]
  )

  const showUsernameError = touched.username && usernameEmpty;
  const showPasswordError = touched.password && passwordEmpty;

  // Function to handle form submission
  const handleLogin = (event) => {
    event.preventDefault()
    submitLogin();
  }
      //Function to handle Input change in the Login Form
    const handleLoginInput =(event) =>{
        const { name, value} = event.target;
        setUserData((prev) => ({
            ...prev, 
            [name] : value,
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

  return (
    <form id='loginForm' method='POST' onSubmit={handleLogin} aria-labelledby={formTitleId}>
      <p className='visually-hidden' id={formTitleId}>LOGIN FORM</p>
        <div id='formHeadingBlock'>
          <h3 id='formHeading'>SIGN IN</h3>
        </div>
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
                setTouched((prev)=> ({...prev, username: true}))}
                }
          inputMode='text'
          // ARIA ATTRIBUTES:
          aria-label='Login Username Input'
          aria-required='true'
          aria-invalid={usernameEmpty ? 'true' : 'false'}
          aria-describedby={[
            usernameMsg ? usernameHelpId: null,
            usernameEmpty ? usernameErrorId: null,
          ]
          .filter(Boolean)
          .join('')
          }
        />
      </div>
      {showUsernameError && (
        <div className="p-2" id={usernameErrorId} aria-live='assertive'>
          <p className='loginErrorMsg'><Bug/>Username is required</p>
        </div>
      )}
      {usernameMsg && (
        <div className="p-2" id={usernameHelpId} aria-live='polite'>
          <p className='loginHelpMessage'>Enter Your Username</p>
        </div> 
      )}
    </Stack>
    {/* ========STACK 2============== */}
     <Stack gap={3} id='loginStack2'>
      <div className="p-2" id='loginPswdBlock1'>
        <label className='loginLabel'>PASSWORD:</label>
        <div id='pswdInputDiv'>
          <input
          type={showPswd ? 'text': 'password'}
          id='loginPasswordInput'
            className='input'
            required
            placeholder='PASSWORD'
            inputMode='text'
            name='password'
            value={userData.password}
            onChange={handleLoginInput}
            onFocus={() => setShowPswdMsg(true)}
            onBlur={() => {
                setShowPswdMsg(false)
                setTouched((prev) => ({...prev, password: true}))
            }}
            //ARIA ATTRIBUTES:
            aria-label='password'
                            aria-required="true"
                            aria-invalid={passwordEmpty ? 'true' : 'false'}
                            aria-describedby={[
                                showPswdMsg ? passwordHelpId : null,
                                passwordEmpty ? passwordErrorId : null,
                            ]
                                .filter(Boolean)
              .join(' ')}
          />
        </div>
      </div>
       <div className="p-2" id='loginPswdBlock2'>
        <Button
          id='showPswdBtn'
          variant='warning'
          size='sm'
          onClick={() => setShowPswd(!showPswd)}
          // ARIA ATTRIBUTES
          aria-pressed={showPswd}
          aria-expanded={showPswd}
          aria-controls='loginPasswordInput'
          aria-label={showPswd ? 'Hide Password': 'Show Password'}
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
                  focusable='false'/>
            </> : <>
              Show Password
              <Eye
                  size={20}
                  fontWeight={700}
                  // ARIA ATTRIBUTES:
                  aria-label='Show password'
                  aria-hidden='true'
                  focusable='false'/>
          </>
          }
          </Button>
       </div>
          {showPasswordError && (
              <div id={passwordErrorId} aria-live='assertive'>
                  <p className='loginErrorMessage'>
                      <Bug size={20} fontWeight={900} aria-hidden='true' focusable='false'/>Password is required</p>
              </div>
          )}
          {showPswdMsg && (
              <div className="p-2" id={passwordHelpId} aria-live='polite'>
                  <p className='loginHelpMessage'>We will never share your password</p>
              </div>
          )} 
    </Stack>
        </div>
        <div>
          <Button
          id='loginBtn'
          variant='light'
          type='submit'
          // ARIA ATTRIBUTES
          >
            LOGIN
          </Button>
        </div>
    </form>
  )
}
