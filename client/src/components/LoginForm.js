import React, { useState } from 'react'
import '../css/componentCss/LoginForm.css'
import '../css/componentCss/FormSetup.css'
import Stack from 'react-bootstrap/Stack';
import Button from 'react-bootstrap/Button';
import { Eye, EyeOff } from 'lucide-react';

export default function LoginForm({userData, setUserData}) {
  const [showPswd, setShowPswd] = useState(false)
  const [showPswdMsg, setShowPswdMsg] = useState(false)

      //Function to handle Input change in the Login Form
    const handleLoginInput =(event) =>{
        const { name, value} = event.target;// Get the input field's name attribute and its current typed value.
        // Update the userData object stored in the parent component.
        setUserData((prev) => ({
            ...prev, // Keep the existing values in userData, such as the other input field.
            // Update only the field that the user is currently typing into.
            // [name] uses the input's name attribute as the object key.
            [name] : value,
        }))
    }
  return (
    <form id='loginForm' method='POST'>
        <div id='formHeadingBlock'>
          <h3 id='formHeading'>SIGN IN</h3>
        </div>
        <div id='loginFormInput'>
         <Stack gap={3} id='loginStack1'>
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
          // ARIA ATTRIBUTES:
        />
      </div>
      {/* <div className="p-2">Second item</div>
      <div className="p-2">Third item</div> */}
    </Stack>
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
            name='password'
            value={userData.password}
            onChange={handleLoginInput}
            onFocus={() =>setShowPswdMsg(true)}
            onBlur={() => setShowPswdMsg(false)}
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

          >
          {showPswd ? (
            <>
            Hide Password
              <EyeOff/>
            </>
          ):(
            <>
            Show Password
              <Eye/>
            </>
          )}

          </Button>
       </div>
      {showPswdMsg && (
        <div className="p-2">
          <p>WE WILL NEVER SHARE YOUR PASSWORD</p>
        </div>
      )}
     
    </Stack>

        </div>
        <div>
          <Button
          id='loginBtn'
          variant='light'
          >
            LOGIN
          </Button>
        </div>
    </form>
  )
}
