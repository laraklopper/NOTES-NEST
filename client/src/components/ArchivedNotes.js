import React from 'react'
import '../css/componentCss/Trash.css'
import Button from 'react-bootstrap/Button';
import { ArchiveRestore, Trash } from 'lucide-react';
export default function ArchivedNotes() {
  return (
    <div id='archiveTableWrapper'>
        <table id='archiveTable'>
            <thead>
                <tr>
                    <th colSpan={5}>ARCHIVED NOTES</th>
                </tr>
                <tr>
                    <th>#</th>
                    <th>TITLE</th>
                    <th>LANGUAGE</th>
                    <th>DATE ADDED</th>
                    <th></th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>#</td>
                    <td>title</td>
                    <td>Language</td>
                    <td>date added</td>
                    <td>
                        <div id='archiveTableBtns'>
                            <Button
                            variant='light'
                            id='restoreNoteBtn'
                            >
                             <ArchiveRestore/> RESTORE
                            </Button>
                            <Button
                            variant='danger'
                            id='deleteArchiveNoteBtn'
                            >
                                <Trash/>DELETE
                            </Button>

                        </div>
                    </td>
                </tr>
            </tbody>
            <tfoot>
            <tr>
              <td colSpan={7}>RESTORE TO VIEW NOTE DETAILS</td>
            </tr>
          </tfoot>
        </table>
    </div>
  )
}
