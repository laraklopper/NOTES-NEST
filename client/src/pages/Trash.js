//Trash.js
import React from 'react'
import '../css/pagesCss/PageSetup.css'
import '../css/pagesCss/Trash.css'
import Header from '../components/Header'
import Footer from '../components/Footer'

//====MAIN TRASH FUNCTION COMPONENT========
export default function Trash(
  {//PROPS PASSED FROM PARENT COMPONENT (App.js)
    currentUser, logout}) {
  return (
    <div><Header heading={'TRASH'} currentUser={currentUser} /><Footer logout={logout}/></div>
  )
}
