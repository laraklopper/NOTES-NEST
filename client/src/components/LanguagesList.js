import React from 'react'
import '../css/componentCss/ListLayout.css'
import '../css/componentCss/ListTables.css'
import '../css/componentCss/ListBtns.css'
// IMPORT BOOTSTRAP COMPONENTS
import { BookA } from 'lucide-react';
import languageData from '../util/languageData';

export default function LanguagesList() {
  return (
    <div id='languageTableWrapper'>
        <table id='languageTable'>
            <thead>
                <tr>
                    <th colSpan={2} aria-colspan={2}>AVAILABLE LANGUAGES<BookA aria-hidden='true' focusable='false'/></th>
                </tr>
                <tr>
                <th>LANGUAGE CODE</th>
                <th>LANGUAGE</th>
                 {/* <th>COUNTRY</th> */}
                </tr>
            </thead>
            <tbody>
                {languageData.map((langauage) => (
                    <tr key={langauage.code}>
                        <td>{langauage.code}</td>
                        <td>{langauage.name}</td>
                    </tr>
                ))}
            </tbody>
            <tfoot>
                <tr>
                    <td colSpan={2}><a href='https://langbly.com/docs/languages/#full-language-reference' className='apiLink' target='blank'>LANGUAGES</a></td>
                </tr>
            </tfoot>
        </table>
    </div>
  )
}
