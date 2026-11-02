import React from 'react'
import '../css/pagesCss/PageSetup.css'
import Header from '../components/Header'
import Footer from '../components/Footer'
export default function Home({currentUser}) {
  return (
    <div>
      <Header heading={'HOME'} currentUser={currentUser} />
      <Footer/>
    </div>
  )
}
