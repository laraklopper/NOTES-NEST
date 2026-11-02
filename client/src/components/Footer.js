import React from 'react'
import '../css/componentCss/Footer.css'
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Stack from 'react-bootstrap/Stack';
import Button from 'react-bootstrap/Button';

export default function Footer({logout}) {
  return (
    <footer id='pageFooter'>
        <Row id='footerRow1'>
        <Col id='footerLogoutCol'>
           <Stack direction="horizontal" gap={3} id='footerStack1'>
      <div className="p-2"/>
      <div className="p-2 ms-auto"/>
      <div className="p-2">
        <Button variant="warning" id='logoutBtn' onClick={logout} type='button'>
          LOGOUT
        </Button>
      </div>
    </Stack> 
        
        </Col>

        </Row>

    </footer>
  )
}
