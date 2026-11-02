import React from 'react'
import '../css/pagesCss/PageSetup.css'
import '../css/pagesCss/Home.css'
import Header from '../components/Header'
import Footer from '../components/Footer'
export default function Home({currentUser, logout}) {
  return (
    <div>
      <Header heading={'HOME'} currentUser={currentUser} />
      <Footer logout={logout}/>
    </div>
  )
}
