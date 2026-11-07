import React from 'react'

export default function NoteDataLists() {
  return (
    <div id='notesData'>
        <div id='notebookTableWrapper'>
            <table id='notebookTable'>
                <thead>
                    <tr>
                        <th>NOTEBOOKS</th>
                    </tr>
                </thead>
            </table>

        </div>
        <div>
            <table>
                <thead>
                    <tr>
                        <th>TAGS</th>
                    </tr>
                </thead>
                <tbody></tbody>
            </table>

        </div>
    </div>
  )
}
