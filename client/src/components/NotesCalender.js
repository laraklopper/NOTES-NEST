//NotesCalender.js
import React, { useState } from 'react'
import '../css/componentCss/Calender.css'
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import ListGroup from 'react-bootstrap/ListGroup';
import Calendar from './Calendar';
import { longDate } from '../util/calenderUtil'

export default function NotesCalender({ onOpenNote }) {
  const [selected, setSelected] = useState({ date: '', notes: [] }); // day picked on the calendar

  const handleSelectDay = (date, notes) => { // date: '2026-11-16', notes: [{ _id, title }]
  setSelected({ date, notes }); // shows that day's notes in the side panel
};
  
  return (
    <div id='calenderDisplay'>
      <Row id='calendarRow1'>
        {/* ----- CALENDAR ----- */}
        <Col xs={12} md={12} id='calendarCol'>
          <Calendar
            selectedDate={selected.date} onSelectDay={handleSelectDay}
          />
        </Col>
        </Row>
        {/* ----- NOTES FOR THE SELECTED DAY ----- */}
        <Row id='calenderRow2'>
        <Col xs={12} md={12} style={{width: '100%'}} id='calenderCol1'>
          <div id='calendarDayPanal' aria-live='polite'>
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
                        key={n._id}
                        action
                        onClick={() => onOpenNote?.(n._id)} // parent decides how to open it
                      >
                        {n.title}
                      </ListGroup.Item>
                    ))}
                  </ListGroup>
                )}
              </>
            )}
            {/* DISPLAY PANAL FOR THE SELECTED NOTE */}
          </div>
        </Col>
      </Row>
    </div>
  )
}
