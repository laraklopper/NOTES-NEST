//Note.js
//IMPORT REQUIRED MODULES AND PACKAGES
import React, { useCallback, useState } from 'react'
// IMPORT CSS STYLESHEETS
import '../css/pagesCss/Notes.css'
import '../css/pagesCss/PageSetup.css'
// IMPORT BOOTSTRAP COMPONENTS
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Tab from 'react-bootstrap/Tab';
import Tabs from 'react-bootstrap/Tabs';
//IMPORT CUSTOM COMPONENTS
import Header from '../components/Header'
import Footer from '../components/Footer'
import NotesList from '../components/NotesList';
import EditNoteForm from '../components/EditNoteForm';

//====MAIN NOTES FUNCTION COMPONENT========
export default function Notes(//Export the default Notes.js function component
  {//PROPS PASSED FROM PARENT COMPONENT (App.js)
    currentUser, 
    logout,
    setError
  }) {
    //==========STATE VARIABLES=================
    const [key, setKey] = useState('notes')
    const [editNote, setEditNote] = useState(false)
    const [notes, setNotes] = useState([])// The user's active notes from GET /notes/fetchNotes
    const [notesLoading, setNotesLoading] = useState(false)

     const toggleEditNote = () => setEditNote ((prev) => !prev)

     //========FETCH NOTES REQUEST===============
     /* Fetches the user's active notes (not archived or trashed), pinned first */
     const fetchNotes = useCallback(async () => {
      setNotesLoading(true)
      try {
        // The browser sends the JWT cookie with the request
        const response = await fetch('/notes/fetchNotes', { method: 'GET' });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.message || 'Failed to fetch notes');
        }
        setNotes(data.notes || []);
      } catch (error) {
        console.error('Error fetching notes:', error);
        setError?.('An error occurred while loading your notes.')
      } finally {
        setNotesLoading(false)
      }
     }, [setError])

   
     
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
              {/* Filter notes*/}
            </Col>
          </Row>
          <Row id='notesListRow'>
        <Col id='notesListCol'>
          <div id='notesListPanal'>
            <NotesList
              currentUser={currentUser}
              editNote={editNote}
              toggleEditNote={toggleEditNote}
              setError={setError}
              notes={notes}
              loading={notesLoading}
              fetchNotes={fetchNotes}
            />
          </div>
        </Col>
      </Row>
      {/* TOGGLE EDIT NOTE FORM */}
      {editNote && (
        <div id='editNoteBlock'>
          <Row id='editNoteRow'>
            <Col id='editNoteCol'>
              <div id='editNotePanal'>
                <EditNoteForm
                  setError={setError}
                  currentUser={currentUser}
                />
              </div>
            </Col>
          </Row>
        </div>
      )}
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
