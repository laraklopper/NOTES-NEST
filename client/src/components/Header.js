// Header.js
// IMPORT REQUIRED MODULES AND PACKAGES
import React from 'react'
// IMPORT CSS STYLESHEETS
import '../css/componentCss/Header.css'
// IMPORT BOOTSTRAP COMPONENTS
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Stack from 'react-bootstrap/Stack';
// IMPORT REACT-ROUTER-DOM COMPONENTS FOR NAVIGATION
import { NavLink } from 'react-router-dom';

// Header function component
export default function Header(//Export default Header.js Function component
    {//PROPS PASSED TO PARENT COMPONENT(Home.js, NotePad.js, Notes.js Translate.js, Users.js )
    heading,
    //PROPS PASSED FROM PARENT COMPONENT(Home.js, NotePad.js, Notes.js Translate.js, Users.js )
    currentUser
}) {
    // =====================JSX RENDERING=============
  return (
    <header id='pageHeader'>
    {/* Row 1 */}
         <Row id='headerRow1'>
        <Col id='headerCol1'/>
      </Row>
      {/* Row 2: Application and Page Heading */}
                <Row id='headerRow2'>
        <Col id='headingCol1'/>
        <Col xs={5} id='headingCol'>
            <div id='pageHeadingBlock'>
            <span id='pageHeadingSpan' >
                <h1 id='appHeading'>NOTE NEST</h1>
                <h2 id='pageHeading'>{heading}</h2>
            </span>
          </div>
        </Col>
        <Col id='headingCol2'/>
      </Row>
      {/* Row 3: Navigation Bar*/}
      <Row id='headerRow3'>
        <Col xs={12} md={12} id='navCol'>
        {/* Navigation Bar */}
        <nav id='navigation'>
            <ul id='navbar'>
            {/* Header Navigation Bar stack */}
      <Stack gap={3} id='navBarStack'>
      {/* NAVBAR BLOCK 1: HomePage, NotePad, Notes */}
             {currentUser && (
                <div className="p-2" id='navBlock1'>
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
                </div>

             )}
             {/* (Admin only)NAVBAR BLOCK 3: Users */}
             {currentUser?.admin && (
                <div className="p-2" id='navBlock3'>
                    <li className='linkItem'>
                    {/* Admin only link to Users.js Page */}
                        <NavLink to='/users' className='refLink'>USERS</NavLink>
                    </li>
                </div>
             )}
    </Stack>
            </ul>
        </nav>
        </Col>
      </Row>
    </header>
  )
}
