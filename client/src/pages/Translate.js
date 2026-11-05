//Translate.js
import React, { useState } from 'react'
import '../css/pagesCss/Translate.css'
import '../css/pagesCss/PageSetup.css'
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Tab from 'react-bootstrap/Tab';
import Tabs from 'react-bootstrap/Tabs';
import Header from '../components/Header'
import Footer from '../components/Footer'
import TranslateForm from '../components/TranslateForm';
export default function Translate(
  {//PROPS PASSED FROM PARENT COMPONENT (App.js)
    currentUser, logout}) {
      const [key, setKey] = useState('translate')
  return (
    <div>
      <Header heading={'TRANSLATE'} currentUser={currentUser} />
        <section id='translateSec1'>
          <div id='translateSectionPanal'>
             <Tabs
      id="controlled-tab-example"
      activeKey={key}
      onSelect={(k) => setKey(k)}
      className="mb-3"
    >
      <Tab eventKey="translator" title="translate">
        <div id='translatorDiv'>
           <Row id='translatorRow'>
        <Col  xs={12} md={12} id='translatorCol'>
          <div id='translatorPanal'>
            <TranslateForm
              currentUser={currentUser}
            />
          </div>
        </Col>
      </Row>
        </div>
      </Tab>
      <Tab eventKey="TRANSLATIONS LIST" title="translations">
        <div>
          {/* TRANSLATIONS LIST */}
        </div>
      </Tab>
      <Tab eventKey="LANGUAGES LIST" title="Contact">
        <div>
          {/* Langauges */}
        </div>
      </Tab>
    </Tabs>
          </div>
        </section>
      <Footer logout={logout}/>
    </div>
  )
}
