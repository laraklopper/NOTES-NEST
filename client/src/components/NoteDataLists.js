import React, { useCallback, useState } from 'react'
import '../css/componentCss/ListTables.css'
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Stack from 'react-bootstrap/Stack';
import Button from 'react-bootstrap/Button';
/*NoteDataLists function component 
display notebook and tags list no panal display available for notebooks
and tags. Tags can be deleted but cannot be edited
*/
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
            <Stack gap={1} id='toggleNoteBooksStack'>
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
<Col  id='noteBooksCol' xs={12} md={10}>
             <div id='notebookTableWrapper'>
            <table id='notebookTable'>
                <thead>
                    <tr>
                        <th colSpan={5}>NOTEBOOKS</th>
                    </tr>
                    <tr>
                        <th>#</th>
                        <th>NAME</th>
                        <th>COLOUR</th>
                        <th style={{width: '250px', margin: '0px', padding: '0px'}}>DATE ADDED</th>
                        <th>{/* BUTTONS: EDIT + DELETE*/}</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>#{/*INDEX */}</td>
                        <td>name</td>
                        <td>colour</td>
                        <td style={{width: '250px', margin: '0px', padding: '0px'}}>date added</td>
                        <td style={{width: '200px'}}>
                        <div id='notebooksListBtns'>
                            <Button 
                            variant='warning'
                            id='toggleEditNoteBookBtn'
                            >
                                EDIT NOTEBOOK
                            </Button>
                            <Button
                             variant='danger'
                             id='deleteItemBtn'>
                                DELETE 
                             </Button>
                        </div>

                        </td>
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
        <Col  md={6} id='tagsDataCol'>
        <div id='tagsTableWrapper'>
            <table id='tagsTable'>
                <thead>
                    <tr>
                        <th colSpan={4}>TAGS</th>
                    </tr>
                    <tr>
                        <th>#</th>
                        <th>NAME</th>
                        <th >DATE ADDED</th>
                        <th>{/*BUTTONS: DELETE + Edit*/}</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>#</td>{/*INDEX */}
                        <td>name</td>
                        <td >date added</td>
                        <td style={{width: '400px'}}><div id='tagTableBtns'>
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
