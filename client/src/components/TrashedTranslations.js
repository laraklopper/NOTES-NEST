//TrashedTranslations.js
import React from 'react'
import '../css/componentCss/ListLayout.css'
import '../css/componentCss/ListTables.css'
import '../css/componentCss/ListBtns.css'
import Button from 'react-bootstrap/Button';
import { PURGE_DAYS } from '../util/listUtilFunc';
// TrashedTranslations Function component
export default function TrashedTranslations() {
  return (
    <div id='deletedTranslationList'>
        <div id='deletedTranslateWrapper'>
            <table id='trashTable'>
                <thead>
                    <tr>
                        <th colSpan={5}>DELETED TRANSLATIONS</th>
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
                                id='restoreBt'
                                >
                                    RESTORE
                                </Button>
                                <Button
                                variant='danger'
                                id='delete'
                                >
                                    DELETE
                                </Button>
                            </div>
                        </td>
                    </tr>
                </tbody>
                <tfoot>
                    <tr>
                        <td>
                            {/* same as notes trash list */}
                            <td>NOTES ARE PERMANENTLY DELETED {PURGE_DAYS} DAYS AFTER BEING MOVED TO TRASH</td>
                        </td>
                    </tr>
                </tfoot>
            </table>

        </div>
    </div>
  )
}
