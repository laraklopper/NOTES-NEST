import React from 'react'
import languageData from '../util/languageData'

export default function LanguageList() {
  return (
    <div id='languageList'>
        <table id='languageTable'>
            <thead>
                <tr>
                    <th colSpan={2} aria-colspan={2}>AVAILABLE LANGUAGES</th>
                </tr>
                <tr>
                    <th>LANGUAGE CODE</th>
                    <th>LANGUAGE</th>
                </tr>
            </thead>
            <tbody>
                {languageData.map((language) => (
                    <tr>
                        <td>{language.code}</td>
                        <td>{language.name}</td>
                    </tr>
                ))}
            </tbody>
            <tfoot>
                <tr>
                    <td>API LANGUAGES</td>
                </tr>
            </tfoot>
        </table>
    </div>
  )
}
