//Notes.js
//IMPORT REQUIRED MODULES AND PACKAGES
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
// IMPORT CSS STYLESHEETS
import '../css/pagesCss/Notes.css'
import '../css/pagesCss/PageSetup.css'
// IMPORT BOOTSTRAP COMPONENTS
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Stack from 'react-bootstrap/Stack';

import Button from 'react-bootstrap/Button';
//IMPORT CUSTOM COMPONENTS
import NoteBookList from '../components/NoteBookList';
import Footer from '../components/Footer'
import EditNoteForm from '../components/EditNoteForm';
import Trash from '../components/Trash';
import ArchivedNotes from '../components/ArchivedNotes';

// IMPORT ICONS FROM LUCIDE-REACT
import { Archive, ArchiveX, BookBookmark, FolderClosed, FolderOpen, LibraryBig, NotebookTabs, Tags, Trash2, TrashOff } from 'lucide-react';
// IMPORT UTILITY FUNCTIONS
import NotesList, { NOTE_PAGE_SIZES } from '../components/NotesList';
import { EMPTY_NOTE_FILTERS } from '../util/formUtil';
import MainHeader from '../components/MainHeader';
import TagsList from '../components/TagsList';


//====MAIN NOTES FUNCTION COMPONENT========
export default function Notes(//Export the default Notes.js function component
  {//PROPS PASSED FROM PARENT COMPONENT (App.js)
    currentUser,
    logout,
    loggedIn,
    setError
  }) {
  //==========STATE VARIABLES=================
  /*Navigation state: Tabs and toggle buttons*/
  const [editNote, setEditNote] = useState(false)
  // const [showNotes, setShowNotes] = useState
  const [showArchive, setShowArchive] = useState(false)
  const [showTrash, setShowTrash] = useState(false)
  const [selectedId, setSelectedId] = useState(null)// Id of the note open in the NotesList details panal (and the EditNoteForm)
  const [notes, setNotes] = useState([])// The user's active notes from GET /notes/fetchNotes
  const [notesLoading, setNotesLoading] = useState(false)
  const [updatingNote, setUpdatingNote] = useState(false)// True while PATCH /notes/:id is running
  const [tags, setTags] = useState([])// The user's existing tags from GET /tag/fetchTags
  const [notebooks, setNotebooks] = useState([])// The user's notebooks from GET /notebooks
  /* Notes list paging and filters (sent as query params to GET /notes/fetchNotes) */
  const [notesPage, setNotesPage] = useState(1)
  const [notesLimit, setNotesLimit] = useState(NOTE_PAGE_SIZES[0])
  const [noteFilters, setNoteFilters] = useState(EMPTY_NOTE_FILTERS)// Applied filters; '' = all
  const [notesPagination, setNotesPagination] = useState({ page: 1, limit: NOTE_PAGE_SIZES[0], total: 0, totalPages: 1 })
  const latestNotesRequest = useRef(0)// Id of the most recent notes fetch, used to ignore stale responses
  /* A note opened from the Home page calendar. It may not be on the current page
  of the list, so it is fetched on its own and used when it is the selected note */
  const [linkedNote, setLinkedNote] = useState(null)
  // State to handle toggle buttons
  const [viewNotes, setViewNotes] = useState(false)
  const [showNoteBooks, setShowNoteBooks] = useState(false)//State to Toggle the Notebook List
  const [showTags, setShowTags] = useState(false);//State to toggle the Tags List

  const location = useLocation()
  const navigate = useNavigate()
  const linkedNoteId = location.state?.noteId// Set by Home.js: navigate('/notes', { state: { noteId } })

  //===========EVENT HANDLERS/CALLBACKS=====================
  //  Function to toggle Notes list
  const toggleNotes = useCallback(() => {
    setViewNotes(prev => (!prev))
    setShowTags(false)//Hide TagsList
    setShowNoteBooks(false)
  }, [])
  // Function to toggle the NoteBookList
  const toggleNoteBooks = useCallback(() => {
    setShowNoteBooks(prev => (!prev))
    setViewNotes(false)
    setShowTags(false)//Hide TagsList
    setShowArchive(false)
    setShowTrash(false)
  }, [])

  // Function to toggle the Tags List
  const toggleTags = useCallback(() => {
    setShowTags(prev => (!prev))
    setViewNotes(false)//Hide Notes list
    setShowNoteBooks(false)//Hide notebook list
    setShowArchive(false)
    setShowTrash(false)
  }, [])

  //========OPEN A NOTE FROM THE CALENDAR===============
  /* GET /notes/:id for the note picked on the calendar, then select it so the
  details panal (NotePanal.js) opens. The route state is cleared afterwards so a
  page refresh or going back does not reopen it */
  useEffect(() => {
    if (!linkedNoteId) return
    let ignore = false
    const openLinkedNote = async () => {
      try {
        // The browser sends the JWT cookie with the request
        const response = await fetch(`/notes/${linkedNoteId}`, { method: 'GET' });
        const data = await response.json().catch(() => ({}));
        if (ignore) return
        if (!response.ok) {
          throw new Error(data.message || 'Failed to fetch note');
        }
        setLinkedNote(data.note)
        setSelectedId(data.note._id)
      } catch (error) {
        if (ignore) return
        console.error('Error opening note:', error);
        setError?.('That note could not be opened. It may have been archived or deleted.')
      } finally {
        if (!ignore) navigate(location.pathname, { replace: true, state: null })
      }
    }
    openLinkedNote()
    return () => { ignore = true }
  }, [linkedNoteId, navigate, location.pathname, setError])



  //========FETCH NOTES REQUEST===============
  /* Fetches one page of the user's active notes (not archived or trashed), pinned first.
  Uses the current page/limit/filters, so other tabs calling fetchNotes() refresh the same view */
  const fetchNotes = useCallback(async () => {
    /* Number each request so only the newest one updates the list. Without this a
    slow earlier request (e.g. the previous page or filter) could finish last and
    overwrite the results the user actually asked for. */
    const requestId = ++latestNotesRequest.current
    const isStale = () => requestId !== latestNotesRequest.current
    setNotesLoading(true)
    try {
      // Only send params that have a value
      const params = new URLSearchParams({ page: String(notesPage), limit: String(notesLimit) })
      if (noteFilters.language) params.set('language', noteFilters.language)
      if (noteFilters.notebook) params.set('notebook', noteFilters.notebook)
      if (noteFilters.tag) params.set('tag', noteFilters.tag)

      // The browser sends the JWT cookie with the request
      const response = await fetch(`/notes/fetchNotes?${params.toString()}`, { method: 'GET' });
      const data = await response.json().catch(() => ({}));
      if (isStale()) return// A newer request has replaced this one
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch notes');
      }
      setNotes(Array.isArray(data.notes) ? data.notes : []);
      if (data.pagination) {
        setNotesPagination(data.pagination)
        // An archive/delete can empty the last page; step back to the new last page
        const lastPage = Math.max(data.pagination.totalPages || 1, 1)
        if (notesPage > lastPage) setNotesPage(lastPage)
      }
    } catch (error) {
      if (isStale()) return
      console.error('Error fetching notes:', error);
      setError?.('An error occurred while loading your notes.')
    } finally {
      if (!isStale()) setNotesLoading(false)
    }
  }, [setError, notesPage, notesLimit, noteFilters])

  //===========EVENT LISTENERS==============
  const toggleEditNote = () => setEditNote((prev) => !prev)
  const toggleArchive = useCallback(() => {
    setShowArchive((prev) => !prev)
    setShowTrash(false)
    setViewNotes(false)
    setShowNoteBooks(false)
    setShowTags(false)
  }, [])

  const toggleTrash = useCallback(() => {
    setShowTrash((prev) => !prev)
    setShowArchive(false)
    setViewNotes(false)
    setShowNoteBooks(false)
    setShowTags(false)
  }, [])

  // The note being edited, looked up from the list so it always has the latest data
  // (falls back to the note opened from the calendar when it is not on the current page)
  const selectedNote = notes.find((note) => note._id === selectedId)
    || (linkedNote?._id === selectedId ? linkedNote : null)
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

  //========FETCH NOTEBOOKS REQUEST===============
  /* Fetches the user's notebooks (with note counts) for the EditNoteForm's NOTEBOOK select */
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
      setLinkedNote((prev) => prev?._id === id ? data.note : prev)// Keep a calendar-opened note current too
      fetchNotes()
      if (changes.tags) fetchTags()
      if (changes.notebook !== undefined) fetchNotebooks()// Keep the notebook note counts current
      alert('Note successfully updated')
      return true
    } catch (error) {
      console.error('Error updating note:', error);
      setError?.('An error occurred while updating your note.')
      return false
    } finally {
      setUpdatingNote(false)
    }
  }, [setError, fetchNotes, fetchTags, fetchNotebooks])


  //===================JSX RENDERING===============
  return (
    <div id='pageContainer' role='main'>
      <MainHeader heading={'NOTES'} currentUser={currentUser} loggedIn={loggedIn} />
      <Row id='eventRow' role='presentation'>
        <Col id='eventCol'>
          <div className='eventBar'>
            <div className='eventTrack'>
              <NotebookTabs className='eventSlide' color='#000' size={32} aria-hidden='true' focusable='false' />
            </div>
          </div>
        </Col>
      </Row>
      {/* ---------------------------
      section 1
      ----------------- */}
      <section id='notesSection1'>
        <div id='notesListDiv'>
          <Row id='toggleNotesRow'>
            <Col id='toggleListCol1' />
            <Col xs={12} md={8} lg={5} id='toggleListCol'>
              <Stack gap={3} id='toggleNotesStack1'>
                <div className="p-2" id='toggleNotesBlock1'>
                  {viewNotes ? (
                    <span className='btnTextSpan'>
                      <h6>HIDE NOTES</h6>
                      <FolderClosed />
                    </span>
                  ) : (
                    <span className='btnTextSpan'>
                      <h6>OPEN USER NOTES</h6>
                      <FolderOpen />
                    </span>
                  )}
                  <Button
                    variant='light'
                    onClick={toggleNotes}
                    id='toggleNotesBtn'
                    type='button'
                    // ARIA ATTRIBUTES:
                    aria-label={viewNotes ? ('Hide Notes') : ('Show Notes')}
                    aria-pressed={viewNotes}
                    aria-expanded={viewNotes}
                    aria-controls='notesListPanal'
                  >
                    {viewNotes ? ('Hide Notes') : ('Show Notes')}
                  </Button>
                </div>
                <div className="p-2" id='toggleNotesBlock2'>
                  {showNoteBooks ? (
                    <span className='btnTextSpan'>
                      <h6>HIDE NOTEBOOKS</h6>
                      <BookBookmark aria-hidden='true' focusable='false' />
                    </span>
                  ) : (
                    <span className='btnTextSpan'>
                      <h6>OPEN USER NOTEBOOKS</h6>
                      <LibraryBig aria-hidden='true' focusable='false' />
                    </span>
                  )}
                  <Button
                    variant='light'
                    onClick={toggleNoteBooks}
                    id='toggleNoteBooksBtn'
                    type='button'
                    // ARIA ATTRIBUTES:
                    aria-label={showNoteBooks ? 'Hide Notebooks' : 'Show Notebooks'}
                    aria-pressed={showNoteBooks}
                    aria-expanded={showNoteBooks}
                    aria-controls='noteBookListPanal'
                  >
                    {showNoteBooks ? 'Hide Notebooks' : 'Show Notebooks'}
                  </Button>
                </div>
                <div className="p-2" id='toggleNotesBlock3'>
                  {showTags ? (
                    <span className='btnTextSpan'>
                      <h6>HIDE TAGS</h6>
                      <NotebookTabs aria-hidden='true' focusable='false' />
                    </span>
                  ) : (
                    <span className='btnTextSpan'>
                      <h6>SHOW TAGS</h6>
                      <Tags aria-hidden='true' focusable='false' />
                    </span>
                  )}
                  <Button
                    variant='light'
                    id='toggleTagsBtn'
                    onClick={toggleTags}
                    type='button'
                    // ARIA ATTRIBUTES:
                    aria-label={showTags ? 'Hide Tags' : 'Show Tags'}
                    aria-pressed={showTags}
                    aria-expanded={showTags}
                    aria-controls='tagsListPanal'
                  >
                    {showTags ? 'Hide Tags' : 'Show Tags'}
                  </Button>
                </div>
              </Stack>
            </Col>
            <Col id='toggleListCol2' />
          </Row>
          <div id='notesDataListPanal'>
            {/* TOGGLE NOTES LIST */}
            {viewNotes && (
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
                  linkedNote={linkedNote}
                  notebooks={notebooks}
                  tags={tags}
                  pagination={notesPagination}
                  limit={notesLimit}
                  setLimit={setNotesLimit}
                  setPage={setNotesPage}
                  filters={noteFilters}
                  setFilters={setNoteFilters}
                />
                <div id='editNoteDiv'>
                  {/* TOGGLE EDIT NOTE FORM */}
                  {editNote && selectedNote && (
                    <div id='editNoteBlock'>
                      <Row id='editNoteRow'>
                        <Col id='editNoteCol1' />
                        <Col id='editNoteCol' xs={12} md='8'>
                          <div id='editNotePanal'>
                            <EditNoteForm
                              note={selectedNote}
                              updateNote={updateNote}
                              loading={updatingNote}
                              tags={tags}
                              notebooks={notebooks}
                            />
                          </div>
                        </Col>
                        <Col id='editNoteCol2' />
                      </Row>
                    </div>
                  )}
                  <div />
                </div>
              </div>
            )}
            {/* Toggle the NoteBook  */}
            {showNoteBooks && (
              <div id='noteBookListPanal'>
                <Row id='notebookDataRow'>
                  <Col id='noteBooksCol1' />
                  <Col id='noteBooksCol' xs={12} md={10}>
                    <NoteBookList
                      notebooks={notebooks}
                      fetchNotebooks={fetchNotebooks}
                      fetchNotes={fetchNotes}
                      setError={setError}
                    />
                  </Col>
                  <Col id='noteBooksCol2' />
                </Row>
              </div>
            )}
            {/* TOGGLE TAGS LIST */}
            {showTags && (
              <div id='tagsListPanal'>
                <Row id='tagsDataRow'>
                  <Col id='tagsDataCol1' />
                  <Col xs={12} md={10} id='tagsDataCol'>
                    <TagsList
                      tags={tags}
                      fetchNotes={fetchNotes}
                      fetchTags={fetchTags}
                      setError={setError}
                    />
                  </Col>
                  <Col id='tagsDataCol2' />
                </Row>
              </div>
            )}
          </div>
        </div>
      </section>
      {/* =============
      SECTION 2:
      ========== */}
      <section id='notesSection2'>
        <div id='archiveTrashPanal'>
          <Row id='toggleArchiveRow'>
            <Col id='toggleNotesCol1' xs={0}/>
            <Col xs={12} md={5} id='toggleNotesCol'>
              <Stack gap={2} id='toggleNotesStack2'>
                <div className="p-2" id='toggleNotesBlock5'>
                  {showArchive ? (
                    <span className='btnTextSpan'>
                      <h6>HIDE ARCHIVED NOTES</h6>
                      <ArchiveX />
                    </span>
                  ) : (
                    <span className='btnTextSpan'>
                      <h6>OPEN ARCHIVED NOTES</h6>
                      <Archive />
                    </span>
                  )}
                  <Button
                    variant="light"
                    id='toggleArchiveBtn'
                    type='button'
                    onClick={toggleArchive}
                    // ARIA ATTRIBUTES:
                    aria-label={showArchive ? 'HIDE ARCHIVE BUTTON' : 'SHOW ARCHIVE BUTTON'}
                    aria-controls='archiveDiv'
                    aria-pressed={showArchive}
                    aria-expanded={showArchive}
                  >
                    {showArchive ? 'HIDE ARCHIVE' : 'SHOW ARCHIVE'}
                  </Button>
                </div>
                <div className="p-2" id='toggleNotesBlock6'>
                  {showTrash ? (
                    <span className='btnTextSpan'>
                      <h6>CLOSE TRASHED NOTES</h6>
                      <TrashOff aria-hidden='true' focusable='false' />
                    </span>
                  ) : (
                    <span className='btnTextSpan'>
                      <h6>OPEN TRASHED NOTES</h6>
                      <Trash2 aria-hidden='true' focusable='false' />
                    </span>
                  )}
                  <Button
                    variant="light"
                    id='toggleTrashBtn'
                    type='button'
                    onClick={toggleTrash}
                    // ARIA ATTRIBUTES:
                    aria-label={showTrash ? 'HIDE TRASH BUTTON' : 'SHOW TRASH BUTTON'}
                    aria-expanded={showTrash}
                    aria-pressed={showTrash}
                    aria-controls='trashListPanal'
                  >
                    {showTrash ? 'HIDE TRASH' : 'SHOW TRASH'}
                  </Button>
                </div>
              </Stack>
            </Col>
            <Col id='toggleNotesCol2' xs='0'/>
          </Row>
          <div id='listsDiv'>
            {/* TOGGLE (NOTES) ARCHIVE LIST */}
            {showArchive && (
              <div id='archiveDiv'>
                <Row id='archiveRow'>
                  <Col id='archiveCol1' xs='0' />
                  <Col id='archiveCol' xs={12} md={12}>
                    <div id='archiveList'>
                      <ArchivedNotes
                        setError={setError}
                        fetchNotes={fetchNotes}// Refreshes the NOTES tab when a note is restored
                      />
                    </div>
                  </Col>
                  <Col id='archiveCol2' xs='0' />
                </Row>
              </div>
            )}
            {/* TOGGLE (NOTES) TRASH LIST */}
            {showTrash && (
              <div id='trashListPanal'>
                <Row id='trashRow'>
                  <Col id='trashCol' xs={12} md={12}>
                    {/* TRASH */}
                    <div id='trashList'>
                      <Trash
                        setError={setError}
                        fetchNotes={fetchNotes}// Refreshes the NOTES tab when a note is restored
                      />
                    </div>
                  </Col>
                </Row>
              </div>
            )}
          </div>
        </div>
      </section>
      <Footer logout={logout} loggedIn={loggedIn} />
    </div>
  )
}
