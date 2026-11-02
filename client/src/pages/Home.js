//Home.js
import React, { useState, useEffect } from 'react'
import '../css/pagesCss/PageSetup.css'
import '../css/pagesCss/Home.css'
import '../css/componentCss/Tabs.css'
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Stack from 'react-bootstrap/Stack';
import Tab from 'react-bootstrap/Tab';
import Tabs from 'react-bootstrap/Tabs';
import Button from 'react-bootstrap/Button';
import Header from '../components/Header'
import Footer from '../components/Footer'


//====MAIN HOME FUNCTION COMPONENT========
export default function Home(
  {//PROPS PASSED FROM PARENT COMPONENT (App.js)
    currentUser,
    logout
  }) {
    const [key, setKey] = useState('home')
    const [profile, setProfile] = useState(null)// Full user record for the profile tab

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

    const user = profile || currentUser || {};
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
                <Row id='userProfileRow'>
                  <Col id='userProfileCol'>
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
                          id='toggleEditProfileToggleBtn'
                          >
                            EDIT PROFILE
                          </Button>
                        </div>
                        <div className="p-2">
                          <Button variant='warning'
                          id='toggleEditPasswordToggleBtn'
                          >
                            EDIT PASSWORD
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
                              <Button variant='danger'>
                                DELETE ADMIN STATUS
                              </Button>
                            )}
                          </div>
                        </Stack>
                      </div>
                    </div>
                  </Col>
                </Row>
              </div>
            </Tab>
          </Tabs>
        </div>
      </section>
      <Footer logout={logout}/>
    </div>
  )
}
