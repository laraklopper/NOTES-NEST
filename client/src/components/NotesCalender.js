//NotesCalender.js
import React, { useState } from 'react'
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Calender from './Calender'

export default function NotesCalender() {
    const [selected, setSelected] = useState()
  return (
    <div id='calenderDisplay'>
      <Row>
        <Col></Col>
        <Col xs={12} md={10}>
          <div>
            <Calender/>
        </div>
        </Col>
        <Col/>
      </Row>
        
    </div>
  )
}
