//NoteDataLists.js
//IMPORT REQUIRED MODULES AND PACKAGES
import React from 'react'
// IMPORT CSS STYLESHEETS
import '../css/componentCss/ListLayout.css'
import '../css/componentCss/ListBtns.css'
import '../css/componentCss/ListTables.css'
// IMPORT BOOTSTRAP COMPONENTS
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Stack from 'react-bootstrap/Stack';

//IMPORT CUSTOM COMPONENTS
import NoteBookList from './NoteBookList';
import TagsList from './TagsList';
/*NoteDataLists function component
display notebook and tags list no panal display available for notebooks
and tags. Tags can be deleted but cannot be edited
*/
export default function NoteDataLists(
  {//PROPS PASSED FROM PARENT COMPONENT (Notes.js)
    tags,
    notebooks,
    fetchTags,
    fetchNotebooks,
    fetchNotes,
    setError
  }
) {


 

  //=================JSX RENDERING==============//
  return (
    <div id='notesDataList'>
      {/* Row 1 */}
      <Row id='toggleDataListRow'>
        <Col id='toggleListDataCol1' />
        <Col xs={5}>
          <Stack gap={1} id='toggleNoteBooksStack'>
          
         
          </Stack>
        </Col>
        <Col id='toggleListDataCol2' />
      </Row>
      {/* LISTS NOTEBOOKS + TAGS */}
      <div id='notesDataListsDiv'>
        {/* TOGGLE THE NOTEBOOK LIST */}
        {showNoteBooks && (
          <div id='noteBookListPanal'>
            <Row id='notebookDataRow'>
              <Col id='noteBooksCol1' />
              <Col id='noteBooksCol' xs={12} md={10}>
                {/* Render the NoteBookList.js component */}
                <NoteBookList
                  notebooks={notebooks}
                  fetchNotebooks={fetchNotebooks}
                  fetchNotes={fetchNotes}
                  setError={setError}
                />
              </Col>
              <Col id='noteBooksCol2' />
            </Row>
          </div>
        )}
        {/* TOGGLE THE TAGS LIST */}
        {showTags && (
          <div id='tagsListPanal'>
            <Row id='tagsDataRow'>
              <Col id='tagsDataCol1' />
              <Col md={10} id='tagsDataCol'>
                {/* Render the TagList.js component */}
                <TagsList
                  tags={tags}
                  fetchTags={fetchTags}
                  fetchNotes={fetchNotes}
                  setError={setError}
                />
              </Col>
              <Col id='tagsDataCol2' />
            </Row>
          </div>
        )}
      </div>
    </div>
  )
}
