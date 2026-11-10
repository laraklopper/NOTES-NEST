//Profile.js
import React, { useCallback, useState } from 'react'
import '../css/componentCss/Profile.css'
import Stack from 'react-bootstrap/Stack';
import Button from 'react-bootstrap/Button';

//====MAIN PROFILE FUNCTION COMPONENT========
export default function Profile(
  {//PROPS PASSED FROM PARENT COMPONENT (Home.js)
    user = {},
    editUser,
    editPassword,
    toggleEditUser,
    toggleEditPassword,
    setCurrentUser,
    setError
  }) {
    const [clearingAdmin, setClearingAdmin] = useState(false)
    const notProvided = 'Not provided';
    const firstName = user.fullName?.firstName || notProvided;
    const lastName = user.fullName?.lastName || notProvided;
    const fullName = [user.fullName?.firstName, user.fullName?.lastName].filter(Boolean).join(' ') || notProvided;
    const username = user.username || notProvided;
    const email = user.contactDetails?.email || notProvided;
    const contactNumber = user.contactDetails?.contactNumber || notProvided;
    const sourceLanguage = user.defaultLanguages?.defaultSourceLanguage || notProvided;
    const targetLanguage = user.defaultLanguages?.defaultTargetLanguage || notProvided;
    const noteLanguage = user.defaultLanguages?.defaultNoteLanguage || notProvided;
    const dateOfBirth = user.dateOfBirth
      ? new Date(user.dateOfBirth).toLocaleDateString()
      : notProvided;


      const clearAdminStatus = useCallback(async () => {
        setClearingAdmin(true)
        try {
          /* Send request to /auth/clearAdmin endpoint.
          The browser sends the JWT cookie, and the server re-sets it with the new admin claim */
      const response = await fetch('/auth/clearAdmin', { method: 'PATCH' })
      const data = await response.json().catch(() => ({}));
       if (!response.ok) throw new Error(data?.message || 'Failed to remove admin status');
      // Do not display AdminRegisForm.js (Home.js) again
      localStorage.setItem(`adminFormDismissed_${data.user?.userId}`, 'true')
      // Update the current user (state and the saved session) so admin-only links are hidden
      const user = { userId: data.user.userId, fullName: data.user.fullName, admin: data.user.isAdmin === true }
      localStorage.setItem('currentUser', JSON.stringify(user))
      setCurrentUser?.(user)
      setError?.(null)
      console.log('[SUCCESS: Profile.js] Admin status removed');
        } catch (error) {
           console.error('[ERROR: Profile.js] Error removing admin status:', error.message);
      setError?.(`Error removing admin status: ${error.message}`)
        }finally{
          setClearingAdmin(false)
        }
        
      },[setError,setCurrentUser ])
    //======JSX RENDERING========
  return (
    <div id='userProfile'>
      {/* PROFILE HEADER */}
      <Stack direction="horizontal" gap={3} id='userProfileHeader'>
        <div className="p-2">
          {/* FULL NAME (loggedIn user Full Name) */}
          <h4 id='userProfileHeading'>{fullName}</h4>
        </div>
        <div className="p-2 ms-auto">
          <Button
          variant='warning'
          id='editProfileToggleBtn'
          type='button'
          onClick={toggleEditUser}
          //ARIA ATTRIBUTES:
          aria-label={editUser ? 'Hide Form': 'Edit Profile'}
          aria-pressed={editUser}
          aria-expanded={editUser}
          aria-controls='editUserSec'
          >
          {editUser ? 'Hide Form': 'Edit Profile'}
          </Button>
        </div>
        <div className="p-2">
          <Button
          variant='warning'
          id='editPasswordToggleBtn'
          type='button'
          onClick={toggleEditPassword}
          aria-label={editPassword ? 'Hide Form': 'Edit Password'}
          aria-expanded={editPassword}
          aria-pressed={editPassword}
          aria-controls='editPswdSection'
          >
            {editPassword ? 'Hide Form': 'Edit Password'}
          </Button>
        </div>
      </Stack>
      <div id='userProfileBody'>
        {/* PROFILE BODY STACK 1 */}
        <Stack gap={3} id='profileStack1'>
          {/* USERNAME */}
          <div className="p-2 userProfileBlock" id='userProfileBlock1'>
            <span className='userDataSpan'>
              <label className='userProfileLabel'>USERNAME:</label>
              <p className='userProfileValue'>{username}</p>
            </span>
          </div>
          {/* CONTACT DETAILS */}
          <div className="p-2 userProfileBlock" id='userProfileBlock2'>
            <label className='userProfileHeadingLabel'>CONTACT DETAILS</label>
            <div className='userDataDiv'>
              <span className='userDataSpan'>
                <label className='userProfileLabel'>EMAIL:</label>
                <p className='userProfileValue'>{email}</p>
              </span>
              <span className='userDataSpan'>
                <label className='userProfileLabel'>CONTACT NUMBER:</label>
                <p className='userProfileValue'>{contactNumber}</p>
              </span>
            </div>
          </div>
          {/* DEFAULT TRANSLATION LANGUAGES */}
          <div className="p-2 userProfileBlock" id='userProfileBlock3'>
            <label className='userProfileHeadingLabel'>DEFAULT LANGUAGES</label>
            <div className='userDataDiv'>
              <span className='userDataSpan'>
                <label className='userProfileLabel'>SOURCE LANGUAGE:</label>
                <p className='userProfileValue'>{sourceLanguage}</p>
              </span>
              <span className='userDataSpan'>
                <label className='userProfileLabel'>TARGET LANGUAGE:</label>
                <p className='userProfileValue'>{targetLanguage}</p>
              </span>
              <span className='userDataSpan'>
                <label className='userProfileLabel'>NOTES LANGUAGE:</label>
                <p className='userProfileValue'>{noteLanguage}</p>
              </span>
            </div>
          </div>
        </Stack>
        {/* PROFILE BODY STACK 2 */}
        <Stack gap={3} id='profileStack2'>
          {/* FULL NAME */}
          <div className="p-2 userProfileBlock" id='userProfileBlock4'>
            <label className='userProfileHeadingLabel'>FULL NAME</label>
            <div className='userDataDiv'>
              <span className='userDataSpan'>
                <label className='userProfileLabel'>FIRST NAME:</label>
                <p className='userProfileValue'>{firstName}</p>
              </span>
              <span className='userDataSpan'>
                <label className='userProfileLabel'>LAST NAME:</label>
                <p className='userProfileValue'>{lastName}</p>
              </span>
            </div>
          </div>
          {/* DATE OF BIRTH */}
          <div className="p-2 userProfileBlock" id='userProfileBlock5'>
            <span className='userDataSpan'>
              <label className='userProfileLabel'>DATE OF BIRTH:</label>
              <p className='userProfileValue'>{dateOfBirth}</p>
            </span>
          </div>
          {/* ADMIN STATUS */}
          <div className="p-2 userProfileBlock" id='userProfileBlock6'>
            <span className='userDataSpan'>
              <label className='userProfileLabel'>IS ADMIN:</label>
              <p className='userProfileValue'>{user.admin ? 'YES' : 'NO'}</p>
            </span>
            {user.admin && (
              <Button 
                variant='danger' 
                type='button'
                onClick={clearAdminStatus}
                id='deleteAdminBtn'
                disabled={clearingAdmin}
                // ARIA ATTRIBUTES:
                aria-label={clearingAdmin ? 'REMOVING...' : 'DELETE ADMIN STATUS'}
              aria-busy={clearingAdmin}
              aria-disabled={clearingAdmin}
                >
                {clearingAdmin ? 'REMOVING...' : 'DELETE ADMIN STATUS'}
              </Button>
            )}
          </div>
        </Stack>
      </div>
    </div>
  )
}
