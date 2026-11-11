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
import languageData from '../util/languageData';
import { BookA, BookOpenCheck } from 'lucide-react';
import TranslationsList from '../components/TranslationsList';
export default function Translate(
  {//PROPS PASSED FROM PARENT COMPONENT (App.js)
    currentUser, 
    logout
  }
) {
      // =========STATE VARIABLES=============
      const [key, setKey] = useState('translator')

      //=============JSX RENDERING====================
  return (
    <div id='pageContainer' role='main' aria-labelledby='pageTitle'>
    {/* ---------Screen Reader Heading------------------ */}
    <p className='visually-hidden' id='pageTitle'>TRANSLATE PAGE</p>
      <Header heading={'TRANSLATE'} currentUser={currentUser} />
      <Row id='eventRow'>
        <Col id='eventCol'>
          <div className='eventBar'>
            <div className='eventTrack'>
              <BookOpenCheck className='eventSlide' size={32} aria-hidden='true' focusable='false'/>
            </div>
          </div>
        </Col>
      </Row>
        <section id='translateSec1'>
          <div id='translateSectionPanal'>
             <Tabs
      id="translateTabs"
      activeKey={key}
      onSelect={(k) => setKey(k)}
      className="mb-3"
    >
    {/* TRANSLATE FORM */}
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
      {/* TRANSLATIONS LIST */}
      <Tab eventKey="translations" title="translations">
        <div id='translationListPanal'>
       
              <TranslationsList
                currentUser={currentUser}
                active={key === 'translations'}// Re-fetches each time the tab opens, so newly saved translations show
              />
              
        </div>
      </Tab>
      {/* API LANGUAGES LIST */}
      <Tab eventKey="languages" title="LANGUAGES">
        <div id='langaugeListPanal'>
          {/* Langauges */}
          <Row id='langaugeListRow'>
            <Col id='languageListCol1'/>
            <Col xs={12} md={8} id='languageListCol'>
              <div id='languageList'>
                <div id='languageTableWrapper'>
                 <table id='languageTable'>
                  <thead>
                    <tr><th colSpan={2} aria-colspan={2}>AVAILABLE LANGUAGES<BookA/></th></tr>
                  <tr>
                    <th>LANGUAGE CODE</th>
                    <th>LANGUAGE</th>
                </tr>
                  </thead>
                  <tbody>
                    {languageData.map((language) => (
                      <tr key={language.code}>
                        <td>{language.code}</td>
                        <td className='languageName'>{language.name}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                <tr>
                  <td colSpan={2}><a href='https://langbly.com/docs/languages/#full-language-reference' className='apiLink' target='blank'>LANGUAGES</a></td>
                </tr>
            </tfoot>
                </table>

                </div>
               
              </div>
            </Col>
            <Col id='languageListCol2'/>
          </Row>
        </div>
      </Tab>
    </Tabs>
          </div>
        </section>
      <Footer logout={logout}/>
    </div>
  )
}
