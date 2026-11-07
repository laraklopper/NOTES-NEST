//NotePad.js
import React, { useCallback, useEffect, useState } from 'react'
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
      const [profile, setProfile] = useState(null)
      const [noteLoading, setNoteLoading] = useState(false)
      const [tagLoading, setTagLoading] = useState(false)
      const [tags, setTags] = useState([])
      const [notebookLoading, setNotebookLoading] = useState(false)
      const [notebooks, setNotebooks] = useState([])

      /* currentUser only holds userId, fullName and admin, so fetch the
      profile for the username and default note language shown on the form */
      useEffect(() => {
        const fetchProfile = async () => {
          try {
            const response = await fetch('/user/me', { method: 'GET' });
            if (!response.ok) {
              throw new Error('Failed to fetch profile');
            }
            setProfile(await response.json());
          } catch (error) {
            console.error('Error fetching profile:', error);
          }
        }
        fetchProfile();
      }, [currentUser?.userId]);

      //========FETCH TAGS REQUEST===============
      /* Fetches the user's tags (with note counts) for the TAGS tab */
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

      //========FETCH NOTEBOOKS REQUEST===============
      /* Fetches the user's notebooks (with note counts) for the NOTE BOOK
      select on the NOTE PAD tab and the list on the NOTEBOOK tab */
      const fetchNotebooks = useCallback(async () => {
        try {
          // The browser sends the JWT cookie with the request
          const response = await fetch('/notebooks', { method: 'GET' });
          const data = await response.json().catch(() => ({}));
          if (!response.ok) {
            throw new Error(data.message || 'Failed to fetch notebooks');
          }
          setNotebooks(data.notebooks || []);
        } catch (error) {
          console.error('Error fetching notebooks:', error);
        }
      }, [])

      useEffect(() => {
        fetchNotebooks();
      }, [fetchNotebooks, currentUser?.userId]);

      //========ADD NOTEBOOK REQUEST===============
      /* Sends the name and colour from AddNoteBook.js.
      Returns true on success so the form knows to clear itself */
      const addNotebook = useCallback(async (notebook) => {
        setError?.(null)
        setNotebookLoading(true)
        try {
          // The browser sends the JWT cookie with the request
          const response = await fetch('/notebooks', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(notebook)
          })
          const data = await response.json().catch(() => ({}));
          if (!response.ok) {
            setError?.(data.message || 'Failed to save notebook.')
            return false
          }
          alert(`Notebook "${data.notebook?.name || notebook.name}" saved successfully.`)
          fetchNotebooks()// Refresh the notebook list so the new notebook shows up
          return true
        } catch (error) {
          console.error('Error adding new notebook:', error);
          setError?.('An error occurred while saving your notebook.')
          return false
        } finally {
          setNotebookLoading(false)
        }
      },[setError, fetchNotebooks])

      //========ADD NOTE REQUEST===============
      /* Sends the note built by NotePadForm.js.
      Returns true on success so the form knows to clear itself */
      const addNote = useCallback(async (note) => {
        setError?.(null)
        setNoteLoading(true)
        try {
          // The browser sends the JWT cookie with the request
          const response = await fetch('/notes/addNote', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(note)
          })
          const data = await response.json().catch(() => ({}));
          if (!response.ok) {
            setError?.(data.message || 'Failed to save note.')
            return false
          }
          alert('Note saved successfully.')
          if (note.notebook) fetchNotebooks()// Keep the notebook note counts current
          return true
        } catch (error) {
          console.error('Error adding new note:', error);
          setError?.('An error occurred while saving your note.')
          return false
        } finally {
          setNoteLoading(false)
        }
      },[setError, fetchNotebooks])

      //========ADD TAG REQUEST===============
      /* Sends the tag name from AddTag.js.
      Returns true on success so the form knows to clear itself */
      const addTag = useCallback(async (name) => {
        setError?.(null)
        setTagLoading(true)
        try {
          // The browser sends the JWT cookie with the request
          const response = await fetch('/tag/addTag', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name })
          })
          const data = await response.json().catch(() => ({}));
          if (!response.ok) {
            setError?.(data.message || 'Failed to save tag.')
            return false
          }
          alert(`Tag "${data.tag?.name || name}" saved successfully.`)
          fetchTags()// Refresh the tag list so the new tag shows up
          return true
        } catch (error) {
          console.error('Error adding new tag:', error);
          setError?.('An error occurred while saving your tag.')
          return false
        } finally {
          setTagLoading(false)
        }
      },[setError, fetchTags])

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
                <NotePadForm
                  addNote={addNote}
                  loading={noteLoading}
                  username={profile?.username}
                  defaultLanguage={profile?.defaultLanguages?.defaultNoteLanguage}
                  tags={tags}
                  notebooks={notebooks}
                />
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
                <AddNoteBook addNotebook={addNotebook} loading={notebookLoading} notebooks={notebooks}/>
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
                <AddTag addTag={addTag} loading={tagLoading} tags={tags}/>
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
