//Register.js
//IMPORT REQUIRED MODULES AND PACKAGES
import React, { useCallback, useState } from 'react'
// IMPORT CSS STYLESHEETS
import '../css/pagesCss/LoggedOut.css'
import '../css/pagesCss/PageSetup.css';
// IMPORT BOOTSTRAP COMPONENTS
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
// IMPORT BOOTSTRAP COMPONENTS
import MainHeader from '../components/MainHeader'
import RegistrationForm from '../components/RegistrationForm';
import Footer from '../components/Footer';
//IMPORT REACT-ROUTER-DOM COMPENTS
import { useNavigate } from 'react-router-dom';
//IMPORT UTILITY FUNCTIONS
import { emptyNewUser } from '../util/userFunc';



//============MAIN REGISTER COMPONENT===========
export default function Register(//Export default Registration function component
  {//PROPS PASSED FROM PARENT COMPONENT (App.js)
    setError,
    loggedIn
  }) {
  //=============STATE VARIABLES=============
  const [newUserData, setNewUserData] = useState(emptyNewUser)
  const [loading, setLoading] = useState(false);// State used to disable the button and show loading text

  
    //=======NAViGATE=======
  // Hook to navigate between different routes
  const navigate = useNavigate();

  //================REQUESTS/CALLBACKS====================
  //Function to register a new user
  const submitRegistration = useCallback(async () => {
    try {
      setError(null)// Clear previous error before trying again
      setLoading(true)
       // Send a POST request to the auth/register endpoint to register a new user
      const response = await fetch('/auth/register', {
        method: 'POST',// HTTP request method
        headers: {
          'Content-Type': 'application/json',//Specify the Content-Type in the payload as JSON
        },
        body: JSON.stringify(newUserData)// Convert payload to JSON string
      })

      const data = await response.json().catch(() => ({}));// Safely parse JSON (avoid crash if server returns non-JSON)
       /* Conditional rendering to check if the response
       is not successful (status code is not in the range 200-299)*/
      if (response.ok) {
        setNewUserData(emptyNewUser)
        navigate('/')// Send the new user to the login page (lives at '/' when logged out)
      } else {
        setError(data.message || 'Registration failed. Please try again')// Set the error state to display the error in the UI
      }
    } catch (error) {
      setError('An error occurred during registration. Please try again.');// Set a generic error message for any unexpected errors
      console.error('Registration error:', error);//Log an error message in the console for debugging purposes
    } finally {
      setLoading(false)// Stop loading state
    }
  }, [newUserData, setError, navigate])

  //===========JSX RENDERING===========
  return (
    <div id='pageContainer' role='main' aria-labelledby='pageTitle'>
    {/* ---------Screen Reader Heading------------------ */}
    <p className='pageTitle'>Registration Page</p>
    {/* Render the MainHeader.js component with 'REGISTRATION' as the mainHeading */}
        <MainHeader mainHeading={'REGISTRATION'} loggedIn={loggedIn}/>
        {/* =====================
        Section 1: Registration form
        ========================= */}
        <section id='regisSection'>
          <div id='registrationBlock' role='region'>
            <Row id='registrationRow'>
              <Col id='registrationCol1'/>
              <Col md={10} xs={12} id='registrationCol'>
                <div id='registrationPanal'>
                {/* Render the RegistrationForm.js function component */}
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
        <Footer loggedIn={loggedIn}/>
    </div>
  )
}
