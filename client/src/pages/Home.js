//Home.js
import React, { useState } from 'react'
import '../css/pagesCss/PageSetup.css'
import '../css/pagesCss/Home.css'
import Tab from 'react-bootstrap/Tab';
import Tabs from 'react-bootstrap/Tabs';
import Header from '../components/Header'
import Footer from '../components/Footer'

//====MAIN HOME FUNCTION COMPONENT========
export default function Home(
  {//PROPS PASSED FROM PARENT COMPONENT (App.js)
    currentUser, 
    logout
  }) {
    const [key, setKey] = useState('Home')

    //======JSX RENDERING========
  return (
    <div id='pageContainer'>
      <Header currentUser={currentUser} />
      <section id='homeSection1'>
        <div id='tabPanal'>
              <Tabs
      id="homePageTabs"
      activeKey={key}
      onSelect={(k) => setKey(k)}
    >
      <Tab eventKey="home" title="Home">
        {/* Application description */}
      </Tab>
      <Tab eventKey="profile" title="Profile">
        {/* user profile */}
      </Tab>
    
    </Tabs>
        </div>
      </section>
      <Footer logout={logout}/>
    </div>
  )
}
