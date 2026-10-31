import React from 'react'
import '../css/pagesCss/LoggedOut.css'
import '../css/pagesCss/PageSetup.css'
import MainHeader from '../components/MainHeader'
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import LoginForm from '../components/LoginForm';
export default function Login(
    {//PROPS PASSED FROM PARENT COMPONENT
        userData, 
        setUserData,
    }) {
  return (
    <div id='pageContainer'>
        <MainHeader mainHeading={'LOGIN'}/>
        <section id='loginSection'>
        <div id='loginPanal'>
            <Row id='loginRow'>
        <Col id='loginCol1'/>
        <Col xs={6} id='loginCol'>
            <div id='loginDiv'>
                <LoginForm
                    userData={userData}
                    setUserData={setUserData}
                />
            </div>
        </Col>
        <Col id='loginCol2'/>
      </Row>
        </div>
            
        </section>
    </div>
  )
}
