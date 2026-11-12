// AdminRegisForm.js
import React, { useCallback, useState } from 'react'
// IMPORT CSS STYLESHEETS
import '../css/componentCss/RegistrationForm.css'
import '../css/componentCss/FormSetup.css'
// IMPORT BOOTSTRAP COMPONENTS
import Stack from 'react-bootstrap/Stack';
import Button from 'react-bootstrap/Button';
// IMPORT ICONS FROM LUCIDE REACT
import { ShieldUser, X } from 'lucide-react';
// IMPORT UTILITY FUNCTIONS
const {ADMIN_STATUS} = require('../util/userFunc')

export default function AdminRegisForm(
    {
        setCurrentUser,
        exitAdminForm,
        setError
    }) {
    //=====STATE VARIABLES==========
    const [adminStatus, setAdminStatus] = useState('')
    const [submitting, setSubmitting] = useState(false)


    const setAdmin = useCallback(async () => {
       try {
        /* Send a PATCH request to the '/auth/setAdmin' endpoint.
        The browser sends the JWT cookie, and the server re-sets it with the new admin claim */
        const response = await fetch('/auth/setAdmin', { method: 'PATCH' })

         const data = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(data?.message || 'Failed to register as admin');
      // Update the current user (state and the saved session) so admin-only links appear straight away
      const user = { userId: data.user.userId, fullName: data.user.fullName, admin: data.user.isAdmin === true }
      localStorage.setItem('currentUser', JSON.stringify(user))
      setCurrentUser?.(user)
      setError(null)
      console.log('[SUCCESS: AdminRegisForm.js] User registered as admin');
       } catch (error) {
        console.error('[ERROR: Home.js] Error setting user as admin:', error.message);
      setError(`Error setting user as admin: ${error.message}`)
       } 
    },[setError, setCurrentUser])

        // Function to submit registerAdminForm
    /* call the setAdmin request if YES is selected, exit the form if NO is selected */
    const handleAdminSubmit = async (e) => {
        e.preventDefault()
        if (adminStatus === 'NO') return exitForm()
        if (adminStatus !== 'YES') return
        setSubmitting(true)
        try {
            await setAdmin?.()
        } finally {
            setSubmitting(false)
        }
    }
    const exitForm = () => {
        const confirmExit = window.confirm(
            'Are you sure you want to exit? This option is only available once'
        )
        if(!confirmExit) return;
        exitAdminForm?.()
    }
    //=====================
  return (
    <form
    id='registerAdminForm'
    method='PATCH'
    onSubmit={handleAdminSubmit}
    aria-busy={submitting}
    >
         <p id='adminFormTitle' className='visually-hidden'>FORM TO REGISTER AS ADMIN</p>
             <Stack direction="horizontal" gap={3}>
      <div className="p-2" id='adminRegisBlock'>
        <label id='adminLabel' className='regisLabel' htmlFor='regisAdmin'>REGISTER AS ADMIN</label> 
        <select
        className='input'
        id='regisAdmin'
        value={adminStatus}
        onChange={(e) => setAdminStatus(e.target.value)}
        disabled={submitting}
        // ARIA ATTRIBUTES:
        aria-required='false'
        aria-disabled={submitting}
        >
            <option value={''}>SELECT</option>
            {ADMIN_STATUS.map((status) => (
                <option key={status} value={status}>
                    {status}
                </option>
            ))}
        </select>
      </div>
      <div className="p-2 ms-auto">
        <Button
        variant='light'
        type='submit'
            id='regisAdminBtn'
             disabled={!adminStatus || submitting}
            // ARIA ATTRIBUTES:
            role='button'
            aria-busy={submitting}
            aria-disabled={!adminStatus || submitting}

        >
            {submitting ? 'REGISTERING...': 'REGISTER AS ADMIN'}<ShieldUser aria-hidden='true' focusable='false'/>
        </Button>
      </div>
      <div className="vr" />
      <div className="p-2">
        <Button
        type='button'
        onClick={exitForm}
        disabled={submitting}
        //ARIA ATTRIBUTES:
        aria-label='Exit admin registration form'
        aria-disabled={submitting}
        >
          EXIT<X aria-hidden='true' focusable='false'/>
        </Button>
      </div>
    </Stack>
        <div id='adminMessageDiv'>
         <Stack gap={2} className="col-md-5 mx-auto" id='adminMsgStack'>
                <p className='infoText' id='adminMsg'>THIS OPTION IS ONLY AVAILABLE ONCE</p>
                <p className='infoText'>Admin users must be 21 years or older</p>
        </Stack>
    </div>


    </form>
  )
}
