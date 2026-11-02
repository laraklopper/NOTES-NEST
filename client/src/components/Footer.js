import React from 'react'
import '../css/componentCss/Footer.css'
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Stack from 'react-bootstrap/Stack';
import Button from 'react-bootstrap/Button';

export default function Footer() {
  return (
    <footer id='pageFooter'>
        <Row id='footerRow1'>
        <Col id='footerLogoutCol'>
           <Stack direction="horizontal" gap={3} id='footerStack1'>
      <div className="p-2">First item</div>
      <div className="p-2 ms-auto">Second item</div>
      <div className="p-2">
        <Button variant="primary" id='logoutBtn'>LOGOUT</Button>
      </div>
    </Stack> 
        
        </Col>

        </Row>

    </footer>
  )
}
