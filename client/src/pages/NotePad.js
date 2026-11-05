//NotePad.js
import React, { useCallback, useState } from 'react'
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
    currentUser, 
    setError,
    logout
  
  }) {
      const [key, setKey] = useState('notepad')


      //Function to add/create a new note
      const addNote = useCallback(async () => {
        try {
          const token = localStorage.getItem('token')
          const response = await fetch(`http://localhost:3001/notes/addNote`, {
            method: 'POST',
            mode: 'cors',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              // payload
            })
          })
        } catch (error) {
          // console.error('Error adding new note');
          
        }
      },[])

  return (
    <div id='pageContainer'>
      <Header currentUser={currentUser}/>
      <section
      id='notePadSection'
      >
      <div id='notepadFormsPanal'>
          <Tabs
      id="notePadTabs"
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
        <div id='addNoteBookDiv'>
          <Row id='addNoteBookRow'>
            <Col id='addNoteBookCol1'/>
            <Col xs={5} id='addNoteBookCol'>
              <div id='addNoteBookPanal'>
                <AddNoteBook/>
              </div>
            </Col>
            <Col id='addNoteBookCol2'/>
          </Row>
        </div>
      </Tab>
      <Tab eventKey="contact" title="TAGS">
        <div id='addTagDiv'>
          <Row id='addTagRow'>
            <Col/>
            <Col xs={5}>
              <div id='addTagPanal'>
                <AddTag/>
              </div>
            </Col>
            <Col/>
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
