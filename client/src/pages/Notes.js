//Note.js
import React from 'react'
import '../css/pagesCss/Notes.css'
import '../css/pagesCss/PageSetup.css'
import Header from '../components/Header'
import Footer from '../components/Footer'

//====MAIN NOTES FUNCTION COMPONENT========
export default function Notes(
  {//PROPS PASSED FROM PARENT COMPONENT (App.js)
    currentUser, 
    logout
  }) {
  return (
    <div>
      <Header heading={'NOTES'} currentUser={currentUser} />
      <Footer logout={logout}/>
    </div>
  )
}
