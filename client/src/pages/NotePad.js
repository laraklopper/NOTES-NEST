//NotePad.js
import React, { useCallback, useEffect, useState } from 'react'
import '../css/pagesCss/PageSetup.css'
import '../css/pagesCss/NotePad.css'
// IMPORT BOOTSTRAP COMPONENTS
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Stack from 'react-bootstrap/Stack';
import Button from 'react-bootstrap/Button';
// IMPORT CUSTOM COMPONENTS
import MainHeader from '../components/MainHeader';
import Footer from '../components/Footer'
import NotePadForm from '../components/NotePadForm';
import AddNoteBook from '../components/AddNoteBook';
import AddTag from '../components/AddTag';
// IMPORT ICONS FROM LUCIDE-REACT
import { NotebookPen, NotepadText, TagPlus, X } from 'lucide-react';


// =========MAIN NOTEPAD FUNCTION COMPONENT
export default function NotePad(//Export default NotePad.js function component
  {//PROPS PASSED FROM PARENT COMPONENT (App.js)
    currentUser,
    setError,
    logout,
    loggedIn

  }) {
  //===============STATE VARIABLES=====================
  const [newNotebookForm, setNewNotebookForm] = useState(false)
  const [newTagForm, setNewTagForm] = useState(false)
  const [profile, setProfile] = useState(null)
  const [showNotePad, setShowNotePad] = useState(false)
  const [noteLoading, setNoteLoading] = useState(false)
  const [tagLoading, setTagLoading] = useState(false)
  const [tags, setTags] = useState([])
  const [notebookLoading, setNotebookLoading] = useState(false)
  const [notebooks, setNotebooks] = useState([])

  const toggleNotePad = useCallback(() => {
    setShowNotePad(prev => (!prev))
    setNewNotebookForm(false)
    setNewTagForm(false)
  },[])
  const toggleNoteBookForm = useCallback(() => {
    setNewNotebookForm(prev => (!prev))
    setNewTagForm(false)
    setShowNotePad(false)
  },[])
  const toggleAddTagForm = useCallback(() => {
    setNewTagForm(prev => (!prev))
    setShowNotePad(false)
    setNewNotebookForm(false)
  },[])

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
  }, [setError, fetchNotebooks])

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
  }, [setError, fetchNotebooks])

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
  }, [setError, fetchTags])

  //==================JSX RENDERING===================
  return (
    <div id='pageContainer' role='main' aria-labelledby='pageTitle'>
      {/* ------Screen Reader Heading-------------- */}
      <p className='visually-hidden' id='pageTitle'>NOTE PAD PAGE</p>
      {/* Render the  */}
      <MainHeader currentUser={currentUser} heading={'NOTE PAD'} loggedIn={loggedIn}/>
      {/* ========EVENT/ANIMATION========== */}
      <Row id='eventRow' role='presentation'>
        <Col id='eventCol'>
          <div className='eventBar'>
            <div className='eventTrack'>
              <NotepadText color='#000' size={32} className='eventSlide' aria-hidden='true' focusable='false' />
            </div>
          </div>
        </Col>
      </Row>
      {/* -----------------
      SECTION 1:
      ------------- */}
      <section  id='notePadSection1'>
         <div id='notePadDiv'>
                      <Row id='toggleNotePadRow'>
        <Col id='toggleNotePadCol1'/>
        <Col xs={5} id='toggleNotePadCol'>
          <div id='toggleNotePadDiv'>
            <Button
            variant='light'
            onClick={toggleNotePad}
            id='toggleNotePadBtn'
            type='button'
            // ARIA ATTRIBUTES:
            aria-label={showNotePad ? 'HIDE NOTE PAD': 'SHOW NOTE PAD'}
            >
            {showNotePad ? (
              <>Hide Note Pad<X/></>
            ):(
              <>Show NotePad <NotepadText/></>
            )}
            </Button>
          </div>
        </Col>
        <Col id='toggleNotePadCol2'/>
      </Row>
      {showNotePad && (
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
      )}             
              </div>
      </section>
      <section  id='notePadSection2'>
        <div id='notepadFormsPanal'>
            <Row  id='toggleNoteFormsRow'>
        <Col id='toggleNoteFormsCol1'/>
        <Col xs={6} id='toggleNoteFormsCol'>
          <Stack gap={3} id='toggleNoteFormsStack'>
      <div className="p-2">
        <Button
        variant='light'
        id='toggleAddNotebookBtn'
        onClick={toggleNoteBookForm}
        aria-label= {newNotebookForm ? 'Hide Form': 'Add NoteBook'}
        >
          {newNotebookForm ? (<>HIDE FORM<X/></>): (<>ADD NOTEBOOK<NotebookPen/></>)}
        </Button>
      </div>
      <div className="p-2">
        <Button
        variant='light'
        id='toggleAddTagBtn'
        onClick={toggleAddTagForm}
        type='button'
        // ARIA ATTRIBUTES:
        aria-label={newTagForm ? 'Hide form' : 'Add New Tag'}
        >
          {newTagForm ? (<>Hide Form <X/></>) : (<>ADD NEW TAG <TagPlus/></>)}
        </Button>
      </div>
    </Stack>
        </Col>
        <Col id='toggleNoteFormsCol2'/>
      </Row>
      <div id='notesFormsPanal'>
        {newNotebookForm && (
           <div id='addNoteBookDiv'>
                <Row id='addNoteBookRow'>
                  <Col id='addNoteBookCol1' />
                  <Col xs={5} id='addNoteBookCol'>
                    <div id='addNoteBookPanal'>
                      <AddNoteBook addNotebook={addNotebook} loading={notebookLoading} notebooks={notebooks} />
                    </div>
                  </Col>
                  <Col id='addNoteBookCol2' />
                </Row>
              </div>
        )}
        {newTagForm && (
             <div id='addTagDiv'>
                <Row id='addTagRow'>
                  <Col />
                  <Col xs={5}>
                    <div id='addTagPanal'>
                      <AddTag addTag={addTag} loading={tagLoading} tags={tags} />
                    </div>
                  </Col>
                  <Col />
                </Row>
              </div>
        )}

      </div>
        </div>
      </section>
      <Footer logout={logout} loggedIn={loggedIn}/>
    </div>
  )
}
