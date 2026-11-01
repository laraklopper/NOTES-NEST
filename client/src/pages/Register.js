//Register.js
import React, { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom';
import MainHeader from '../components/MainHeader'
import '../css/pagesCss/LoggedOut.css'
import '../css/pagesCss/PageSetup.css';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import RegistrationForm from '../components/RegistrationForm';

// Empty form values, shared by the initial state and the CLEAR FORM button
export const emptyNewUser = {
  username: '',
  fullName: {
    firstName: '',
    lastName: ''
  },
  contactDetails: {
    email: '',
    contactNumber: '',
  },
  dateOfBirth: '',
  defaultSourceLang: '',
  defaultTargetLang: '',
  defaultNoteLang: '',
  password: '',
  /* Consent for admin users to see this account's details. Starts false so
  the checkbox is unticked, and registration is refused until it is given. */
  adminDataConsent: false
}

//============MAIN REGISTER COMPONENT===========
export default function Register(
  {//PROPS PASSED FROM PARENT COMPONENT (App.js)
    setError
  }) {
  //=============STATE VARIABLES=============
  const [newUserData, setNewUserData] = useState(emptyNewUser)
  const [loading, setLoading] = useState(false);// State used to disable the button and show loading text
  const navigate = useNavigate();

  //================REQUESTS/CALLBACKS====================
  const submitRegistration = useCallback(async () => {
    try {
      setError(null)
      setLoading(true)
      const response = await fetch('/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newUserData)
      })

      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        setNewUserData(emptyNewUser)
        navigate('/login')// Send the new user to the login page
      } else {
        setError(data.message || 'Registration failed. Please try again')
      }
    } catch (error) {
      setError('An error occurred during registration. Please try again.');
      console.error('Registration error:', error);
    } finally {
      setLoading(false)
    }
  }, [newUserData, setError, navigate])

  //===========JSX RENDERING===========
  return (
    <div id='pageContainer'>
        <MainHeader mainHeading={'REGISTRATION'}/>
        <section id='regisSection'>
          <div id='registrationBlock'>
            <Row id='registrationRow'>
              <Col id='registrationCol1'/>
              <Col md={10} xs={12} id='registrationCol'>
                <div id='registrationPanal'>
                  <RegistrationForm
                    newUserData={newUserData}
                    setNewUserData={setNewUserData}
                    submitRegistration={submitRegistration}
                    loading={loading}
                  />
                </div>
              </Col>
              <Col id='registrationCol2'/>
            </Row>
          </div>
        </section>
    </div>
  )
}
