import React from 'react'
import '../css/componentCss/Footer.css'
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Stack from 'react-bootstrap/Stack';
import Button from 'react-bootstrap/Button';
import { LogOut } from 'lucide-react';

export default function Footer({logout}) {
  return (
    <footer id='pageFooter'>
        <Row id='footerRow1'>
        <Col id='footerLogoutCol'>
           <Stack direction="horizontal" gap={3} id='footerStack1' >
      <div className="p-2"/>
      <div className="p-2 ms-auto"/>
      <div className="p-2">
        <Button variant="warning" id='logoutBtn' onClick={logout} type='button'>
          LOGOUT <LogOut aria-hidden='true' focusable='false'/>
        </Button>
      </div>
    </Stack> 
        
        </Col>

        </Row>
<Row id='footerRow2'>
  <Col xs={0} md id='copyRightCol1'/>
        <Col xs={12} md={4} id='copyRightCol'>
          <div id='copyright-div' >
            <p id='copyrightText' aria-label='copy right details' aria-live='polite' >© 2026 Text Translator App. All rights reserved.</p>
          </div>
        </Col>
        <Col xs={0} md id='copyRightCol2'/>
</Row>
    </footer>
  )
}
