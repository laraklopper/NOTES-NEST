import React, { useState } from 'react'
import MainHeader from '../components/MainHeader'
import '../css/pagesCss/LoggedOut.css'
import '../css/pagesCss/PageSetup.css';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import RegistrationForm from '../components/RegistrationForm';

export default function Register() {
  const [newUserData, setNewUserData] = useState({
        username: '',
    fullName: {
      firstName: '',
      lastName: ''
    },
    contactDetails: {
      email: '',
      phoneNumber: '',
    },
    defaultSourceLang: '',
    defaultTargetLang: '',
    dateOfBirth: '',
    password: '',
    admin: false,
     /* Consent for admin users to see this account's details. Starts false so
    the checkbox is unticked, and registration is refused until it is given. */
    adminDataConsent: false
  })
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
