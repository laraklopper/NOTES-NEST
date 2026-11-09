//NotesList.js
//IMPORT REQUIRED MODULES AND PACKAGES
import React, { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom';
// IMPORT CSS STYLESHEETS
import '../css/componentCss/NotesList.css'
import '../css/componentCss/ListTables.css'
import '../css/componentCss/DetailsPanals.css'
// IMPORT BOOTSTRAP COMPONENTS
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import Stack from 'react-bootstrap/Stack'
import Form from 'react-bootstrap/Form';
// IMPORT UTILITY FUNCTIONS
import { dateDisplay, timeDisplay } from '../util/dateFunctions';
import { languageName } from '../util/languageFunc';
// IMPORT ICONS FROM LUCIDE-REACT
import { ArchiveArrowDownIcon, ChevronLeft, ChevronRight, Copy, Edit3Icon, Filter, FilterX, Pin, Trash2, X } from 'lucide-react';
// IMPORT COMPONENTS
import FilterNotes, { EMPTY_NOTE_FILTERS } from './FilterNotes';

export const NOTE_PAGE_SIZES = [10, 20, 50];// Options for the "per page" select (server caps at 50)

// Date and time a note was created, e.g. "06/11/2026 14:05:09"
const formatTimestamp = (dateString) => {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return 'Invalid date'
    return `${dateDisplay(date)} ${timeDisplay(date)}`
}

// Comma separated tag names for the table, e.g. "work, ideas"
const tagNames = (tags = []) => tags.map((tag) => tag?.name).filter(Boolean).join(', ')

// NotesList component
/* Table of the user's active notes, with a details panel for the selected note
GET /notes/fetchNotes (via fetchNotes), PATCH /archive/:id, DELETE /notes/delete/:id */
export default function NotesList(
    {//PROPS PASSED FROM PARENT COMPONENT (Notes.js)
        currentUser,
        editNote,
        toggleEditNote,
        notes = [],
        loading = false,
        fetchNotes,
        selectedId,// Id of the note shown in the details panal (state lives in Notes.js so EditNoteForm can use it)
        setSelectedId,
        notebooks = [],// For the notebook filter select
        tags = [],// For the tag filter select
        // Paging and filter state lives in Notes.js so fetchNotes() always reloads the current view
        pagination = { page: 1, limit: NOTE_PAGE_SIZES[0], total: 0, totalPages: 1 },
        limit = NOTE_PAGE_SIZES[0],
        setLimit,
        setPage,
        filters = EMPTY_NOTE_FILTERS,
        setFilters
    }
) {
    const [showFilter, setShowFilter] = useState(false)
    const [error, setError] = useState(null)
    const [actionLoading, setActionLoading] = useState(false)// True while an archive/trash request is running

    /* The selected note is looked up from the list (rather than stored as a copy)
    so it always shows the latest data after fetchNotes runs */
    const selectedIndex = notes.findIndex((note) => note._id === selectedId)
    const selectedNote = selectedIndex === -1 ? null : notes[selectedIndex]
    const rowNumber = (index) => (pagination.page - 1) * pagination.limit + index + 1// Numbering carries on across pages
    const { language, notebook, tag } = filters
    const filtersActive = Boolean(language || notebook || tag)
    // Names for the filter summary, looked up from the ids
    const notebookName = notebooks.find((n) => n._id === notebook)?.name || 'Unknown notebook'
    const tagName = tags.find((t) => t._id === tag)?.name || 'Unknown tag'

    // Fetch on mount and whenever the page/limit/filters change (fetchNotes is rebuilt when they do)
    useEffect(() => {
        fetchNotes?.()
    },[fetchNotes])

    const toggleFilter = () => setShowFilter((prev) => !prev)
    // Close the details panal (and the edit form that belongs to it)
    const closePanal = useCallback(() => {
        setSelectedId(null)
        if (editNote) toggleEditNote?.()
    }, [editNote, toggleEditNote, setSelectedId])

    // Applying or clearing filters starts again from page 1
    const handleApplyFilters = (newFilters) => {
        setFilters?.({ ...EMPTY_NOTE_FILTERS, ...newFilters })
        setPage?.(1)
        closePanal()
    }
    const handleClearFilters = () => {
        setFilters?.(EMPTY_NOTE_FILTERS)
        setPage?.(1)
        closePanal()
    }
    const handleLimitChange = (e) => {
        setLimit?.(Number(e.target.value))
        setPage?.(1)
        closePanal()
    }
    const goToPage = (newPage) => {
        setPage?.(newPage)
        closePanal()
    }

    /* Shared request runner for the archive and trash buttons.
    Refreshes the list and closes the panal on success */
    const runNoteAction = useCallback(async (url, method, fallbackMessage) => {
        setError?.(null)
        setActionLoading(true)
        try {
            // The browser sends the JWT cookie with the request
            const response = await fetch(url, { method })
            const data = await response.json().catch(() => ({}))
            if (!response.ok) {
                setError?.(data.message || fallbackMessage)
                return false
            }
            closePanal()
            await fetchNotes?.()// Refresh the list so the note disappears from it
            return true
        } catch (error) {
            console.error(fallbackMessage, error)
            setError?.(fallbackMessage)
            return false
        } finally {
            setActionLoading(false)
        }
    }, [setError, closePanal, fetchNotes])

    //========ARCHIVE NOTE REQUEST===============
    const archiveNote = useCallback(async (id) => {
        const success = await runNoteAction(`/archive/${id}`, 'PATCH', 'Error archiving note.')
        if (success) alert('Note successfully archived')
    }, [runNoteAction])

    //========MOVE NOTE TO TRASH REQUEST===============
    const moveToTrash = useCallback(async (id) => {
        const success = await runNoteAction(`/notes/delete/${id}`, 'DELETE', 'Error moving note to trash.')
        if (success) alert('Note successfully moved to trash')
    }, [runNoteAction])

    // Ask before archiving the selected note
    const handleArchive = () => {
        if (!selectedNote) return
        const confirmArchive = window.confirm(
            `Are you sure you want to archive "${selectedNote.title}"?`
        )
        if (!confirmArchive) return;
        archiveNote(selectedNote._id)
    }

    // Ask before moving the selected note to trash
    const handleDelete = () => {
        if (!selectedNote) return
        const confirmDelete = window.confirm(
            `Are you sure you want to move "${selectedNote.title}" to trash?`
        )
        if (!confirmDelete) return;
        moveToTrash(selectedNote._id)
    }

    // Copy the note text (without HTML tags) to the clipboard
    const handleCopy = async () => {
        if (!selectedNote) return
        try {
            await navigator.clipboard.writeText(selectedNote.plainText || '')
            alert('Note copied to clipboard')
        } catch (error) {
            console.error('Error copying note:', error)
            setError?.('Could not copy the note to the clipboard.')
        }
    }

    const tableHeading = currentUser?.fullName?.firstName
        ? `${currentUser.fullName.firstName.toUpperCase()}'S NOTES`
        : 'MY NOTES'

    //=======================JSX RENDERING=======================================
  return (
    <div id='notesList'>
      <Row id='errorRow'>
        <Col/>
        <Col id='errorCol' xs={6}>
            <span>{error && <p className='text-danger' role='alert'>{error}</p>}</span>
        </Col>
        <Col/>
    </Row>
    <Row id='toggleFilterRow'>
        <Col id='toggleFilterCol'>
        <div className='toggleFilterDiv'>
  <Stack direction="horizontal" gap={3} id='toggleFilterStack'>
      {/* SUMMARY OF THE APPLIED FILTERS */}
      <div className="p-2" aria-live='polite'>
        {filtersActive ? (
            <span className='filterStatusSpan'>
                FILTERED:
                {language && ` ${languageName(language)}`}
                {notebook && ` | NOTEBOOK: ${notebookName}`}
                {tag && ` | TAG: ${tagName}`}
            </span>
        ) : (
            <span className='filterStatusSpan'>
                SHOWING ALL NOTES
            </span>
        )}
      </div>
      <div className="p-2 ms-auto">
        {filtersActive && (
            <Button
            variant='light'
            type='button'
            onClick={handleClearFilters}
            disabled={loading}
            // ARIA ATTRIBUTES:
            aria-label='Clear note filters'
            >
                <FilterX aria-hidden='true' focusable='false'/> CLEAR
            </Button>
        )}
      </div>
      <div className="p-2">
        <Button
        variant='light'
        id='toggleFilterBtn'
        type='button'
        onClick={toggleFilter}
        // ARIA ATTRIBUTES:
        aria-expanded={showFilter}
        aria-controls={showFilter ? 'filterRow' : undefined}// Only point at the filter while it exists
        >
        <Filter aria-hidden='true' focusable='false'/> {showFilter ? 'HIDE FILTER' : 'SHOW FILTER'}
        </Button>
      </div>
    </Stack>
        </div>

        </Col>
    </Row>
    {showFilter && (
        <Row style={{width: '100%'}} id='filterRow'>
        <Col style={{width: '100%'}} id='filterCol'>
        <FilterNotes
            loading={loading}
            filters={filters}
            notebooks={notebooks}
            tags={tags}
            onApply={handleApplyFilters}
            onClear={handleClearFilters}
        />
        </Col>
    </Row>
    )}
    <Row id='notesListRow'>
    <Col xs={12} md={12} id='notesListCol'>
     <div id='notesListWrapper'>
        <table id='notesListTable'>
            <thead>
            <tr id='mainThRow'>
                <th id='tableMainHead' colSpan={7}>{tableHeading}</th>
            </tr>
            <tr>
                <th>#</th>
                <th>TITLE</th>
                <th>LANGUAGE</th>
                <th>NOTE BOOK</th>
                <th>TAGS</th>
                <th>DATE ADDED</th>
                <td>
                    {/* view note button */}
                </td>
            </tr>
            </thead>
            <tbody>
                {loading && notes.length === 0 ? (
                    <tr>
                        <td colSpan={7}>LOADING NOTES...</td>
                    </tr>
                ) : notes.length === 0 ? (
                    <tr>
                        <td colSpan={7}>{filtersActive ? 'NO NOTES MATCH THESE FILTERS' : 'NO NOTES YET'}</td>
                    </tr>
                ) : (
                    notes.map((note, index) => (
                        <tr key={note._id}>
                            <td>{rowNumber(index)}</td>
                            <td>
                                {note.isPinned && (
                                    <Pin size={14} aria-label='Pinned' />
                                )} {note.title}
                            </td>
                            <td>{languageName(note.language)}</td>
                            <td>{note.notebook?.name || '-'}</td>
                            <td>{tagNames(note.tags) || '-'}</td>
                            <td>{formatTimestamp(note.createdAt)}</td>
                            <td>
                                <div id='tableBtnDiv'>
                                    <Button
                                    variant='light'
                                    className='viewNoteBtn'
                                    type='button'
                                    onClick={() => setSelectedId(note._id)}
                                    // ARIA ATTRIBUTES:
                                    aria-label={`View note ${note.title}`}
                                    aria-pressed={note._id === selectedId}
                                    >
                                        VIEW
                                    </Button>
                                </div>
                            </td>
                        </tr>
                    ))
                )}
            </tbody>
            <tfoot>
                <tr>
                    <td colSpan={7}>
                    {/* DISPLAY PAGINATION STACK IN Pagination.js */}
                    <Stack gap={3} id='paginationStack'>
      <div className="p-2" id='paginationBlock1'>
                            <Form.Group controlId='notePageSize'>
                                <Form.Label className='m-0' id='pagLabel'>PER PAGE:</Form.Label>
                                <Form.Select size='sm' value={limit} onChange={handleLimitChange} disabled={loading}>
                                    {NOTE_PAGE_SIZES.map((size) => (
                                        <option key={size} value={size}>{size}</option>
                                    ))}
                                </Form.Select>
                            </Form.Group>
      </div>
      <div className="p-2" id='paginationBlock2'>
          <Button
                            variant='light'
                            id='pagBtn1'
                            size='sm'
                            type='button'
                            onClick={() => goToPage(pagination.page - 1)}
                            disabled={loading || pagination.page <= 1}
                            aria-label='Previous page'
                            ><ChevronLeft aria-hidden='true' focusable='false'/></Button>
                            <span>
                                PAGE {pagination.page} OF {pagination.totalPages} ({pagination.total} TOTAL)
                            </span>
                            <Button
                            variant='light'
                            size='sm'
                            id='pagBtn2'
                            type='button'
                            onClick={() => goToPage(pagination.page + 1)}
                            disabled={loading || pagination.page >= pagination.totalPages}
                            aria-label='Next page'
                            ><ChevronRight aria-hidden='true' focusable='false'/></Button>
      </div>
    </Stack>
                    </td>
                </tr>
            </tfoot>
        </table>
    </div>
    </Col>
    </Row>
    <Row id='notePanalRow'>
      <Col id='notePanalCol'>
 {/* SELECTED NOTE PANAL
 display in NotePanal.js*/}
    {selectedNote && (
    <div id='notePanal'>
            <Stack direction="horizontal" gap={3} id='notePanalHead'>
      <div className="p-2">
      <span id='panalHeadSpan'>
      <h4 className='panalHeading'>#{rowNumber(selectedIndex)} {selectedNote.title}</h4>
      </span>
      </div>
      <div className="p-2 ms-auto">
        <Button
        variant='warning'
        id='editNoteBtn'
        type='button'
        onClick={toggleEditNote}
        // ARIA ATTRIBUTES:
        aria-label={editNote ? 'Hide Form': 'Edit Note'}
        >
            {editNote ? (
                <>
                   <X/> HIDE FORM
                </>
            ): (
                <>
                    <Edit3Icon/>
                    EDIT NOTE
                </>
            )}
        </Button>
      </div>
      <div className="vr" style={{width: '2px'}} />
      <div className="p-2">
        <Button
        variant='warning'
        id='closePanalBtn'
        type='button'
        onClick={closePanal}
        // ARIA ATTRIBUTES:
        aria-label='Close note details'
        >
          <X aria-hidden='true' focusable='false' />  CLOSE
        </Button>
      </div>
    </Stack>
        <div id='notePanalBody'>
        {/* STACK 1 */}
             <Stack gap={3} id='notePanalStack1'>
      <div className="p-2" id='noteContentBlock'>
        <div id='noteContentDiv'>
            <span className='dataSpan'>
                <p className='dataLabel'>CONTENT:</p>
                {/* Content is TipTap HTML, sanitised by noteSchema before it is saved.
                A div is used because the HTML contains its own <p> tags */}
                 <div
                    id='noteContentPara'
                    className='detailValue'
                    dangerouslySetInnerHTML={{ __html: selectedNote.content }}
                 />
            </span>
                 <div id='copyNoteDiv'>
                {/* COPY CONTENT BUTTON */}
                <Button
                    variant='light'
                    id='copyContentBtn'
                    type='button'
                    onClick={handleCopy}
                    // ARIA ATTRIBUTES:
                    aria-label='Copy note text'
                ><Copy aria-hidden='true' focusable='false'/>COPY</Button>
            </div>
        </div>
      </div>
        <div className="p-2">
        <span className='dataSpan'>
            <p className='dataLabel'>LANGUAGE:</p>
            <p className='dataValue'>{languageName(selectedNote.language)}</p>
        </span>
      </div>
    </Stack>
    {/* STACK 2: */}
             <Stack gap={3} id='notePanalStack2'>
                <div className="p-2">
        <span className='dataSpan'>
            <p className='dataLabel'>DATE ADDED:</p>
            <p className='dataValue'>{formatTimestamp(selectedNote.createdAt)}</p>
        </span>
    </div>
      <div className="p-2" id='noteBookBlock'>
        {/* Notebook */}
        <span className='dataSpan'>
            <p className='dataLabel'>NOTE BOOK:</p>
            <p className='dataValue'>{selectedNote.notebook?.name || 'No notebook'}</p>
        </span>
      </div>
      <div className="p-2" id='noteTagGroup'>
{/* Tags */}
<p className='dataLabel'>TAGS:</p>
        <ul className='tagList'>
            {selectedNote.tags?.length ? (
                selectedNote.tags.map((tag) => (
                    <li className='tagListItem' key={tag._id}>{tag.name}</li>
                ))
            ) : (
                <li className='tagListItem'>No tags</li>
            )}
        </ul>
      </div>
    </Stack>
        </div>
    <Stack direction="horizontal" gap={3} id='panalFooter'>
      <div className="p-2">
        {/* Link to translateForm; the note id is passed in the route state */}
        <Link className='refLink' to='/translate' state={{ noteId: selectedNote._id }}>TRANSLATE</Link>
      </div>
      <div className="p-2 ms-auto">
        <Button
        variant='warning'
        id='archiveNoteBtn'
        type='button'
        onClick={handleArchive}
        disabled={actionLoading}
        // ARIA ATTRIBUTES
        aria-label='Archive note'
        >
           <ArchiveArrowDownIcon aria-hidden='true' focusable='false'/> ARCHIVE
        </Button>
      </div>
      <div className="vr" style={{width: '2px'}}/>
      <div className="p-2">
        <Button
        variant='danger'
        id='trashNoteBtn'
        type='button'
        onClick={handleDelete}
        disabled={actionLoading}
        // ARIA ATTRIBUTES:
        aria-label='Move to trash'
        >
            <Trash2 aria-hidden='true' focusable='false'/>DELETE
        </Button>
      </div>
    </Stack>
    </div>
    )}
      </Col>
    </Row>
   </div>
  )
}
