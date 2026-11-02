import React from 'react'
import '../css/pagesCss/PageSetup.css'
import Header from '../components/Header'
import Footer from '../components/Footer'
export default function Notes({currentUser}) {
  return (
    <div>
      <Header heading={'NOTES'} currentUser={currentUser} />
      <Footer/>
    </div>
  )
}
