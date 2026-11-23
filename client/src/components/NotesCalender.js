//NotesCalender.js
//IMPORT REQUIRED MODULES AND PACKAGES
import React, { useCallback, useRef, useState } from 'react'
// IMPORT CSS STYLESHEETS
import '../css/componentCss/Calender.css'
// IMPORT BOOTSTRAP COMPONENTS
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Stack from 'react-bootstrap/Stack';
import ListGroup from 'react-bootstrap/ListGroup';
import Button from 'react-bootstrap/Button';
import Spinner from 'react-bootstrap/Spinner';
// IMPORT CUSTOM COMPONENTS
import Calendar from './Calendar';
// IMPORT UTILITY FUNCTIONS
import { longDate } from '../util/calenderUtil'
import { formatTimestamp } from '../util/dateFunctions';

export default function NotesCalender({ onOpenNote }) {
  const [selected, setSelected] = useState({ date: '', notes: [] }); // day picked on the calendar
  const [selectedNote, setSelectedNote] = useState(null); // full note picked from the day's list
  const [noteLoading, setNoteLoading] = useState(false);
  const [noteError, setNoteError] = useState(null);
  const latestRequest = useRef(null); // id of the most recent note request (ignores stale responses)

  const handleSelectDay = (date, notes) => { // date: '2026-11-16', notes: [{ _id, title }]
    setSelected({ date, notes }); // shows that day's notes in the side panel
    // A new day clears the previously displayed note
    latestRequest.current = null;
    setSelectedNote(null);
    setNoteError(null);
    setNoteLoading(false);
  };

  // GET /notes/:id - fetch the full note so it can be displayed under the calendar
  const handleSelectNote = useCallback(async (id) => {
    if (selectedNote?._id === id) return; // already showing
    latestRequest.current = id;
    setNoteError(null);
    setNoteLoading(true);
    try {
      // The browser sends the JWT cookie with the request
      const response = await fetch(`/notes/${id}`, { method: 'GET' });
      const data = await response.json().catch(() => ({}));
      if (latestRequest.current !== id) return; // a different note/day was picked meanwhile
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch note');
      }
      setSelectedNote(data.note);
    } catch (error) {
      if (latestRequest.current !== id) return;
      console.error('Error fetching note:', error);
      setSelectedNote(null);
      setNoteError('That note could not be loaded. It may have been archived or deleted.');
    } finally {
      if (latestRequest.current === id) setNoteLoading(false);
    }
  }, [selectedNote]);

  //Functiont to close Note
  const closeNote = () => {
    latestRequest.current = null;
    setSelectedNote(null);
    setNoteError(null);
    setNoteLoading(false);
  };

  //=============JSX RENDERING==============

  return (
    <div id='calenderDisplay'>
    {/* Row 1: Calender */}
      <Row id='calendarRow1'>
        {/* ----- CALENDAR ----- */}
        <Col xs={12} md={12} id='calendarCol'>
          <Calendar
            selectedDate={selected.date} onSelectDay={handleSelectDay}
          />
        </Col>
        </Row>
        {/* Row 2 : NOTES FOR THE SELECTED DAY ----- */}
        <Row id='calenderRow2'>
        <Col xs={12} md={12} style={{width: '100%'}} id='calenderCol1'>
          <div id='calendarDayPanal' aria-live='polite'>
           <Stack direction="horizontal" gap={3} id='calenderStack'>
      <div className="p-2" id='notesListBlock'>
          {!selected.date ? (
              <p className='text-muted mb-0'>Select a day to see its notes.</p> // nothing picked yet
            ) : (
              <>
                <h6 className='date'>{longDate(selected.date)}</h6>
                {selected.notes.length === 0 ? (
                  <p className='text-muted mb-0'>No notes on this day.</p>
                ) : (
                  <ListGroup>
                    {selected.notes.map(n => (
                      <ListGroup.Item
                      id='listItem'
                        key={n._id}
                        action
                        active={selectedNote?._id === n._id}
                        onClick={() => handleSelectNote(n._id)} // display the note below
                      >
                        {n.title}
                      </ListGroup.Item>
                    ))}
                  </ListGroup>
                )}
              </>
            )}
      </div>
      <div className="p-2 ms-auto"/>
      <div className="p-2"/>
    </Stack>
            {/* DISPLAY PANAL FOR THE SELECTED NOTE UNDER THE CALENDAR*/}
            {noteLoading && (
              <div id='calendarNoteLoading' className='mt-3'>
                <Spinner animation='border' size='sm' role='status' aria-hidden='true' /> Loading note...
              </div>
            )}
            {noteError && !noteLoading && (
              <p className='text-danger mt-3 mb-0' role='alert'>{noteError}</p>
            )}
            {selectedNote && !noteLoading && (
              <div id='calendarNotePanal' className='mt-3'>
                <div id='calendarNoteHead' className='d-flex align-items-center gap-2'>
                  <h5 className='mb-0 me-auto'>{selectedNote.title}</h5>
                  <Button
                    variant='success'
                    size='sm'
                    type='button'
                    onClick={() => onOpenNote?.(selectedNote._id)} // parent decides how to open it
                    aria-label={`Open "${selectedNote.title}" in Notes`}
                  >
                    OPEN IN NOTES
                  </Button>
                  <Button
                    variant='warning'
                    size='sm'
                    type='button'
                    onClick={closeNote}
                    aria-label='Close note'
                  >
                    CLOSE
                  </Button>
                </div>
                <div id='calendarNoteBody' className='mt-2'>
                  <p className='dataLabel mb-1'>CONTENT:</p>
                  <div
                    id='calendarNoteContent'
                    className='detailValue'
                    dangerouslySetInnerHTML={{ __html: selectedNote.content }}
                  />
                  <p className='dataLabel mb-1 mt-2'>DATE ADDED:</p>
                  <p className='dataValue'>{formatTimestamp(selectedNote.createdAt)}</p>
                  <p className='dataLabel mb-1'>NOTE BOOK:</p>
                  <p className='dataValue'>{selectedNote.notebook?.name || 'No notebook'}</p>
                  <p className='dataLabel mb-1'>TAGS:</p>
                  <ul className='tagList'>
                    {selectedNote.tags?.length ? (
                      selectedNote.tags.map(tag => (
                        <li className='tagListItem' key={tag._id}>{tag.name}</li>
                      ))
                    ) : (
                      <li className='tagListItem'>No tags</li>
                    )}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </Col>
      </Row>
    </div>
  )
}
