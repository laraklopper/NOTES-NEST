import React, { useCallback, useState } from 'react'
import '../css/componentCss/ListTables.css'
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Stack from 'react-bootstrap/Stack';
import Button from 'react-bootstrap/Button';

export default function NoteDataLists() {
    const [showNoteBooks, setShowNoteBooks] = useState(false)
    const [showTags, setShowTags] = useState(false)

    const toggleNoteBooks = useCallback(() => {
        setShowNoteBooks(prev => (!prev))
        setShowTags(false)
    },[])
    const toggleTags = useCallback(() => {
        setShowTags(prev => (!prev))
        setShowNoteBooks(false)
    },[])
  return (
    <div id='notesDataList'>
      
           <Row id='toggleDataListRow'>
        <Col id='toggleListDataCol1'/>
        <Col xs={5}>
            <Stack gap={3}>
      <div className="p-2" id='toggleBtnBlock1'>
        <Button
        variant='light'
        onClick={toggleNoteBooks}
        id='toggleNoteBooksBtn'
        type='button'
        
        >
            {showNoteBooks ? 'Hide Notebooks' : 'Show Notebooks'}
        </Button>
      </div>
      <div className="p-2" id='toggleBtnBlock2'>
        <Button
        variant='light'
        id='toggleTagsBtn'
        onClick={toggleTags}
        type='button'
        // ARIA ATTRIBUTES:
        aria-label={showTags ?'Hide Tags': 'Show Tags'}
        aria-pressed={showTags}
        aria-expanded={showTags}
        aria-controls='tagsListPanal'
        >
            {showTags ?'Hide Tags': 'Show Tags'}
        </Button>
      </div>
     
    </Stack>
        </Col>
        <Col id='toggleListDataCol2'/>
      </Row>
 
       <div id='notesDataListsDiv'>
       {showNoteBooks && (
            <div id='noteBookListPanal'>
                <Row id='notebookDataRow'>
                <Col id='noteBooksCol1'/>
<Col  id='noteBooksCol' xs={12} md={8}>
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
        <Col id='noteBooksCol2'/>
                </Row>
            </div>
       )}
       {showTags && (
        <div id='tagsListPanal'>
              <Row id='tagsDataRow'>
        <Col id='tagsDataCol1'/>
        <Col xs={6} id='tagsDataCol'>
        <div id='tagsTableWrapper'>
            <table id='tagsTable'>
                <thead>
                    <tr>
                        <th colSpan={4}>TAGS</th>
                    </tr>
                    <tr>
                        <th>#</th>
                        <th>NAME</th>
                        <th>DATE ADDED</th>
                        <th>{/*BUTTONS: DELETE*/}</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>#</td>{/*INDEX */}
                        <td>name</td>
                        <td>date added</td>
                        <td><div id='tagTableBtns'>
                            <Button
                            variant='danger'
                            id='deleteItemBtn'
                            >DELETE</Button>
                        </div></td>

                    </tr>
                </tbody>
            </table>
        </div></Col>
        <Col id='tagsDataCol2'/>
      </Row>
        </div>
       )}

       
   
       </div>
        
    </div>
  )
}
