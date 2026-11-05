//NotePad.js
import React, { useState } from 'react'
import '../css/pagesCss/PageSetup.css'
import '../css/pagesCss/NotePad.css'
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
// import Button from 'react-bootstrap/Button';
import Tab from 'react-bootstrap/Tab';
import Tabs from 'react-bootstrap/Tabs';
import Header from '../components/Header'
import Footer from '../components/Footer'
import NotePadForm from '../components/NotePadForm';
import AddNoteBook from '../components/AddNoteBook';
import AddTag from '../components/AddTag';
export default function NotePad(
  {//PROPS PASSED FROM PARENT COMPONENT (App.js)
    currentUser, logout}) {
      const [key, setKey] = useState('home')



  return (
    <div id='pageContainer'>
      <Header currentUser={currentUser}/>
      <section
      id='notePadSection'
      >
      <div>
          <Tabs
      id="controlled-tab-example"
      activeKey={key}
      onSelect={(k) => setKey(k)}
      className="mb-3"
    >
      <Tab eventKey="notepad" title="NOTE PAD">
        <div id='notePadBlock'>
          <Row id='notePadRow'>
            <Col id='notePadCol'>
              <div id='notePadPanal'>
                <NotePadForm/>
              </div>
            </Col>
          </Row>
        </div>
      </Tab>
      <Tab eventKey="notebook" title="NOTEBOOK">
        <div>
          <Row>
            <Col>
              <div id='addNoteBookPanal'>
                <AddNoteBook/>
              </div>
            </Col>
          </Row>
        </div>
      </Tab>
      <Tab eventKey="contact" title="TAGS">
        <div>
          <Row>
            <Col>
              <div>
                <AddTag/>
              </div>
            </Col>
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
