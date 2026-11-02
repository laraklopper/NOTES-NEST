//Home.js
import React, { useState } from 'react'
import '../css/pagesCss/PageSetup.css'
import '../css/pagesCss/Home.css'
import '../css/componentCss/Tabs.css'
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Stack from 'react-bootstrap/Stack';
import Tab from 'react-bootstrap/Tab';
import Tabs from 'react-bootstrap/Tabs';
import Button from 'react-bootstrap/Button';
import Header from '../components/Header'
import Footer from '../components/Footer'


//====MAIN HOME FUNCTION COMPONENT========
export default function Home(
  {//PROPS PASSED FROM PARENT COMPONENT (App.js)
    currentUser, 
    logout
  }) {
    const [key, setKey] = useState('home')

    const username = currentUser?.username || 'Username Not provided'
    //======JSX RENDERING========
  return (
    <div id='pageContainer'>
      <Header currentUser={currentUser} />
      <section id='homeSection1'>
        <div id='tabPanal'>
              <Tabs
      id="homePageTabs"
      activeKey={key}
      onSelect={(k) => setKey(k)}
    >
      <Tab eventKey="home" title="Home">
        {/* Application description */}
      </Tab>
      <Tab eventKey="profile" title="Profile">
        {/* user profile */}
        <div id='userProfilePanal'>
           <Row id='userProfileCol'>
        <Col id='userProfileCol'>
          <div id='userProfile'>
              <Stack direction="horizontal" gap={3}>
      <div className="p-2">
      {/* FULL NAME (loggedIn user Full Name) */}
        <h4 id='userProfileHeading'>Current User fullName</h4>
      </div>
      <div className="p-2 ms-auto">
       <Button>
        EDIT PROFILE
       </Button>
      </div>
      <div className="p-2">
        <Button
        variant='warning'>
          EDIT PASSWPRD
        </Button>
      </div>
    </Stack>
            <div id='userProfileBody'>
               <Stack gap={3} id='profileStack1'>
               {/* USERNAMR */}
      <div className="p-2" id='userProfileBlock1'>
        <span className='userDataSpan'>
          <label className='userProfileLabel'>USERNAME:</label>
          <p className='userProfileValue'>{username}</p>
        </span>d
      </div>
      {/* CONTACT DETAILS */}
      <div className="p-2" id='userProfileBlock2'>
         <label className='userProfileLabel'>CONTACT DETAILS:</label>
         <div className='userDataDiv'>
          <span className='userDataSpan'>
            <label className='userProfileLabel'>EMAIL</label>
            <p className='userProfileValue'>{currentUser.Email}</p>
          </span>
          <span className='userDataSpan'>
            <label className='userProfileLabel'>EMAIL</label>
            <p className='userProfileValue'>{currentUser.Email}</p>
          </span>
         </div>
      </div>
      {/* DEFAULET TRANSLATION LANGUAGES */}
      <div className="p-2" id='userProfileBlock3'>      
          <label className='userProfileLabel'>DEFAULT LANGUAGES</label>
          <div id='userDataDiv'>
            <span className='userDataSpan'>
              <label className='userProfileLabel'>SOURCE LANGUAGE:</label>
              <p className='userProfileValue'>Source Language</p>
            </span>
                <span className='userDataSpan'>
              <label className='userProfileLabel'>TARGET LANGUAGE:</label>
              <p className='userProfileValue'>Target Language</p>
            </span>
                <span className='userDataSpan'>
        <label>NOTES LANGUAGE:</label>
          <p className='userProfileValue'>notes language</p>
        </span>
          </div>
      </div>
    </Stack>
    {/* PROFILE BODY STACK 2 */}
     <Stack gap={3} id='profileStack2'>
     {/* FULL NAME */}
      <div className="p-2" id='userProfileBlock4'>
        <label className='userDataLabel'>FULL NAME:</label>
        <div className='groupDiv'>
          <span className='userDataSpan'>
            <label className='userDataLabel'>FIRST NAME:</label>
            <p className='userProfileValue'>First Name</p>
          </span>
          <span className='userDataSpan'>
            <label className='userDataLabel'>LAST NAME:</label>
            <p className='userProfileValue'>Last Name</p>
          </span>
        </div>
      </div>
      {/*DATE OF BIRTH  */}
      <div className="p-2" id='userProfileBlock5'>
     <span className='userProfileSpan'>
          <label className='userDataLabel'>DATE OF BIRTH:</label>
          <p className='userProfileValue'>{currentUser?.dateOfBirth}</p>
        </span>
      </div>
      <div className="p-2" id='userProfileBlock6'>
        <span className='userDataSpan'>
          <label className='userProfileLabel'>IS ADMIN:</label>
          <p className='userProfileValue'>{currentUser?.admin ? 'YES' : 'NO'}</p>
        </span>
        <Button
        variant='danger'
        >
          DELETE ADMIN STATUS
        </Button>
      </div>
    </Stack>
            </div>
          </div>
            

          
        </Col>
      </Row>
        </div>    
      </Tab>
    
    </Tabs>
        </div>
      </section>
      <Footer logout={logout}/>
    </div>
  )
}
