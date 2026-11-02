import React from 'react'
import Header from '../components/Header'
import Footer from '../components/Footer'
export default function NotePad({currentUser, logout}) {
  return (
    <div>
      <Header currentUser={currentUser}/>
      <Footer logout={logout}/>
        
    </div>
  )
}
