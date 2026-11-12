// Footer.js
//IMPORT REQUIRED MODULES AND PACKAGES
import React, { useEffect, useState } from 'react'
// IMPORT CSS STYLESHEETS
import '../css/componentCss/Footer.css';
// IMPORT BOOTSTRAP COMPONENTS
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Stack from 'react-bootstrap/Stack';
import Button from 'react-bootstrap/Button';
import ListGroup from 'react-bootstrap/ListGroup';
// IMPORT ICONS FROM LUCIDE REACT
import { CalendarRange, Clock12Icon, LogOut } from 'lucide-react';
import { dateDisplay, timeDisplay } from '../util/dateFunctions';

//Footer Funtion component
export default function Footer(//Export default Footer component
  {//PROPS PASSED FROM PARENT COMPONENT
    logout
  }) {
    const [date, setDate] = useState(new Date());

    useEffect(() => {
      const timer = setInterval(() => {
        setDate(new Date())
      },1000)
      return () => clearInterval(timer)
    },[])
  //====================JSX RENDERING========================
  return (
    <footer id='pageFooter' role="contentinfo">
      {/* Row 1 */}
      <Row id='footerRow1'>
        <Col id='footerTimeCol' md='12'>
        {/* STACK 1: CLOCK (date and time) */}
          <Stack direction="horizontal" gap={3} id='footerTimeStack'>
          <div className="p-2" id='footerClockBlock'>
              <ListGroup id='footerClockList'>
                <ListGroup.Item id='footerDate' aria-labelledby='dateLabel'>
                {/* DATE: dateDisplay  -> formats Date into readable date string */}
                  <p id='dateLabel' className='visually-hidden'>Current Date:</p>
                  <span className='footerClockSpan'>
                  <CalendarRange aria-hidden='true' focusable='false'/>
                    
                    <h5 className='clockItem'>{dateDisplay(date)}</h5>
                  </span>
                </ListGroup.Item>
                <ListGroup.Item id='footerTime' aria-labelledby='timeLabel'>
                  {/* TIME: timeDisplay  -> formats Date into readable time string */}
                  <p id='timeLabel' className='visually-hidden'>Current Time:</p>
                  <span className='footerClockSpan'>
                    <Clock12Icon aria-hidden='true' focusable='false'/>
                    <h5 className='clockItem'>{timeDisplay(date)}</h5>
                  </span>
                </ListGroup.Item>
              </ListGroup>
            </div>
      <div className="p-2 ms-auto"/>
      <div className="p-2"/>
    </Stack>
        </Col>
      </Row>
      {/* Row 2: LogoutButton */}
      <Row id='footerRow2'>
        <Col id='footerLogoutCol'>
          {/* STACK 2 */}
          <Stack direction="horizontal" gap={3} id='logoutStack' >
            <div className="p-2"/>
            <div className="p-2 ms-auto"/>
            <div className="p-2">
              <Button 
                variant="warning" 
                id='logoutBtn' 
                onClick={logout} 
                type='button'
                >
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
