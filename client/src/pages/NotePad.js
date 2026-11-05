//NotePad.js
import React, { useState } from 'react'
import '../css/pagesCss/PageSetup.css'
import '../css/pagesCss/NotePad.css'
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import Tab from 'react-bootstrap/Tab';
import Tabs from 'react-bootstrap/Tabs';
import Header from '../components/Header'
import Footer from '../components/Footer'
import NotePadForm from '../components/NotePadForm';
export default function NotePad(
  {//PROPS PASSED FROM PARENT COMPONENT (App.js)
    currentUser, logout}) {
      const [key, setKey] = useState('home')
      const [openNotePad, setOpenNotePad] = useState(false)

     const toggleNotePad = () => setOpenNotePad(prev => (!prev))


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

              </div>
            </Col>
          </Row>
        </div>
      </Tab>
      <Tab eventKey="contact" title="TAGS">
        Tab content for Contact
      </Tab>
    </Tabs>
      </div>
         <Row id='toggleNotPadRow'>
        <Col id='toggleNotPadCol1'/>
        <Col xs={5} id='toggleNotPadCol'>
          <Button
          variant='light'
          onClick={toggleNotePad}
          type='button'
          id='toggleNotePadBtn'
          // ARIA ATTRIBUTES:
          >
            {openNotePad ? 'Hide NotePad': 'OPEN NOTE PAD'}
          </Button>
        </Col>
        <Col id='toggleNotPadCol2'/>
      </Row>
      {openNotePad && (
        <div id='notePadBlock'>
          <Row id='notePadRow'>
            <Col id='notePadCol'>
              <div id='notePadPanal'>
                <NotePadForm/>
              </div>
            </Col>
          </Row>
        </div>
      )}
      </section>
      <Footer logout={logout}/>
        
    </div>
  )
}
