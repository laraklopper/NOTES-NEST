//MainHeader.js
//IMPORT REQUIRED MODULES AND PACKAGES
import React ,{useState, useEffect} from 'react'
// IMPORT CSS STYLESHEETS
import '../css/componentCss/Header.css'
// IMPORT REACT-BOOTSTRAP COMPONENTS
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Stack from 'react-bootstrap/Stack';
import Card from 'react-bootstrap/Card';
import ListGroup from 'react-bootstrap/ListGroup';
// IMPORT REACT-ROUTER-DOM COMPONENTS FOR NAVIGATION
import { NavLink } from 'react-router-dom';
// IMPORT UTILITY FUNCTIONS FOR DATE AND TIME FORMATTING
import { dateDisplay, timeDisplay } from '../util/dateFunctions';
// IMPORT ICONS FROM LUCIDE-REACT
import { Calendar, Clock8 } from 'lucide-react';


//MainHeader function component
export default function MainHeader(//Export default MainHeader function component
    {//PROPS PASSED TO PARENT COMPONENT('Dashboard.js, 'Login.js', 'Register.js')
        mainHeading
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
    //===========JSX RENDERING=======
  return (
    <header id='mainHeader' role='banner'>
    {/* Header Row 1 */}
        <Row id='headerRow1'>
            <Col id='headingCol1'>
            {/* Main Header Stack 1: DATE AND TIME */}
                <Stack direction="horizontal" gap={3} id='headerStack1'>
      <div className="p-2" id='headerTimeBlock'>
        <Card id='headerTimeCard'>
      <ListGroup variant="flush" id='headerTimeList'>
        <ListGroup.Item id='dateItem'>
        {/* DATE: dateDisplay  -> formats Date into readable date string */}
        <p id='dateLabel' className='visually-hidden' aria-label='Current Date'>
            Current Date:
        </p>
            <span className='headClockSpan'>
                <Calendar size={28} fontWeight={900} color='#3D0F13' aria-hidden='true'/>
                <h5 className='clockListItem'>{dateDisplay(date)}</h5>
            </span>
        </ListGroup.Item>
        <ListGroup.Item id='timeItem'>
        {/* TIME: timeDisplay  -> formats Date into readable time string */}
        <p id='timeLabel' className='visually-hidden' aria-label='Current Time'>
            Current Time:
        </p>
            <span className='headClockSpan'>
                <Clock8 size={28} fontWeight={900} color='#3D0F13' aria-hidden='true'/>
                <h5 className='clockListItem'>{timeDisplay(date)}</h5>
            </span>
        </ListGroup.Item>
      </ListGroup>
    </Card>
      </div>
      <div className="p-2 ms-auto"/>
      <div className="p-2"/>
    </Stack>
            </Col>
        </Row>
        {/* Header ROw 2 : APPLICATION AND PAGE HEADING*/}
         <Row id='headerRow2'>
        <Col id='headingCol1'/>
        <Col md={10} id='headingCol'>
            <div id='pageHeadingBlock'>
            <span id='pageHeadingSpan' >
                <h1 id='appHeading'>NOTE NEST</h1>
                <h2 id='pageHeading'>{mainHeading}</h2>
            </span>
          </div>
        </Col>
        <Col id='headingCol2'/>
      </Row>
      {/* Header ROw 3: NAVIGATION BAR*/}
        <Row id='headerRow3'>
              <Col id='headerNavCol'>
              {/* HEADER STACK 2: NAVIAGATION BAR */}
                 <Stack direction="horizontal" gap={3} id='headerStack2'>
      <div className="p-2"/>
      <div className="p-2 ms-auto"/>
      <div className="p-2">
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
    </Stack>
                </Col>
        </Row>
    </header>
  )
}
