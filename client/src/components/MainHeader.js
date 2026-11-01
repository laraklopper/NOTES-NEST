import React from 'react'
import '../css/componentCss/Header.css'
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
// import Stack from 'react-bootstrap/Stack';
import { NavLink, useLocation } from 'react-router-dom';
import { HashLink } from 'react-router-hash-link';
export default function MainHeader(
    {
        mainHeading
    }
) {
    const { pathname } = useLocation()
    //==================
    // HashLink doesn't add an active class like NavLink does, so set it from the current path
    const linkClass = (path) => pathname === path ? 'refLink active' : 'refLink'
    //==================
  return (
    <header id='mainHeader'>
        <Row id='headerRow1'>
            <Col id='headingCol1'/>
        </Row>
         <Row id='headerRow2'>
        <Col id='headingCol1'/>
        <Col xs={5} id='headingCol'>
            <div id='pageHeadingBlock'>
            <span id='pageHeadingSpan'>
                <h1 id='appHeading'>NOTE NEST</h1>
                <h2 id='pageHeading'>{mainHeading}</h2>
            </span>
          </div>
        </Col>
        <Col id='headingCol2'/>
      </Row>
        <Row id='headerRow3'>
    
              <Col/>
        <Col xs={6} id='mainNavCol'>
             <div className="p-2">
        <nav id='navigation'>
            <ul id='mainNavbar'>
            {/* Landing Page */}
                <li className='linkItem'>
                    <NavLink to='/' className='refLink'>DASHBOARD</NavLink>
                </li>
                {/* Login and registration pages - HashLink scrolls to the top of the header on navigation */}
                <li className='linkItem'>
                    <HashLink smooth to='/login#mainHeader' className={linkClass('/login')}>LOGIN</HashLink>
                </li>
                <li className='linkItem'>
                    <HashLink smooth to='/reg#mainHeader' className={linkClass('/reg')}>REGISTRATION</HashLink>
                </li>

            </ul>
        </nav>
      </div>
        </Col>
        <Col/>
              
         
        </Row>
    </header>
  )
}
