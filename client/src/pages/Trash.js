import React from 'react'
import '../css/pagesCss/PageSetup.css'
import '../css/pagesCss/Trash.css'
import Header from '../components/Header'
import Footer from '../components/Footer'
export default function Trash({currentUser, logout}) {
  return (
    <div><Header heading={'TRASH'} currentUser={currentUser} /><Footer logout={logout}/></div>
  )
}
