//NotesCalender.js
import React, { useState } from 'react'
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Calendar from './Calendar';


export default function NotesCalender() {
    const [selected, setSelected] = useState({ date: '', notes: [] }); // day picked on the calendar



  return (
    <div id='calenderDisplay'>
      <Row>
        <Col></Col>
        <Col xs={12} md={10}>
          <div>
           <Calendar
           selectedDate={selected.date}
            onSelectDay={(date, notes) => setSelected({date, notes})}
           />
        </div>
        </Col>
        <Col/>
      </Row>
        
    </div>
  )
}
