import React from 'react'
import '../css/pagesCss/PageSetup.css'
import Header from '../components/Header'
import Footer from '../components/Footer'
export default function Trash({currentUser}) {
  return (
    <div><Header heading={'TRASH'} currentUser={currentUser} /><Footer/></div>
  )
}
