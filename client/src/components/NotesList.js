//NotesList.js
//IMPORT REQUIRED MODULES AND PACKAGES
import React, { useCallback, useEffect, useState } from 'react'
// IMPORT CSS STYLESHEETS
import '../css/componentCss/NotesList.css'
import '../css/componentCss/ListTables.css'
import '../css/componentCss/DetailsPanals.css'
// IMPORT BOOTSTRAP COMPONENTS
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import Stack from 'react-bootstrap/Stack'
// IMPORT UTILITY FUNCTIONS
import { formatTimestamp } from '../util/dateFunctions';
import { languageName } from '../util/languageFunc';
// IMPORT ICONS FROM LUCIDE-REACT
import { Filter, FilterX, Pin } from 'lucide-react';
// IMPORT COMPONENTS
import FilterNotes, { EMPTY_NOTE_FILTERS } from './FilterNotes';
import NotePanal from './NotePanal';
import Pagination, { PAGE_SIZES } from './Pagination';

export const NOTE_PAGE_SIZES = PAGE_SIZES;// Options for the "per page" select (used by Notes.js for its initial limit)

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
                <td></td>
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
                    {/* PAGINATION (Pagination.js) */}
                    <Pagination
                        page={pagination.page}
                        totalPages={pagination.totalPages}
                        total={pagination.total}
                        limit={limit}
                        setPage={setPage}
                        setLimit={setLimit}
                        onChange={closePanal}
                        loading={loading}
                        controlId='notePageSize'
                    />
                    </td>
                </tr>
            </tfoot>
        </table>
    </div>
    </Col>
    </Row>
    <Row id='notePanalRow'>
      <Col id='notePanalCol'>
    {/* SELECTED NOTE PANAL (NotePanal.js) */}
    {selectedNote && (
        <NotePanal
            note={selectedNote}
            rowNumber={rowNumber(selectedIndex)}
            editNote={editNote}
            onToggleEdit={toggleEditNote}
            onClose={closePanal}
            onCopy={handleCopy}
            onArchive={handleArchive}
            onDelete={handleDelete}
            actionLoading={actionLoading}
        />
    )}
      </Col>
    </Row>
   </div>
  )
}
