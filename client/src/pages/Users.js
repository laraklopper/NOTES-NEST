//User.js
//IMPORT REQUIRED MODULES AND PACKAGES
import React from 'react'
// IMPORT CSS STYLESHEETS
import '../css/pagesCss/PageSetup.css'
import '../css/pagesCss/Users.css'  
// IMPORT BOOTSTRAP COMPONENTS
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
//IMPORT CUSTOM COMPONENTS
import Header from '../components/Header'
import Footer from '../components/Footer'
import UsersList from '../components/UsersList'
import { User } from 'lucide-react';


//=======MAIN (admin only) USERS PAGE========
export default function Users(//Export default Users.js function Component
  {//PROPS PASSED FROM PARENT COMPONENT (App.js)
    currentUser, 
    logout
  }) {
    //========JSX RENDERING===========
  return (
    <div id='pageContainer' role='main' aria-labelledby=''>
    {/* ---------Screen Reader Page Heading------------- */}
      <p className='visually-hidden' id='pageTitle'>ADMIN RESTRICTED USERS PAGE</p>
      {/* Render the Header.js component with 'USERS' as the Heading  */}
      <Header heading={'USERS'} currentUser={currentUser} />
      {/* =====EVENT/ANIMATION======== */}
      <Row id='eventRow' role='presentation'>
        <Col id='eventCol'>
          <div className='eventBar'>
            <div className='eventTrack'>
              <User className='eventSlide' color='#000' size={32} aria-hidden='true' focusable='false'/>
            </div>
          </div>
        </Col>
      </Row>
      {/* ==================
      SECTION 1: usersList
      =============== */}
      <section id='usersSection1'>
        <div id='usersListPanal'>
              <UsersList/>
        </div>
      </section>
      {/* =====FOOTER============= */}
      <Footer logout={logout}/>
    </div>
  )
}
