import React, { useState } from 'react'
import '../css/componentCss/LoginForm.css'
import '../css/componentCss/FormSetup.css'
import Stack from 'react-bootstrap/Stack';
import Button from 'react-bootstrap/Button';

export default function LoginForm({userData}) {
  const [showPswd, setShowPswd] = useState(false)

  return (
    <form id='loginForm' method='POST'>
        <div>
          <h3>SIGN IN</h3>
        </div>
        <div id='loginFormInput'>
         <Stack gap={3} id='loginStack1'>
      <div className="p-2">
        <label>USERNAME</label>
        <input
          className='input'
          placeholder='USERNAME'
          id='loginUsername'
          type='text'
          required
          autoComplete='username'
          name='username'
          value={userData.username}
          // onChange={}
          // ARIA ATTRIBUTES:
        />
      </div>
      <div className="p-2">Second item</div>
      <div className="p-2">Third item</div>
    </Stack>
     <Stack gap={3} id='loginStack2'>
      <div className="p-2">
        <label>PASSWORD:</label>
        <div>
          <input
          id='loginPasswordInput'
            className='input'
            type='password'
            required
            placeholder='PASSWORD'
            name='password'
            value={userData.password}
            // onChange={}
          />
          
        </div>
        
      </div>
      <div className="p-2">Second item</div>
      <div className="p-2">Third item</div>
    </Stack>

        </div>
    </form>
  )
}
