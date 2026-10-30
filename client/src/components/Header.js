import React from 'react'
// IMPORT BOOTSTRAP COMPONENTS
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Stack from 'react-bootstrap/Stack';
import { NavLink } from 'react-router-dom';

export default function Header({
    heading,
    currentUser
}) {
  return (
    <header id='pageHeader'>
         <Row id='headerRow1'>
        <Col id='headerCol1'/>
      </Row>
                <Row id='headerRow2'>
        <Col id='headingCol1'/>
        <Col xs={5} id='headingCol'>
            <div id='pageHeadingBlock'>
            <span>
                <h1 id='appHeading'>NOTE NEST</h1>
                <h2 id='pageHeading'>{heading}</h2>
            </span>
          </div>
        </Col>
        <Col id='headingCol2'/>
      </Row>
      <Row id='headerRow3'>
         <Col id='navCol1'/>
        <Col xs={6} id='navCol'>
        <nav id='navigation'>
            <ul id='navbar'>
      <Stack gap={3} id='navBarStack'>
             {currentUser && (
                <div className="p-2" id='navBlock1'>
                    <li className='linkItem'>
                        <NavLink to='/' className='refLink'>HOME</NavLink>
                    </li>
                    <li className='linkItem'>
                        <NavLink to='/notepad' className='refLink'>NOTE PAD</NavLink>
                    </li>
                </div>

             )}
             {currentUser && (
                <div className="p-2" id='navBlock2'>
                    <li className='linkItem'>
                        <NavLink to='/notes'>NOTES</NavLink>
                    </li>
                    <li className='linkItem'>
                        <NavLink to='/trash' className='refLink'>TRASH</NavLink>
                    </li>

                </div>
             )}
             {currentUser?.admin && (
                <div className="p-2" id='navBlock3'>
                    <li className='linkItem'>
                        <NavLink to='/users' className='refLink'>USERS</NavLink>
                    </li>
                </div>

             )}
      
      
      
    </Stack>
            </ul>
        </nav>
       
        </Col>
        <Col id='navCol2'/>

      </Row>
    </header>
  )
}
