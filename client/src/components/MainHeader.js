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
import { NavLink, useLocation } from 'react-router-dom';
// IMPORT REACT-ROUTER-DOM HASHLINK FOR SCROLLING TO ANCHORS
import { HashLink } from 'react-router-hash-link';
// IMPORT UTILITY FUNCTIONS FOR DATE AND TIME FORMATTING
import { dateDisplay, timeDisplay } from '../util/dateFunctions';
// IMPORT ICONS FROM LUCIDE-REACT
import { Calendar, Clock8 } from 'lucide-react';


//MainHeader function component
export default function MainHeader(//Export default MainHeader function component
    {//PROPS PASSED FROM PARENT COMPONENT('Dashboard.js, 'Login.js', 'Register.js')
        mainHeading
    }
) {
    //======STATE VARIABLES======
    const [date, setDate] = useState(new Date());
    //===========================
    const { pathname } = useLocation()
    //==================
    // HashLink doesn't add an active class like NavLink does, so set it from the current path
    const linkClass = (path) => pathname === path ? 'refLink active' : 'refLink'

    useEffect(() => {
        const timer = setInterval(() => {
            setDate(new Date());
            return () => clearInterval(timer);
        }, 1000);
        return () => clearInterval(timer);
    }, []);
    //==================
  return (
    <header id='mainHeader'>
        <Row id='headerRow1'>
            <Col id='headingCol1'>
                <Stack direction="horizontal" gap={3}>
      <div className="p-2" id='headerTimeBlock'>
        <Card id='headerTimeCard'>
      <ListGroup variant="flush" id='headerTimeList'>
        <ListGroup.Item id='dateItem'>
        {/* DATE: dateDisplay  -> formats Date into readable date string */}
        <p id='dateLabel' className='visually-hidden' aria-label='Current Date'>
            Current Date:
        </p>
            <span className='headClockSpan'>
                <Calendar size={20} fontWeight={900} color='#3D0F13' aria-hidden='true'/>
                <h5 className='clockListItem'>{dateDisplay(date)}</h5>
            </span>
        </ListGroup.Item>
        <ListGroup.Item id='timeItem'>
        {/* TIME: timeDisplay  -> formats Date into readable time string */}
        <p id='timeLabel' className='visually-hidden' aria-label='Current Time'>
            Current Time:
        </p>
            <span className='headClockSpan'>
                <Clock8 size={20} fontWeight={900} color='#3D0F13' aria-hidden='true'/>
                <h5 className='clockListItem'>{timeDisplay(date)}</h5>
            </span>
        </ListGroup.Item>
        <ListGroup.Item>Vestibulum at eros</ListGroup.Item>
      </ListGroup>
    </Card>
      </div>
      <div className="p-2 ms-auto">Second item</div>
      <div className="p-2">Third item</div>
    </Stack>
            </Col>
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
