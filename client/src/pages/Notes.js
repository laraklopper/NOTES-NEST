//Note.js
//IMPORT REQUIRED MODULES AND PACKAGES
import React, { useCallback, useEffect, useState } from 'react'
// IMPORT CSS STYLESHEETS
import '../css/pagesCss/Notes.css'
import '../css/pagesCss/PageSetup.css'
// IMPORT BOOTSTRAP COMPONENTS
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Stack from 'react-bootstrap/Stack';
import Tab from 'react-bootstrap/Tab';
import Tabs from 'react-bootstrap/Tabs';
import Button from 'react-bootstrap/Button';
//IMPORT CUSTOM COMPONENTS
import Header from '../components/Header'
import Footer from '../components/Footer'
import NotesList from '../components/NotesList';
import EditNoteForm from '../components/EditNoteForm';
import Trash from '../components/Trash';

//====MAIN NOTES FUNCTION COMPONENT========
export default function Notes(//Export the default Notes.js function component
  {//PROPS PASSED FROM PARENT COMPONENT (App.js)
    currentUser, 
    logout,
    setError
  }) {
    //==========STATE VARIABLES=================
    /*Navigation state: Tabs and toggle buttons*/
    const [key, setKey] = useState('notes')
    const [editNote, setEditNote] = useState(false)
    const [showArchive, setShowArchive] = useState(false)
    const [showTrash, setShowTrash] = useState(false)
    const [selectedId, setSelectedId] = useState(null)// Id of the note open in the NotesList details panal (and the EditNoteForm)
    const [notes, setNotes] = useState([])// The user's active notes from GET /notes/fetchNotes
    const [notesLoading, setNotesLoading] = useState(false)
    const [updatingNote, setUpdatingNote] = useState(false)// True while PATCH /notes/:id is running
    const [tags, setTags] = useState([])// The user's existing tags from GET /tag/fetchTags


  

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

       //===========EVENT LISTENERS==============
     const toggleEditNote = () => setEditNote ((prev) => !prev)
     const toggleArchive = useCallback(() => {
      setShowArchive((prev) => !prev)
      setShowTrash(false)
     },[])

     const toggleTrash = useCallback(() => {
      setShowTrash((prev) => !prev)
      setShowArchive(false)
     },[])

     // The note being edited, looked up from the list so it always has the latest data
     const selectedNote = notes.find((note) => note._id === selectedId) || null
     //========FETCH TAGS REQUEST===============
     /* Fetches the user's tags for the EditNoteForm's ADD TAG dropdown */
     const fetchTags = useCallback(async () => {
      try {
        // The browser sends the JWT cookie with the request
        const response = await fetch('/tag/fetchTags', { method: 'GET' });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.message || 'Failed to fetch tags');
        }
        setTags(data.tags || []);
      } catch (error) {
        console.error('Error fetching tags:', error);
      }
     }, [])

     useEffect(() => {
      fetchTags();
     }, [fetchTags, currentUser?.userId]);

     //========UPDATE NOTE REQUEST===============
     /* Sends the changes built by EditNoteForm.js to PATCH /notes/:id.
     Returns true on success so the form knows the save worked */
     const updateNote = useCallback(async (id, changes) => {
      setError?.(null)
      setUpdatingNote(true)
      try {
        // The browser sends the JWT cookie with the request
        const response = await fetch(`/notes/${id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(changes)
        })
        const data = await response.json().catch(() => ({}));// Safely parse JSON (avoid crash if server returns non-JSON)
        if (!response.ok) {
          setError?.(data.message || 'Failed to update note.')
          return false
        }
        // Swap the updated note into the list, then refetch so pinned order and any new tags are current
        setNotes((prev) => prev.map((note) => note._id === id ? data.note : note))
        fetchNotes()
        if (changes.tags) fetchTags()
        alert('Note successfully updated')
        return true
      } catch (error) {
        console.error('Error updating note:', error);
        setError?.('An error occurred while updating your note.')
        return false
      } finally {
        setUpdatingNote(false)
      }
     }, [setError, fetchNotes, fetchTags])


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
              selectedId={selectedId}
              setSelectedId={setSelectedId}
            />
          </div>
        </Col>
      </Row>
      {/* TOGGLE EDIT NOTE FORM */}
      {editNote && selectedNote && (
        <div id='editNoteBlock'>
          <Row id='editNoteRow'>
            <Col id='editNoteCol'>
              <div id='editNotePanal'>
                <EditNoteForm
                  note={selectedNote}
                  updateNote={updateNote}
                  loading={updatingNote}
                  tags={tags}
                />
              </div>
            </Col>
          </Row>
        </div>
      )}
        </div>
      </Tab>
      
      <Tab eventKey="contact" title="NOTEBOOKS">
        {/* Notebook list */}
        {/* tags list */}
      </Tab>
      <Tab eventKey="tags" title="TAGS">
        {/* tags list */}
      </Tab>
      <Tab eventKey="archive" title="ARCHIVE & TRASH">
        <div id='archiveTrashPanal'>
         <Row id='toggleNotesRow'>
          <Col id='toggleNotesCol'>
          <Stack gap={2} className="col-md-5 mx-auto" id='toggleNotesStack'>
      <Button 
      variant="light"
      id='toggleArchiveBtn'
      type='button'
      >
        ARCHIVE
      </Button>
      <Button 
      variant="light"
      id='toggleTrashBtn'
      type='button'
      onClick={toggleTrash}
      // ARIA ATTRIBUTES:
      >
        TRASH
      </Button>
    </Stack>
          </Col>
        </Row>
        <div id='listsDiv'>
         {showArchive && (
          <div id='archiveDiv'>
              <Row id='archiveRow'>
            <Col id='archiveCol'>
                {/* ARCHIVE LIST */}
            </Col>
          </Row>
          </div>

        )}
        {showTrash && (
          <div id='trashListPanal'>
          <Row id='trashRow'>
            <Col id='trashCol'>
              {/* TRASH */}
                <div id='trashList'>
                  <Trash
                    currentUser={currentUser}
                    setError={setError}
                  />
                </div>
            </Col>
          </Row>
          </div>
        )}
        </div>
       
        
        </div>
      </Tab>
    </Tabs>
        </div>

      </section>
      <section>
       
      </section>
      <Footer logout={logout}/>
    </div>
  )
}
