import React from 'react'
import '../css/componentCss/ListTables.css'
import '../css/componentCss/ListLayout.css'
import '../css/componentCss/ListBtns.css'
import { ArchiveIcon } from 'lucide-react'


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
        </thead>
        <tbody>
        </tbody>
      </table>
    </div>
  )
}
