//User.js
import React from 'react'
import '../css/pagesCss/PageSetup.css'
import '../css/pagesCss/Users.css'  
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Header from '../components/Header'
import Footer from '../components/Footer'
import UsersList from '../components/UsersList'


//=======MAIN (admin only) USERS PAGE========
export default function Users(
  {//PROPS PASSED FROM PARENT COMPONENT (App.js)
    currentUser, 
    logout
  }) {
    //========JSX RENDERING===========
  return (
    <div id='pageContainer'>
      <Header heading={'USERS'} currentUser={currentUser} />
      <section id='usersSection1'>
        <div>
          <Row>
            <Col>
              <UsersList/>
            </Col>
          </Row>
        </div>
      </section>
      <Footer logout={logout}/>
    </div>
  )
}
