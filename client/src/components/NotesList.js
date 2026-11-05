import { Copy } from 'lucide-react';
import React from 'react'
import Button from 'react-bootstrap/Button';
import Stack from 'react-bootstrap/Stack'

export default function NotesList() {
  return (
    <div id='notesList'>
    <div id='notesListWrapper'>
        <table id='notesListTable'>
            <thead>
            <tr>
                <th colSpan={7}>USERNAME NOTES</th>
            </tr>
            <tr>
            {/* index */}
                <th>#</th>
                <th>TITLE</th>
                <th>LANGUAGE</th>
                <th>NOTE BOOK</th>
                <th>TAGS</th>
                <th>DATE ADDED</th>
                <th>
                    {/* view note button */}
                </th>
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
                </tr>
            </tbody>
        </table>
    </div>
    <div id='notePag'>
        <div>
            <Stack direction="horizontal" gap={3}>
      <div className="p-2">
        {/* index */}
        {/* title */}
      </div>
      <div className="p-2 ms-auto">
        {/* <Button
        variant='warning'
        >
            EDIT
        </Button> */}
      </div>
      <div className="vr" />
      <div className="p-2">
        <Button
        variant='warning'
        >
            CLOSE
        </Button>
      </div>
    </Stack>
        </div>
        <div id='notePanalBody'>
            <div>
             <Stack gap={3}>
    <div className="p-2">
        {/* Date added */}
    </div>
      <div className="p-2">
        <div>
            <span>
                <p>CONTENT:</p>
            </span>
            <div>
                <p>
                    {/* CONTENT */}
                </p>
                {/* COPY CONTENT BUTTON */}
                <Button><Copy/></Button>
            </div>
        </div>
      </div>
      {/* link to translation form */}
      <div className="p-2">
        <Button>TRANSLATOR</Button>
      </div>
    </Stack>

            </div>
            <div>
             <Stack gap={3}>
      <div className="p-2">
        <span>
            <p>LANGUAGE</p>
        </span>
      </div>
      <div className="p-2">
        {/* Notebook */}
        
      </div>
      <div className="p-2">
{/* Tags */}
      </div>
    </Stack>

            </div>
        </div>
    
    </div>
   </div>
  )
}
