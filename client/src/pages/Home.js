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
import Tab from 'react-bootstrap/Tab';
import Tabs from 'react-bootstrap/Tabs';
// IMPORT CUSTOM COMPONENTS
import Header from '../components/Header'
import Footer from '../components/Footer'
import Profile from '../components/Profile';
import EditProfile from '../components/EditProfile';
import EditPassword from '../components/EditPassword';
import AdminRegisForm from '../components/AdminRegisForm'
// IMPORT UTILITY FUNCTIONS
const {ADMIN_MIN_ACCOUNT_AGE_MS, ADMIN_MIN_AGE, calculateAge } = require('../util/userFunc')

//====MAIN HOME FUNCTION COMPONENT========
export default function Home(
  {//PROPS PASSED FROM PARENT COMPONENT (App.js)
    currentUser,
    setCurrentUser,
    setError,
    logout
  }) {
    const [key, setKey] = useState('home')
    const [profile, setProfile] = useState(null)// Full user record for the profile tab
    const [editUser, setEditUser] = useState(false)
    const [editPassword, setEditPassword] = useState(false)
    const [profileLoading, setProfileLoading] = useState(false)// Disables the edit profile buttons while the update is saving
const userId = currentUser?._id
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
    },[])
    const toggleEditPassword = useCallback(() => {
      setEditPassword(prev => (!prev))
      setEditUser(false)
    },[])
    const user = profile || currentUser || {};

    // Hide the form and remember the choice so it is not displayed again
  const exitAdminForm = useCallback(() => {
    localStorage.setItem(dismissKey, 'true')
    setDismissedForId(userId)
  },[dismissKey, userId])
    /* Function to display/render AdminRegisForm.js if user is not an admin user
    and matches the age requirement of 21 years and has been a user for 3 months 
    (1 day during development) */
    const showAdminForm = Boolean(
      currentUser &&
      !currentUser.admin &&
      !adminFormDismissed &&
      currentUser.dateOfBirth &&
      calculateAge(currentUser.dateOfBirth) >= ADMIN_MIN_AGE &&
      currentUser.createdAt && 
      Date.now() - new Date(currentUser.createdAt).getTime() >= ADMIN_MIN_ACCOUNT_AGE_MS
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
    },[setError])


    //======JSX RENDERING========
  return (
    <div id='pageContainer'>
      <Header currentUser={currentUser} />
      <section id='homeSection1'>
        <div id='tabPanal'>
          <Tabs
            id="homePageTabs"
            activeKey={key}
            onSelect={(k) => setKey(k)}
          >
            <Tab eventKey="home" title="Home">
              {/* Application description */}
            </Tab>
            <Tab eventKey="profile" title="Profile">
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
                <div id='editUserDataPanal'>
                {/* TOGGLE EDITPROFILE FORM */}
                  {editUser && (
                    <div id='editProfileBlock'>
                      <Row id='editProfileRow'>
                      <Col id='editProfileCol1'/>
                        <Col id='editProfileCol' xs={12} md={10}>
                          <div id='editProfilePanal'>
                            <EditProfile
                              user={user}
                              editUserProfile={editUserProfile}
                              loading={profileLoading}
                            />
                          </div>
                        </Col>
                        <Col id='editProfileCol2'/>
                      </Row>
                    </div>
                  )}
                  {/* TOGGLE EDIT PASSWORD FORM */}
                  {editPassword && (
                    <div id='editPasswordBlock'>
                      <Row id='editPasswordRow'>
                        <Col id='editPasswordCol1'/>
                        <Col xs={6} id='editPasswordCol'>
                          <div id='editPasswordPanal'>
                            <EditPassword setError={setError}/>
                          </div>
                        </Col>
                        <Col id='editPasswordCol2'/>
                      </Row>
                    </div>
                  )}
                   {/*  TOGGLE ADMIN REGISTRATION FORM: Only display form if user is not 
                   an admin user  and matches the age requirement of 21 years and has 
                   been a user for 3 months (1 day during development) */}
                  {showAdminForm && (
                    <div>
                      <Row>
                        <Col id='adminFormCol1'/>
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
                  )}
                </div>
                
              </div>
            </Tab>
          </Tabs>
        </div>
      </section>
      <Footer logout={logout}/>
    </div>
  )
}
