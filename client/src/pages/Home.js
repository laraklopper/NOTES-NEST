//Home.js
//IMPORT REQUIRED MODULES AND PACKAGES
import React, { useState, useEffect, useCallback } from 'react'
// IMPORT CSS STYLESHEETS
import '../css/pagesCss/PageSetup.css'
import '../css/pagesCss/Home.css'
import '../css/componentCss/Profile.css'
import '../css/componentCss/Tabs.css'
// IMPORT BOOTSTRAP COMPONENTS
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Stack from 'react-bootstrap/Stack';
// IMPORT CUSTOM COMPONENTS
import Header from '../components/Header'
import Footer from '../components/Footer'
import Profile from '../components/Profile';
import EditProfile from '../components/EditProfile';
import EditPassword from '../components/EditPassword';
import AdminRegisForm from '../components/AdminRegisForm'
import { UserCheck } from 'lucide-react'
// IMPORT UTILITY FUNCTIONS
const { ADMIN_MIN_ACCOUNT_AGE_MS, ADMIN_MIN_AGE, calculateAge } = require('../util/userFunc')

//====MAIN HOME FUNCTION COMPONENT========
export default function Home(//Export default Home.js function component
  {//PROPS PASSED FROM PARENT COMPONENT (App.js)
    currentUser,
    setCurrentUser,
    setError,
    logout
  }) {
  //===========STATE VARIABLES=======================
  const [profile, setProfile] = useState(null)// Full user record for the profile tab
  const [editUser, setEditUser] = useState(false)
  const [editPassword, setEditPassword] = useState(false)
  const [profileLoading, setProfileLoading] = useState(false)// Disables the edit profile buttons while the update is saving
  const userId = currentUser?.userId// currentUser is { userId, fullName, admin } (see Login.js)
  const dismissKey = `adminFormDismissed_${userId}`
  // Id of the user who closed the form during this visit (re-renders the page)
  const [dismissedForId, setDismissedForId] = useState(null)
  /* Read localStorage on every render rather than once on mount, so the saved
  choice is picked up once the user's details have loaded */
  const adminFormDismissed = Boolean(userId) && (
    dismissedForId === userId ||
    localStorage.getItem(dismissKey) === 'true'
  )

  /* currentUser only holds userId, fullName and admin,
  so fetch the full profile from the server */
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch('/user/me', { method: 'GET' });
        if (!response.ok) {
          throw new Error('Failed to fetch profile');
        }
        setProfile(await response.json());
      } catch (error) {
        console.error('Error fetching profile:', error);
      }
    }
    fetchProfile();
  }, [currentUser?.userId]);

  const toggleEditUser = useCallback(() => {
    setEditUser(prev => (!prev))
    setEditPassword(false)
  }, [])
  const toggleEditPassword = useCallback(() => {
    setEditPassword(prev => (!prev))
    setEditUser(false)
  }, [])
  const user = profile || currentUser || {};

  // Hide the form and remember the choice so it is not displayed again
  const exitAdminForm = useCallback(() => {
    localStorage.setItem(dismissKey, 'true')
    setDismissedForId(userId)
  }, [dismissKey, userId])
  /* Function to display/render AdminRegisForm.js if user is not an admin user
  and matches the age requirement of 21 years and has been a user for 3 months
  (1 day during development) */
  /* dateOfBirth and createdAt are not on currentUser, so they come from the
  GET /user/me profile; the form stays hidden until the profile has loaded */
  const showAdminForm = Boolean(
    currentUser &&
    !currentUser.admin &&
    !adminFormDismissed &&
    profile?.dateOfBirth &&
    calculateAge(profile.dateOfBirth) >= ADMIN_MIN_AGE &&
    profile?.createdAt &&
    Date.now() - new Date(profile.createdAt).getTime() >= ADMIN_MIN_ACCOUNT_AGE_MS
  )
  //========EDIT USER REQUEST===============
  /* Sends only the changed fields (built by EditProfile.js).
  Returns true on success so the form knows to clear itself */
  const editUserProfile = useCallback(async (changes) => {
    setError?.(null)
    setProfileLoading(true)
    try {
      // The browser sends the JWT cookie with the request
      const response = await fetch('/user/editProfile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(changes)
      })
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError?.(data.message || 'Failed to update profile.')
        return false
      }
      setProfile(data.user)// Show the saved details in the profile panel
      setEditUser(false)// Close the form
      alert('Profile updated successfully.')
      return true
    } catch (error) {
      console.error('Error updating profile:', error);
      setError?.('An error occurred while updating your profile.')
      return false
    } finally {
      setProfileLoading(false)
    }
  }, [setError])

const notProvided = 'Not provided';
   const firstName = user.fullName?.firstName || notProvided;
    const lastName = user.fullName?.lastName || notProvided;

  //======JSX RENDERING========
  return (
    <div id='pageContainer' role='main' aria-labelledby='pageTitle'>
    {/* ---------Screen Reader Heading------------- */}
    <p className='visually-hidden' id='pageTitle'>ADMIN ONLY USERS PAGE</p>
      <Header currentUser={currentUser} />
      {/* ====EVENT/ANIMATION======== */}
      <Row id='eventRow'>
        <Col id='eventCol'>
          <div className='eventBar'>
            <div className='eventTrack'>
              <UserCheck className='eventSlide' color='#000' size={32} aria-hidden='true' focusable='false' />
            </div>
          </div>
        </Col>
      </Row>
      {/* -----------------------
      SECTION 1: 
      ------------ */}
      <section id='homeSection1'>
        {/* Application description */}
              <div id='appDescriptionPanal'>
                <Row id='appDescriptionRow'>
                  <Col id='appDescriptionCol' xs={12} md={10}>
                    <Stack gap={3} id='welcomeStack'>
                      <div className="p-2" id='welcomeBlock'>
                        <h3 className='appDescriptionHeading'>WELCOME TO NOTE NEST:</h3>
                        <span id='welcomeSpan'>
                        <h3 className='welcomeName'>{firstName}</h3>
                        <h3 className='welcomeName'>{lastName}</h3>

                        </span>
                        
                      </div>
                      <div className="p-2" id='descriptionListBlock'>
                        <h4 className='appDescriptionSubHeading'>WHAT YOU CAN DO</h4>
                        <div className='appDescriptionList'>
                          <span className='listSpan'>
                            <label className='listLabel'>NOTE PAD:</label><p>Write new notes and file them in
                              notebooks and tags so they are easy to find later.</p>
                          </span>
                          <span className='listSpan'>
                            <label className='listLabel'>NOTES:</label>
                            <p>View, filter, edit, archive and delete your
                              saved notes. Deleted notes go to the trash, where they can be
                              restored or removed permanently.</p>
                          </span>
                          <span className='listSpan'>
                            <label className='listLabel'>TRANSLATE:</label>
                            <p>Translate text between languages,
                              detect the language of a piece of text, and save translations
                              you want to keep.</p>
                          </span>
                          <span className='listSpan'>
                            <label className='listLabel'>EXPORT:</label>
                            <p>Download your notes or translations as a
                              CSV or Excel (.xlsx) file.</p>
                          </span>
                          <span className='listSpan'>
                            <label className='listLabel'>PROFILE:</label>
                            <p>View and update your personal details
                              and change your password from the Profile tab.</p>
                          </span>
                        </div>
                      </div>
                    </Stack>
                  </Col>
                </Row>
              </div>

      </section>
      {/* ----------------------
      SECTION 2: userProfile.js
      ---------------- */}
      <section id='homeSection2'>
        <div id='userProfile'>
              {/* user profile */}
              <div id='userProfilePanal'>
                <div id='userProfileDisplay'>
                  <Row id='userProfileRow'>
                    <Col id='userProfileCol'>
                      <Profile
                        user={user}
                        editUser={editUser}
                        editPassword={editPassword}
                        toggleEditUser={toggleEditUser}
                        toggleEditPassword={toggleEditPassword}
                        setCurrentUser={setCurrentUser}
                        setError={setError}
                      />
                    </Col>
                  </Row>
                </div>
              </div>
        </div>
      </section>
      <div id='editUserDataPanal'>
        {/* TOGGLE EDITPROFILE FORM */}
        {editUser && (
          <section id='editUserSec' className='userEditSection'>
            <div id='editProfileBlock'>
              <Row id='editProfileRow'>
                <Col id='editProfileCol1' />
                <Col id='editProfileCol' xs={12} md={10}>
                  <div id='editProfilePanal'>
                    <EditProfile
                      user={user}
                      editUserProfile={editUserProfile}
                      loading={profileLoading}
                    />
                  </div>
                </Col>
                <Col id='editProfileCol2' />
              </Row>
            </div>
          </section>
        )}
        {/* TOGGLE EDIT PASSWORD FORM */}
        {editPassword && (
          <section id='editPswdSection' className='userEditSection'>
            <div id='editPasswordBlock'>
              <Row id='editPasswordRow'>
                <Col id='editPasswordCol1' />
                <Col xs={6} id='editPasswordCol'>
                  <div id='editPasswordPanal'>
                    <EditPassword setError={setError} />
                  </div>
                </Col>
                <Col id='editPasswordCol2' />
              </Row>
            </div>
          </section>
        )}
        {/*  TOGGLE ADMIN REGISTRATION FORM: Only display form if user is not
        an admin user  and matches the age requirement of 21 years and has
        been a user for 3 months (1 day during development) */}
        {showAdminForm && (
          <section id='adminRegisSec' className='userEditSection'>
            <div>
              <Row>
                <Col id='adminFormCol1' />
                <Col id='adminFormCol' xs={12} md={10}>
                  <div>
                    <AdminRegisForm
                      exitAdminForm={exitAdminForm}
                      setError={setError}
                      setCurrentUser={setCurrentUser}
                    />
                  </div>
                </Col>
              </Row>
            </div>
          </section>
        )}
      </div>
      <Footer logout={logout} />
    </div>
  )
}
