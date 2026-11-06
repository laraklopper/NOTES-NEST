//Note.js
import React, { useState } from 'react'
import '../css/pagesCss/Notes.css'
import '../css/pagesCss/PageSetup.css'
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Tab from 'react-bootstrap/Tab';
import Tabs from 'react-bootstrap/Tabs';
import Header from '../components/Header'
import Footer from '../components/Footer'
import NotesList from '../components/NotesList';

//====MAIN NOTES FUNCTION COMPONENT========
export default function Notes(
  {//PROPS PASSED FROM PARENT COMPONENT (App.js)
    currentUser, 
    logout
  }) {
    const [key, setKey] = useState('notes')
  return (
    <div id='pageContainer'>
      <Header heading={'NOTES'} currentUser={currentUser} />
      <section id='notesSection1'>
        <div id='notesTabPanal'>
           <Tabs
      id="notesTabs"
      activeKey={key}
      onSelect={(k) => setKey(k)}
      className="mb-3"
    >
      <Tab eventKey="notes" title="NOTES">
        <div id='notesListDiv'>
          <Row>
            <Col>
              {/* Filter notes col */}
            </Col>
          </Row>
          <Row id='notesListRow'>
        <Col id='notesListCol'>
          <div id='notesListPanal'>
            <NotesList
              currentUser={currentUser}
            />
          </div>
        </Col>
      </Row>
        </div>
      </Tab>
      <Tab eventKey="archive" title="ARCHIVE">
        <div>
          <Row>
            <Col>
              <div>
                {/* ARCHIVE LIST */}
              </div>
            </Col>
          </Row>
        </div>
      </Tab>
      <Tab eventKey="contact" title="NOTEBOOKS">
        {/* Notebook list */}
        {/* tags list */}
      </Tab>
    </Tabs>
        </div>

      </section>
      <Footer logout={logout}/>
    </div>
  )
}
