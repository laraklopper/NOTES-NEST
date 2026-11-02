import React from 'react'
import '../css/pagesCss/Translate.css'
import '../css/pagesCss/PageSetup.css'
import Header from '../components/Header'
import Footer from '../components/Footer'
export default function Translate({currentUser, logout}) {
  return (
    <div>
      <Header heading={'TRANSLATE'} currentUser={currentUser} />
      <Footer logout={logout}/>
    </div>
  )
}
