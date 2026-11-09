//NoteDataLists.js
//IMPORT REQUIRED MODULES AND PACKAGES
import React, { useCallback, useState } from 'react'
// IMPORT CSS STYLESHEETS
import '../css/componentCss/ListBtns.css'
import '../css/componentCss/ListTables.css'
// IMPORT BOOTSTRAP COMPONENTS
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Stack from 'react-bootstrap/Stack';
import Button from 'react-bootstrap/Button';
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
        // ARIA ATTRIBUTES:
        aria-label={showNoteBooks ? 'Hide Notebooks' : 'Show Notebooks'}
        aria-pressed={showNoteBooks}
        aria-expanded={showNoteBooks}
        aria-controls='noteBookListPanal'
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
                    <NoteBookList
                        notebooks={notebooks}
                        fetchNotebooks={fetchNotebooks}
                        fetchNotes={fetchNotes}
                        setError={setError}
                    />
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
            <TagsList
                tags={tags}
                fetchTags={fetchTags}
                fetchNotes={fetchNotes}
                setError={setError}
            />
        </Col>
        <Col id='tagsDataCol2'/>
      </Row>
        </div>
       )}
       </div>

    </div>
  )
}
