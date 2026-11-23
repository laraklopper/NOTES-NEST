//LanguagesList.js
//IMPORT REQUIRED MODULES AND PACKAGES
import React from 'react'
// IMPORT CSS STYLESHEETS
import '../css/componentCss/ListLayout.css'
import '../css/componentCss/ListTables.css'
import '../css/componentCss/ListBtns.css'
// IMPORT ICONS FROM LUCIDE-REACT
import { BookA } from 'lucide-react';
// IMPORT DATA ARRAYS
import languageData from '../util/languageData';

//LanguageList Function component
export default function LanguagesList() {//Export default LanguageList.js component

    //=============JSX RENDERING=================
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
                        <td data-label='LANGUAGE CODE'>{langauage.code}</td>
                        <td data-label='LANGUAGE'>{langauage.name}</td>
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
