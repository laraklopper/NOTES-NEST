//MainHeader.js
//IMPORT REQUIRED MODULES AND PACKAGES
import React, { useState, useEffect } from 'react'
// IMPORT CSS STYLESHEETS
import '../css/componentCss/Header.css'
// IMPORT REACT-BOOTSTRAP COMPONENTS
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Stack from 'react-bootstrap/Stack';
import Card from 'react-bootstrap/Card';
import ListGroup from 'react-bootstrap/ListGroup';
// IMPORT REACT-ROUTER-DOM COMPONENTS FOR NAVIGATION
import { NavLink, useLocation } from 'react-router-dom';
// IMPORT UTILITY FUNCTIONS FOR DATE AND TIME FORMATTING
import { dateDisplay, timeDisplay } from '../util/dateFunctions';
// IMPORT ICONS FROM LUCIDE-REACT
import { Calendar, Clock8, Menu, X } from 'lucide-react';


//MainHeader function component
export default function MainHeader(//Export default MainHeader function component
  {//PROPS PASSED TO PARENT COMPONENT('Dashboard.js, 'Login.js', 'Register.js')
    mainHeading,
    loggedIn,
    currentUser,
    heading
  }
) {
  //======STATE VARIABLES======
  const [date, setDate] = useState(new Date());//State to store header date/time (updated every second)

  //================EFFECT LIVE CLOCK================//

  useEffect(() => {
    // Create an interval that updates the time every second
    const timer = setInterval(() => {
      setDate(new Date());
      return () => clearInterval(timer);
    }, 1000);
    // Cleanup function:
    // Clears interval when component unmounts
    // Prevents memory leaks and duplicate timers
    return () => clearInterval(timer);
  }, []);

  //================MOBILE NAVIGATION MENU================//
  // On phones the links are hidden behind a MENU button (see Responsive.css)
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  // Close the menu after a link is followed
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);
  // Close the menu with the Escape key
  useEffect(() => {
    if (!menuOpen) return
    const closeOnEscape = (e) => {
      if (e.key === 'Escape') setMenuOpen(false);
    }
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [menuOpen]);
  //===========JSX RENDERING=======
  return (
    <header id='mainHeader' role='banner'>
    {loggedIn ? (
      <div id='headerDiv'>
           {/* Row 1: Application and Page Heading  */}
      <Row id='headerRow1'>
         <Col id='pageHeadCol1' xs={0} md={4}/>
        <Col xs={12} md={4} id='pageHeadCol2'>
          <div id='pageHeadingBlock'>
          {/* APPLICATION + PAGE HEADING */}
            <span id='pageHeadingSpan' >
              <h1 id='appHeading'>NOTE NEST</h1>
             <h2 id='pageHeading'>{heading}</h2>
            </span>
            </div>
        </Col>
        <Col id='pageHeadCol3' xs={0} md={4}/>
      </Row>
      {/* Row 2: Navigation bar */}
      <Row id='headerRow2'>
        <Col id='headerCol1' xs='0' md={0}/>
        <Col id='headerCol2' xs={12} md='12'>
          {/* NAVIGATION BAR */}
              <div id='navbarBlock'> 
        {/* Navigation Bar */}
          <nav id='navigation' className={menuOpen ? 'navOpen' : ''} aria-label='Main navigation'>
            {/* MENU BUTTON: only shown on phones (hidden from md up by Bootstrap's d-md-none) */}
            {currentUser && (
              <button
                type='button'
                id='navToggleBtn'
                className='d-md-none'
                onClick={() => setMenuOpen(open => !open)}
                // ARIA ATTRIBUTES:
                aria-expanded={menuOpen}
                aria-controls='navbar'
                aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              >
                {menuOpen ? <X size={22} aria-hidden='true'/> : <Menu size={22} aria-hidden='true'/>}
                <span>{menuOpen ? 'CLOSE' : 'MENU'}</span>
              </button>
            )}
            <ul id='navbar'>
              {/* Header Navigation Bar stack */}
                {currentUser && (
                  <>
                    <li className='linkItem'>
                      {/* Link to Home.js Page */}
                      <NavLink to='/' className='refLink'>HOME</NavLink>
                    </li>
                    <li className='linkItem'>
                      {/* Link to NotePad.js page */}
                      <NavLink to='/notepad' className='refLink'>NOTE PAD</NavLink>
                    </li>
                    <li className='linkItem'>
                      {/* Link to Notes.js Page */}
                      <NavLink to='/notes' className='refLink'>NOTES</NavLink>
                    </li>
                    <li className='linkItem'>
                      {/* Link to Translate.js page */}
                      <NavLink to='/translate' className='refLink'>TRANSLATE</NavLink>
                    </li>
                  </>
                )}
                
   
            </ul>
          </nav>
          </div>
        </Col>
        <Col id='headerCol3' xs='0' md={0}/>
      </Row>
     
      </div>
    ):(
      <div id='mainHeaderDiv'>
  {/* Header Row 1: HIDDEN ON SMALLER DEVICES*/}
      <Row id='headerRow1'>
        <Col id='headerClockCol'>
          {/* Main Header Stack 1: DATE AND TIME */}
          <Stack direction="horizontal" gap={3} id='headerStack1'>
            <div id='headerTimeBlock'>
              <Card id='headerTimeCard'>
                <ListGroup variant="flush" id='headerTimeList'>
                  <ListGroup.Item id='dateItem'>
                    {/* DATE: dateDisplay  -> formats Date into readable date string */}
                    <p id='dateLabel' className='visually-hidden' aria-label='Current Date'>
                      Current Date:
                    </p>
                    <span className='headClockSpan'>
                      <Calendar size={28} fontWeight={900} color='#3D0F13' aria-hidden='true' />
                      <h5 className='clockListItem'>{dateDisplay(date)}</h5>
                    </span>
                  </ListGroup.Item>
                  <ListGroup.Item id='timeItem'>
                    {/* TIME: timeDisplay  -> formats Date into readable time string */}
                    <p id='timeLabel' className='visually-hidden' aria-label='Current Time'>
                      Current Time:
                    </p>
                    <span className='headClockSpan'>
                      <Clock8 size={28} fontWeight={900} color='#3D0F13' aria-hidden='true' />
                      <h5 className='clockListItem'>{timeDisplay(date)}</h5>
                    </span>
                  </ListGroup.Item>
                </ListGroup>
              </Card>
            </div>
            <div className="p-2 ms-auto" />
            <div className="p-2" />
          </Stack>
        </Col>
      </Row>
      {/* Header ROw 2 : APPLICATION AND PAGE HEADING*/}
      <Row id='headerRow2'>
        <Col id='headingCol1' />
        <Col xs={12} md={4} id='headingCol2'>
          <div id='pageHeadingBlock'>
            <span id='pageHeadingSpan'>
             <h1 id='appHeading'>NOTE NEST</h1>
              <h2 id='pageHeading'>{mainHeading}</h2>
            </span>
          </div>
        </Col>
        <Col id='headingCol3' />
      </Row>
      {/* Header Row 3: NAVIGATION BAR*/}
      <Row id='headerRow3'>
        <Col xs={6} md={3} id='headerCol1'/>
        <Col xs={6} md={6} id='headerCol2'>
          <div>
              {/* Navigation Bar */}
              <nav id='navigation'>
                <ul id='mainNavbar'>
                  {/* Login and registration pages */}
                  <li className='linkItem'>
                    {/* Link to Login Page */}
                    <NavLink to='/' className='refLink'>LOGIN</NavLink>
                  </li>
                  <li className='linkItem'>
                    {/* Link to Registration page */}
                    <NavLink to='/reg' className='refLink'>REGISTRATION</NavLink>
                  </li>
                </ul>
              </nav>
            </div>
        </Col>
        <Col xs={6} md={3} id='headerCol3'/>
      </Row>
      </div>
    )}
    
    </header>
  )
}
