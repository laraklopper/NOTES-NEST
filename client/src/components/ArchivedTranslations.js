import React from 'react'
import '../css/componentCss/ListTables.css'
import '../css/componentCss/ListLayout.css'
import '../css/componentCss/ListBtns.css'
import Button from 'react-bootstrap/Button';
import { ArchiveIcon, ArchiveRestoreIcon, TrashIcon } from 'lucide-react'


export default function ArchivedTranslations() {
  return (
    <div id='archiveTableWrapper'>
      <table id='archiveTable'>
        <thead>
            <tr>
              <th colSpan={5}>
                <p className='tableHeading'>ARCHIVED TRANSLATIONS<ArchiveIcon/></p>
              </th>
            </tr>
            <tr>
              <th>#</th>
              <th>SOURCE TEXT</th>
              <th>SOURCE LANGUAGE</th>
              <th>TARGET LANGUAGE</th>
              <th>
                <div>
                  
                </div>
              </th>
            </tr>
        </thead>
        <tbody>
          <tr>
              <th></th>
              <td>sourcetext</td>
              <td>sourceLang</td>
              <td>targetLang</td>
              <th style={{width: '260px'}}>
                <div className='archiveTableBtns'>
                  <Button
                  variant='light'
                  type='button'
                  // onClick={}
                  id='restoreBtn'
                  >
                    <ArchiveRestoreIcon aria-hidden='true' focusable='false'/> RESTORE
                  </Button>
                  <Button
                  variant='danger'
                  id='deleteArchiveBtn'
                  // onClick={}
                  type='button'
                  >
                    <TrashIcon aria-hidden='true' focusable='false'/>DELETE
                  </Button>
                </div>
              </th>
          </tr>
        </tbody>
        <tfoot>
                    <tr>
                        <td colSpan={5}>RESTORE TO VIEW TRANSLATION DETAILS</td>
                    </tr>
                </tfoot>
      </table>
    </div>
  )
}
