import React from 'react'
import Button from 'react-bootstrap/Button';
import { PURGE_DAYS } from '../util/listUtilFunc';

/*Table displaying archived and translated documents */
export default function TrashArchiveDocs() {
  return (
    <div id='trashArchiveDocsList'>
        <div id='documentTrashWrapper'>
            <table id='documentTrashTable'>
                <thead>
                    <tr>
                        <th colSpan={6}>TRANSLATED DOCUMENTS</th>
                    </tr>
                    <tr>
                        <th>#</th>
                        <th>DOCUMENT NAME</th>
                        <th>SOURCE LANGUAGE</th>
                        <th>TARGET LANGUAGE</th>
                        <th>STATUS</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>#</td>
                        <td>document name</td>
                        <td>source language</td>
                        <td>target language</td>
                        {/* display document status */}
                        <td>archived/trash</td>
                        <td>
                            <div>
                                <Button
                                variant='light'
                                >RESTORE</Button>
                                {/* Permanent delete if the status is trash */}
                                <Button
                                variant='light'
                                id='deleteDocBrn'
                                >DELETE</Button>
                            </div>
                        </td>

                    </tr>
                </tbody>
                <tfoot>
                    <tr>
                        <td colSpan={6}>RESTORE TO VIEW DETAILS</td>
                    </tr>
                    <tr>
                        <td colSpan={6}><i style={{color: "#B82C3A", fontWeight: "800"}}>TRANSLATIONS ARE PERMANENTLY DELETED {PURGE_DAYS} DAYS AFTER BEING MOVED TO TRASH</i></td>
                    </tr>
                </tfoot>
            </table>
        </div>
    </div>
  )
}
