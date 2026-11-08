import React from 'react'
import '../css/componentCss/ListTables.css'
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

export default function NoteDataLists() {
  return (
    <div id='notesData'>
     <Row>
        <Col xs={6}>
             <div id='notebookTableWrapper'>
            <table id='notebookTable'>
                <thead>
                    <tr>
                        <th colSpan={4}>NOTEBOOKS</th>
                    </tr>
                    <tr>
                        <th>#</th>
                        <th>NAME</th>
                        <th>COLOUR</th>
                        <th>{/* BUTTONS: EDIT + DELETE*/}</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>

                    </tr>
                </tbody>
            </table>

        </div>
        </Col>
        <Col xs={6}><div>
            <table>
                <thead>
                    <tr>
                        <th>TAGS</th>
                    </tr>
                </thead>
                <tbody></tbody>
            </table>

        </div></Col>
      </Row>
       
        
    </div>
  )
}
