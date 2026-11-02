//Home.js
import React from 'react'
import '../css/pagesCss/PageSetup.css'
import '../css/pagesCss/Home.css'
import Header from '../components/Header'
import Footer from '../components/Footer'

//====MAIN HOME FUNCTION COMPONENT========
export default function Home(
  {//PROPS PASSED FROM PARENT COMPONENT (App.js)
    currentUser, 
    logout
  }) {

    //======JSX RENDERING========
  return (
    <div>
      <Header heading={'HOME'} currentUser={currentUser} />
      <Footer logout={logout}/>
    </div>
  )
}
