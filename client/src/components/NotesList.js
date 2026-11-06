import React, { useState } from 'react'
import '../css/componentCss/NotesList.css'
import '../css/componentCss/DetailsPanals.css'
import Button from 'react-bootstrap/Button';
import Stack from 'react-bootstrap/Stack'
import { ArchiveArrowDownIcon, Copy, Trash2, X } from 'lucide-react';
import {Link} from 'react-router-dom';
export default function NotesList(
    {
        currentUser
    }
) {
    const [selectedNote, setSelectedNote] = useState()//Note currently selected in the details panal
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

                    </td>
                    <td>
                        <div>
                            <Button>
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
        >
            EDIT NOTE
        </Button>
      </div>
      <div className="vr" />
      <div className="p-2">
        <Button
        variant='warning'
        id='closePanalBtn'
        >
          <X />  CLOSE
        </Button>
      </div>
    </Stack>
        <div id='notePanalBody'>
             <Stack gap={3} id='notePanalStack1'>
 
      <div className="p-2" id='noteContentBlock'>
        <div id='noteContentDiv'>
            <span>
                <p className='dataLabel'>CONTENT:</p>
                 <p className='noteContentPara'>
                    {/* CONTENT */}
                </p>
            </span>
           
               
                 <div>
                {/* COPY CONTENT BUTTON */}
                <Button
                    variant='light'
                    id='copyContentBtn'
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
            <li></li>
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
      <div className="vr" />
      <div className="p-2">
        <Button
        variant='danger'
        id='trashNoteBtn'
        type='button'
        // onClick={}
        // ARIA ATTRIBUTES
        >
            <Trash2/>DELETE
        </Button>
      
      </div>
    </Stack>
    </div>
   </div>
  )
}
