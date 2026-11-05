//Note.js
import React from 'react'
import '../css/pagesCss/Notes.css'
import '../css/pagesCss/PageSetup.css'
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Header from '../components/Header'
import Footer from '../components/Footer'

//====MAIN NOTES FUNCTION COMPONENT========
export default function Notes(
  {//PROPS PASSED FROM PARENT COMPONENT (App.js)
    currentUser, 
    logout
  }) {
  return (
    <div id='pageContainer'>
      <Header heading={'NOTES'} currentUser={currentUser} />
      <section>

      </section>
      <Footer logout={logout}/>
    </div>
  )
}
