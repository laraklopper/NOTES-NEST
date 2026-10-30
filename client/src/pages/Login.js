import React from 'react'
import MainHeader from '../components/MainHeader'
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import LoginForm from '../components/LoginForm';
export default function Login() {
  return (
    <div>
        <MainHeader mainHeading={'LOGIN'}/>
        <section>
        <div id='loginPanal'>
            <Row>
        <Col/>
        <Col xs={6}>
            <div>
                <LoginForm/>
            </div>
        </Col>
        <Col/>
      </Row>
        </div>
            
        </section>
    </div>
  )
}
