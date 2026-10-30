import React from 'react'
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Stack from 'react-bootstrap/Stack';
import { NavLink } from 'react-router-dom';
export default function MainHeader(
    {
        mainHeading
    }
) {
    //==================
  return (
    <header id='mainHeader'>
        <Row id='headerRow1'>
            <Col id='headingCol1'/>
        </Row>
         <Row id='headerRow2'>
        <Col id='headingCol1'/>
        <Col xs={5} id='headingCol'>
            <div>
            <span>
                <h1 id='appHeading'>NOTE NEST</h1>
                <h2 id='pageHeading'>{mainHeading}</h2>
            </span>
          </div>
        </Col>
        <Col id='headingCol2'/>
      </Row>
        <Row id='headerRow3'>
            <Col id='mainNavCol'>
                <Stack direction="horizontal" gap={3} id='mainNavStack'>
      <div className="p-2"/>
      <div className="p-2 ms-auto"/>
      <div className="vr" />
      <div className="p-2">
        <nav>
            <ul id='mainNavbar'>
                <li className='linkItem'>
                    <NavLink to='/' className='refLink'>LOGIN</NavLink>
                </li>
                <li>
                    <NavLink to='/reg' className='refLink'>REGISTRATION</NavLink>
                </li>

            </ul>
        </nav>
      </div>
    </Stack>
            </Col>
        </Row>
    </header>
  )
}
