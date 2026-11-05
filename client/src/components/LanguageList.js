import React from 'react'
import languageData from '../util/languageData'

export default function LanguageList() {
  return (
    <div>
        <table>
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
        </table>
    </div>
  )
}
