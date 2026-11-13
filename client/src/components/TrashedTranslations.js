//TrashedTranslations.js
import React from 'react'
import '../css/componentCss/ListLayout.css'
import '../css/componentCss/ListTables.css'
import '../css/componentCss/ListBtns.css'
import Button from 'react-bootstrap/Button';
import { PURGE_DAYS } from '../util/listUtilFunc';
import { ArchiveArrowUp, ArchiveX, Trash2Icon } from 'lucide-react';
// TrashedTranslations Function component
export default function TrashedTranslations() {
  return (
    <div id='deletedTranslationList'>
        <div id='deletedTranslateWrapper'>
            <table id='trashTable'>
                <thead>
                    <tr>
                        <th colSpan={5}>
                            <p className='tableHeading'>DELETED TRANSLATIONS<ArchiveX/></p>
                        </th>
                    </tr>
                    <tr>
                        <th>#</th>
                        <th>SOURCE TEXT</th>
                        <th>SOURCE LANGUAGE</th>
                        <th>TARGET LANGUAGE</th>
                        <th>{/* RESTORE + DELETE BUTTON */}</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                    {/* index */}
                        <td>#</td>
                        <td>SOURCE TEXT</td>
                        <td></td>
                        <td></td>
                        <td>
                            <div className='trashTableBtns'>
                                <Button
                                variant='light'
                                id='restoreBtn'
                                >
                                   <ArchiveArrowUp/> RESTORE
                                </Button>
                                <Button
                                variant='danger'
                                id='deleteArchiveBtn'
                                >
                                    <Trash2Icon/>DELETE
                                </Button>
                            </div>
                        </td>
                    </tr>
                </tbody>
                <tfoot>
                    <tr>
                        <td colSpan={5}>TRANSLATIONS ARE PERMANENTLY DELETED {PURGE_DAYS} DAYS AFTER BEING MOVED TO TRASH</td>
                    </tr>
                </tfoot>
            </table>

        </div>
    </div>
  )
}
