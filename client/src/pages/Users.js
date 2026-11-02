import React from 'react'
import Header from '../components/Header'
import Footer from '../components/Footer'
//=======MAIN (admin only) USERS PAGE========
export default function Users({currentUser, logout}) {
  return (
    <div>
      <Header heading={'USERS'} currentUser={currentUser} />
      <Footer logout={logout}/>
    </div>
  )
}
