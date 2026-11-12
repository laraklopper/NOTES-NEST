// Footer.js
//IMPORT REQUIRED MODULES AND PACKAGES
import React from 'react'
// IMPORT CSS STYLESHEETS
import '../css/componentCss/Footer.css';
// IMPORT BOOTSTRAP COMPONENTS
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Stack from 'react-bootstrap/Stack';
import Button from 'react-bootstrap/Button';
// IMPORT ICONS FROM LUCIDE REACT
import { LogOut } from 'lucide-react';

//Footer Funtion component
export default function Footer(//Export default Footer component
  {//PROPS PASSED FROM PARENT COMPONENT
    logout
  }) {
  //====================JSX RENDERING========================
  return (
    <footer id='pageFooter' role="contentinfo">
      {/* Row 1 */}
      <Row id='footerRow1'>
        <Col id='footerLogoutCol'>
          {/* STACK 1 */}
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
      {/* Row 2 */}
      <Row id='footerRow2'>
        <Col xs={0} md id='copyRightCol1'/>
        <Col xs={12} md={8} id='copyRightCol'>
          {/* COPY RIGHT MESSAGE */}
          <div id='copyrightDiv' >
            <p id='copyrightText' aria-label='copy right details' aria-live='polite' >© 2026 Text Translator App. All rights reserved.</p>
          </div>
        </Col>
        <Col xs={0} md id='copyRightCol2'/>
      </Row>
    </footer>
  )
}
