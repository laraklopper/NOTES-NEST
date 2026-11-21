//Home.js
//IMPORT REQUIRED MODULES AND PACKAGES
import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
// IMPORT CSS STYLESHEETS
import '../css/pagesCss/PageSetup.css'
import '../css/pagesCss/Home.css'
import '../css/componentCss/Profile.css'
// IMPORT BOOTSTRAP COMPONENTS
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import Stack from 'react-bootstrap/Stack';
// IMPORT CUSTOM COMPONENTS
import MainHeader from '../components/MainHeader'
import Footer from '../components/Footer'
import Profile from '../components/Profile';
import EditProfile from '../components/EditProfile';
import EditPassword from '../components/EditPassword';
import NotesCalender from '../components/NotesCalender'
import AdminRegisForm from '../components/AdminRegisForm'
import UsersList from '../components/UsersList'
// IMPORT ICONS FROM LUCIDE-REACT
import { UserCheck, BookUp, FolderUser, Languages, ClipboardPenIcon, NotepadText, FolderClosed, FolderUsers, CalendarOff, CalendarFold } from 'lucide-react'
// IMPORT UTILITY FUNCTIONS
const { ADMIN_MIN_ACCOUNT_AGE_MS, ADMIN_MIN_AGE, calculateAge } = require('../util/userFunc')

//====MAIN HOME FUNCTION COMPONENT========
export default function Home(//Export default Home.js function component
  {//PROPS PASSED FROM PARENT COMPONENT (App.js)
    currentUser,
    setCurrentUser,
    setError,
    logout,
    loggedIn
  }) {
  //===========STATE VARIABLES=======================
  const [profile, setProfile] = useState(null)// Full user record for the profile tab
  const [editUser, setEditUser] = useState(false)
  const [editPassword, setEditPassword] = useState(false)
  const [showCalendar, setShowCalendar] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [showUsers, setShowUsers] = useState(false)
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

    const navigate = useNavigate()
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

  //========EVENT LISTENERS============
  // Toggle Functions
  // Function to toggles calendar
    const toggleCalendar = useCallback(() => {
     setShowCalendar(prev => (!prev))
    setShowProfile(false)
  },[])
  // Function to toggle userProfile
  const toggleProfile = useCallback(() => {
     setShowProfile(prev => (!prev))
    setShowCalendar(false)
  },[])
  const toggleUsersList = useCallback(() => {
    if (currentUser?.admin) {
       setShowUsers(prev => (!prev))
    setShowCalendar(false)
    setShowProfile(false)
    }
  },[currentUser?.admin])
  // Function to toggle editUser/profile form
  const toggleEditUser = useCallback(() => {
    setEditUser(prev => (!prev))
    setEditPassword(false)
  }, [])
  // Function to toggle edit password form
  const toggleEditPassword = useCallback(() => {
    setEditPassword(prev => (!prev))
    setEditUser(false)
  }, [])

  const user = profile || currentUser || {};

  // Opens a note picked on the calendar (noteId is passed in route state for Notes.js)
  const openNote = useCallback((noteId) => {
    navigate('/notes', { state: { noteId } })
  }, [navigate])

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
  const editUserProfile = useCallback(async (changes) => {//Define an async function to edit user details
    setError?.(null)// Clear old errors
    setProfileLoading(true)// Display loading state while saving
    try {
      // The browser sends the JWT cookie with the request
      const response = await fetch('/user/editProfile', {
        method: 'PATCH',//HTTP Request method
        headers: {
          'Content-Type': 'application/json',//Specify the Content-Type in the payload as JSON
        },
        body: JSON.stringify(changes)// Convert payload to JSON string
      })
      const data = await response.json().catch(() => ({}));// Safely parse JSON (avoid crash if server returns non-JSON)
      /* Conditional rendering to check if the response
         is not successful (status code is not in the range 200-299)*/
      if (!response.ok) {
        setError?.(data.message || 'Failed to update profile.')
        return false
      }
      setProfile(data.user)// Show the saved details in the profile panel
      setEditUser(false)// Close the form
      alert('Profile updated successfully.')
      return true
    } catch (error) {
      console.error('Error updating profile:', error);//Log an error message in the console for debugging purposes
      setError?.('An error occurred while updating your profile.')// Set the error state to display the error in the UI
      return false
    } finally {
      setProfileLoading(false)// Stop loading state
    }
  }, [setError])

const notProvided = 'Not provided';
   const firstName = user.fullName?.firstName || notProvided;
    const lastName = user.fullName?.lastName || notProvided;

  //======JSX RENDERING========
  return (
    <div id='pageContainer' role='main' aria-labelledby='pageTitle'>
    {/* ---------Screen Reader Heading------------- */}
    <p className='visually-hidden' id='pageTitle'>HOME PAGE</p>
      <MainHeader currentUser={currentUser} loggedIn={loggedIn}/>
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
       <div id='appDescriptionPanal' role='region'>
                <Row id='appDescriptionRow'>
                <Col id='appdescripCol1'/>
                  <Col id='appDescriptionCol' xs={12} md={10}>
                  {/* STACK 1: */}
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
                            <label className='listLabel'><NotepadText aria-hidden='true' focusable='false'/>NOTE PAD:</label>
                            <p>Write new notes and file them in notebooks and tags so they 
                            are easy to find later.</p>
                          </span>
                          <span className='listSpan'>
                            <label className='listLabel'><ClipboardPenIcon aria-hidden='true' focusable='false'/>NOTES:</label>
                            <p>View, filter, edit, archive and delete your
                              saved notes. Deleted notes go to the trash,<br/> where they can be
                              restored or removed permanently.</p>
                          </span>
                          <span className='listSpan'>
                            <label className='listLabel'><Languages aria-hidden='true' focusable='false'/>TRANSLATE:</label>
                            <p>Translate text and documents between languages,
                              detect the language of a piece of text,<br/> and save translations
                              you want to keep.</p>
                          </span>
                          <span className='listSpan'>
                            <label className='listLabel'><BookUp aria-hidden='true' focusable='false'/>EXPORT:</label>
                            <p>Download your notes or translations as a
                              CSV or Excel (.xlsx) file.</p>
                          </span>
                          <span className='listSpan'>
                            <label className='listLabel'><FolderUser aria-hidden='true' focusable='false'/>PROFILE:</label>
                            <p>View and update your personal details
                              and change your password from the Profile tab.</p>
                          </span>
                        </div>
                      </div>
                    </Stack>
                  </Col>
                  <Col id='appdescripCol2'/>
                </Row>  
                </div>
                </section>
                {/* -----------------
                SECTION 2:
                ------------ */}
                <section id='homeSection2'>
                <div id='section2Panal'>
<Row id='homeToggleRow'>
        <Col id='homeToggleCol1'/>
        <Col xs={5} id='homeToggleCol'>
        {/* STACK 2: */}
        <Stack gap={3} id='homeToggleStack'>
      <div className="p-2" id='toggleCalendarBlock'>
      {showCalendar ? (
        <span className='btnTextSpan'>
          <h6>CLOSE NOTES CALENDAR</h6>
          <CalendarOff/>
        </span>
      ):(
        <span className='btnTextSpan'>
          <h6>OPEN NOTES CALENDAR</h6>
          <CalendarFold/>
        </span>
      )}
           <Button
          variant='light'
          onClick={toggleCalendar}
          id='toggleCalendarBtn'
          // ARIA ATTRIBUTES:
          aria-label={showCalendar ? 'HIDE CALENDAR': 'SHOW CALENDAR'}
          aria-pressed={showCalendar}
          aria-expanded={showCalendar}
          aria-controls='calendarPanal'
          >
          {showCalendar ? 'HIDE CALENDAR': 'OPEN CALENDAR'}
          </Button>
      </div>
      <div className="p-2" id='toggleProfileBlock'>
      {showProfile ? (
        <span className='btnTextSpan'>
          <h6>CLOSE USER PROFILE</h6>
          <FolderUser aria-hidden='true' focusable='false'/>
        </span>
      ):(
        <span className='btnTextSpan'>
           <h6>OPEN USER PROFILE</h6>
          <FolderUser aria-hidden='true' focusable='false'/>
        </span>
      )}
         <Button
          variant='light'
          onClick={toggleProfile}
          id='showProfileBtn'
          type='button'
          // ARIA ATTRIBUTES:
          aria-label={showProfile ? 'Hide Profile': 'Show Profile'}
          aria-pressed={showProfile}
          aria-expanded={showProfile}
          aria-controls='userProfilePanal'
          >
            {showProfile ? 'Hide Profile': 'Show Profile'}
          </Button>
      </div>
    </Stack>
        </Col>
        <Col id='homeToggleCol2'/>
      </Row>
      {/* TOGGLE NOTES CALENDAR */}
      {showCalendar && (
<div id='calendarPanal'>
            <NotesCalender onOpenNote={openNote}/>
        </div>
      )} 
      {/* TOGGLE USER PROFILE (Edit Profile + EditPassword) */}
      <div id='showProfileDiv'>
        {/* PROFILE */}
       {showProfile && (
 <div id='userProfilePanal'>
                <div id='userProfileDisplay'>
                  <Row id='userProfileRow'>
                    <Col id='userProfileCol'>
                    {/* Render Profile.js component */}
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
                <div id='editUserDataPanal'>
                {/* TOGGLE EDIT PROFILE */}
                     {editUser && (
            <div id='editProfileBlock'>
              <Row id='editProfileRow'>
                <Col id='editProfileCol1' />
                <Col id='editProfileCol' xs={12} md={10}>
                  <div id='editProfilePanal'>
                  {/* Render the EditProfile.js component */}
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
        )}
        {/* TOGGLE EDIT PASSWORD FORM */}
        {editPassword && (
            <div id='editPasswordBlock'>
              <Row id='editPasswordRow'>
                <Col id='editPasswordCol1' />
                <Col xs={12} md={6} id='editPasswordCol'>
                  <div id='editPasswordPanal'>
                  {/* Render the EditPassword.js component*/}
                    <EditPassword setError={setError} />
                  </div>
                </Col>
                <Col id='editPasswordCol2' />
              </Row>
            </div>
        )}
          </div>
        </div>
       )}
      </div>       
        </div>
      </section>
      {/* ADMIN JSX: UsersList + admin registration form */}
        <div id='adminPanal'>
        {currentUser?.admin &&(    
          <section id='adminSection'>
          <Row id='toggleUsersRow'>
        <Col id='toggleUsersCol1'/>
        <Col xs={5} id='toggleUsersCol'>
          <div id='toggleUsersDiv'>
             {showUsers ? (
                <span className='btnTextSpan'>
                  <h6>CLOSE USERS LIST</h6>
                  <FolderClosed aria-hidden='true' focusable='false'/>
                </span>
              ):(
                <span className='btnTextSpan'>
                <h6>OPEN USERS LIST</h6>
                <FolderUsers aria-hidden='true' focusable='false'/>
                </span>
              )}
            <Button
            variant='light'
            onClick={toggleUsersList}
            id='toggleUsersBtn'
            type='button'
            // ARIA ATTRIBUTES:
            aria-label={showUsers ? 'Hide Users': 'Show Users'}
            aria-pressed={showUsers}
            aria-expanded={showUsers}
            aria-controls='usersListPanal'
            >
              {showUsers ? (
                <>Hide Users</>
              ):(
                <>Show Users<FolderUser aria-hidden='true' focusable='false'/></>
              )}
            </Button>
          </div>
        </Col>
        <Col id='toggleUsersCol2'/>
      </Row>
      {showUsers && (
        <div id='usersListPanal'>
             <UsersList/>
          </div>
      )}
      </section>
      )}
      </div>
      <div id='adminRegisPanal'>
        {/*  TOGGLE ADMIN REGISTRATION FORM: Only display form if user is not
        an admin user  and matches the age requirement of 21 years and has
        been a user for 3 months (1 day during development) */}
        {showAdminForm && (
          <section id='adminRegisSec' >
            <div id='adminRegisDiv'>
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
      <Footer logout={logout} loggedIn={loggedIn}/>
    </div>
  )
}
