import React, { useCallback, useState } from 'react'
import '../css/componentCss/NotesList.css'
import '../css/componentCss/DetailsPanals.css'
import Button from 'react-bootstrap/Button';
import Stack from 'react-bootstrap/Stack'
import { ArchiveArrowDownIcon, Copy, Edit3Icon, Trash2, X } from 'lucide-react';
import {Link} from 'react-router-dom';
export default function NotesList(
    {
        currentUser,
        editNote,
        toggleEditNote,
        setError
    }
) {
    const [selectedNote, setSelectedNote] = useState()//Note currently selected in the details panal

    //Function to archive a note
    const archiveNote = useCallback(async () => {
       try {
        const token = localStorage.getItem('token')
        const response = await fetch('http://localhost:3001/archive/:id', {
            method: 'PATCH',
            mode: 'cors',
            headers: {
                'Content-Type': 'application/json',
                'Authorization' :`Bearer &{token}`
            },
            body: JSON.stringify()
        })
       } catch (error) {
        
       } 
    },[])

    //Function to move a note to trash
    const moveToTrash = useCallback(async () => {
        try {
        const token = localStorage.getItem('token')
        const response = await fetch('http://localhost:3001/notes/delete/:id', {
            method: 'PATCH',
            mode: 'cors',
            headers: {
                'Authorization':`Bearer ${token}`,
            }
        })

        if (!response.ok) {
            throw new Error()
        }
        } catch (error) {
            // console.error();
            setError()
            
        }
    },[])
   



  return (
    <div id='notesList'>
    <div id='notesListWrapper'>
        <table id='notesListTable'>
            <thead>
            <tr id='mainThRow'>
                <th id='tableMainHead' colSpan={7}>USERNAME NOTES</th>
            </tr>
            <tr>
            {/* index */}
                <th>#</th>
                <th>TITLE</th>
                <th>LANGUAGE</th>
                <th>NOTE BOOK</th>
                <th>TAGS</th>
                <th>DATE ADDED</th>
                <td>
                    {/* view note button */}
                </td>
            </tr>
            </thead>
            <tbody>
                <tr>
                    <td>
                        {/* Index */}
                    </td>
                    <td>
                        {/* title */}
                    </td>
                    <td>
                        {/* Language */}
                    </td>
                    <td>
                        {/* NOTE BOOK */}
                    </td>
                    <td>
                        {/* TAGS */}
                    </td>
                    <td>
                        {/* Date added */}
                        {/* TIME STAMP */}
                    </td>
                    <td>
                        <div id='tableBtnDiv'>
                            <Button
                            variant='light'
                            id='viewNoteBtn'
                            >
                                VIEW
                            </Button>
                        </div>
                    </td>
                </tr>
            </tbody>
        </table>
    </div>
    {/* SELECTED NOTE PANAL */}
    <div id='notePanal'>
            <Stack direction="horizontal" gap={3} id='notePanalHead'>
      <div className="p-2">
      <span id='panalHeadSpan'>
    {/* index  title */}
      <h4 className='panalHeading'># TITLE</h4>
      </span>
      </div>
      <div className="p-2 ms-auto">
        <Button
        variant='warning'
        id='editNoteBtn'
        type='button'
        onClick={toggleEditNote}
        // ARIA ATTRIBUTES:
        aria-label={editNote ? 'Hide Form': 'Edit Note'}
        >
            {editNote ? (
                <>
                   <X/> HIDE FORM
                </>
            ): (
                <>
                    <Edit3Icon/> 
                    EDIT NOTE
                </>
            )}
        </Button>
      </div>
      <div className="vr" style={{width: '2px'}} />
      <div className="p-2">
        <Button
        variant='warning'
        id='closePanalBtn'
        >
          <X aria-hidden='true' focusable='false' />  CLOSE
        </Button>
      </div>
    </Stack>
        <div id='notePanalBody'>
        {/* STACK 1 */}
             <Stack gap={3} id='notePanalStack1'>
      <div className="p-2" id='noteContentBlock'>
        <div id='noteContentDiv'>
            <span className='dataSpan'>
                <p className='dataLabel'>CONTENT:</p>
                 <p id='noteContentPara' className='detailValue'>
                    {/* CONTENT */}
                    content
                </p>
            </span>
                 <div id='copyNoteDiv'>
                {/* COPY CONTENT BUTTON */}
                <Button
                    variant='light'
                    id='copyContentBtn'
                    type='button'
                    // onClick={}
                    // ARIA ATTRIBUTES:
                ><Copy aria-hidden='true' focusable='false'/>COPY</Button>
            </div>
        </div>
      </div>
        <div className="p-2">
        <span className='dataSpan'>
            <p className='dataLabel'>LANGUAGE:</p>
        </span>
      </div>
    </Stack>      
    {/* STACK 2: */}
             <Stack gap={3} id='notePanalStack2'>
                <div className="p-2">
        <span className='dataSpan'>
            <p className='dataLabel'>DATE ADDED:</p>
            <p className='dataValue'>{/* DATE CREATED(TIME STAMP) */}</p>
        </span>
    </div>
      <div className="p-2" id='noteBookBlock'>
        {/* Notebook */}
        <span className='dataSpan'>
            <p className='dataLabel'>NOTE BOOK:</p>
            <p className='dataValue'>{/* NoteBook name */}</p>
        </span>
      </div>
      <div className="p-2" id='noteTagGroup'>
{/* Tags */}
<p className='dataLabel'>TAGS:</p>
        <ul className='tagList'>
            <li className='tagListItem'></li>
        </ul>
      </div>
    </Stack>
        </div>
    <Stack direction="horizontal" gap={3} id='panalFooter'>
      <div className="p-2">
        {/* Link to translateForm */}
        <Link className='refLink'>TRANSLATE</Link>
      </div>
      <div className="p-2 ms-auto">
        <Button
        variant='warning'
        id='archiveNoteBtn'
        type='button'
        // onClick={}
        // ARIA ATTRIBUTES
        >
           <ArchiveArrowDownIcon aria-hidden='true' focusable='false'/> ARCHIVE
        </Button>
      </div>
      <div className="vr" style={{width: '2px'}}/>
      <div className="p-2">
        <Button
        variant='danger'
        id='trashNoteBtn'
        type='button'
        // onClick={}
        // ARIA ATTRIBUTES:
        >
            <Trash2 aria-hidden='true' focusable='false'/>DELETE
        </Button>
      </div>
    </Stack>
    </div>
   </div>
  )
}
