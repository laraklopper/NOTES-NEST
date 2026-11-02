//User.js
import React from 'react'
import '../css/pagesCss/PageSetup.css'
import '../css/pagesCss/Users.css'  
import Header from '../components/Header'
import Footer from '../components/Footer'


//=======MAIN (admin only) USERS PAGE========
export default function Users(
  {//PROPS PASSED FROM PARENT COMPONENT (App.js)
    currentUser, 
    logout
  }) {
    //========JSX RENDERING===========
  return (
    <div>
      <Header heading={'USERS'} currentUser={currentUser} />
      <Footer logout={logout}/>
    </div>
  )
}
