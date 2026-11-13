//NotesList.js
//IMPORT REQUIRED MODULES AND PACKAGES
import React, { useCallback, useEffect, useState } from 'react'
// IMPORT CSS STYLESHEETS
import '../css/componentCss/ListTables.css'
import '../css/componentCss/ListBtns.css'
import '../css/componentCss/ListLayout.css'
// IMPORT BOOTSTRAP COMPONENTS
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import Stack from 'react-bootstrap/Stack'
// IMPORT UTILITY FUNCTIONS
import { dateDisplay } from '../util/dateFunctions';
import { EMPTY_NOTE_FILTERS } from '../util/formUtil';
import { languageName } from '../util/languageFunc';
// IMPORT ICONS FROM LUCIDE-REACT
import { Download, Filter, FilterX, Pin } from 'lucide-react';
// IMPORT COMPONENTS
import FilterNotes from './FilterNotes';
import NotePanal from './NotePanal';
import Pagination, { PAGE_SIZES } from './Pagination';
import ExportForm from './ExportForm';

export const NOTE_PAGE_SIZES = PAGE_SIZES;// Options for the "per page" select (used by Notes.js for its initial limit)

// Comma separated tag names for the table, e.g. "work, ideas"
const tagNames = (tags = []) => tags.map((tag) => tag?.name).filter(Boolean).join(', ')

// NotesList component
/* Table of the user's active notes, with a details panel (NotePanal.js) for the selected note
GET /notes/fetchNotes (via fetchNotes) */
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
    // ============STATE VARIABLES===========
    const [showFilter, setShowFilter] = useState(false)
    const [showExport, setShowExport] = useState(false)
    const [error, setError] = useState(null)// Set by the list and by NotePanal.js

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

    // ========EVENT LISTENERS===============
    const toggleFilter = () => setShowFilter((prev) => !prev)
    const toggleExport = () => setShowExport((prev) => !prev)
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
        aria-pressed={showFilter}
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
    {/* TOGGLE THE FILTER NOTES FORM */}
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
                            <td>{dateDisplay(note.createdAt)}</td>
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
     <div id='exportFormDiv'>
<Row id='toggleExportRow'>
        <Col id='toggleExportCol'>
            <Stack direction="horizontal" gap={3} id='toggleExportStack'>
      <div className="p-2"/>
      <div className="p-2 ms-auto"/>
      <div className="vr" />
      <div className="p-2">
        <Button
        id='toggleExportBtn'
        variant='light'
        type='button'
        onClick={toggleExport}
        // ARIA ATTRIBUTES:
        aria-label={showExport ? 'Hide Form': 'Export Notes'}
        aria-pressed={showExport}
        aria-expanded={showExport}
        aria-controls='exportFormPanal'
        >{showExport ? (
                    <>HIDE FORM</>
                    ):(
                    <>EXPORT NOTES<Download aria-hidden='true' focusable='false'/></>
                )}</Button>
      </div>
    </Stack>
        </Col>
    </Row>
    {/* TOGGLE EXPORT FORM */}
      {showExport && (
        <div id='exportFormPanal'>
            <Row id='exportFormRow'>
                <Col md='12' xs={12} id='exportFormCol'>
                    <ExportForm
                        type='notes'
                        filters={filters}
                        filtersActive={filtersActive}
                    />
                </Col>
            </Row>
        </div>
    )}
    </div>
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
            fetchNotes={fetchNotes}
            setError={setError}
        />
    )}
      </Col>
    </Row>
   </div>
  )
}
