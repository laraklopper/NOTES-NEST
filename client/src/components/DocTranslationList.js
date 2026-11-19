import React, { useState } from 'react'
import Stack from 'react-bootstrap/Stack';
import Button from 'react-bootstrap/Button';
import { ScrollText } from 'lucide-react';
export default function DocTranslationList() {
    const [documents, setDocuments] = useState()
    const [selected, setSelected] = useState(null)
    const [loading, setLoading] = useState(true)// State variable to indicate the list is still being fetched
    const [error, setError] = useState('')//Global list error state

  return (
    <div id='translatedDocsList'>
      <div id='docTranslationsWrapper'>
        <table>
            <thead>
                <tr>
                    <th colSpan={5}>DOCUMENT TRANSLATIONS:</th>
                </tr>
                <tr>
                    <th>#{/*INDEX*/}</th>
                    <th>DOCUMENT NAME</th>
                    <th>SOURCE LANGUAGE</th>
                    <th>TARGET LANGUAGE</th>
                    <th>{/*BUTTONS*/}</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>{/*index*/}</td>
                    <td>{/*DOCUMENT NAME */}document Name</td>
                    <td>{/*SOURCE LANGUAGE */}source language</td>
                    <td>{/*TARGET LANGUAGE*/}</td>
                    <td><Button variant='light'>VIEW<ScrollText/></Button></td>
                </tr>
            </tbody>
            <tfoot>
                <tr>
                    <td colSpan={5}>
                        {/* PAGINATION */}
                    </td>
                </tr>
            </tfoot>
        </table>
        </div>
        <div id='documentPanal'>
             <Stack direction="horizontal" gap={3} id='panalHeader'>
      <div className="p-2">First item</div>
      <div className="p-2 ms-auto">
        
      </div>
      <div className="vr" />
      <div className="p-2">
        
      </div>
    </Stack>
    <div id='docPanalBody'>
<Stack gap={3} id='docBodyStack1'>
      <div className="p-2">
        <span className='dataSpan'>
            <p className='dataLabel'>document name</p>
            <p className='dataValue'></p>
        </span>

      </div>
      <div className="p-2">
      <label aria-labelledby='docLanguageGroup'>LANGUAGES:</label>
        <div className='dataGroup' id='docLanguageGroup'>
            <span>
                <p className='dataLabel'>SOURCE LANGUAGE:</p>
                <p className='dataValue'></p>
            </span>
            <span>
                <p className='dataLabel'>TARGET LANGUAGE</p>
                <p className='dataValue'></p>
            </span>
        </div>
      </div>
      <div className="p-2"></div>
    </Stack>
    <Stack gap={3} id='docBodyStack2'>
      <div className="p-2">
        <span className='dataSpan'>
            <p className='dataLabel'>{/* selected.pageCount */} PAGE(S)</p>
            <p className='dataValue'>{/*selected.characterCount*/} CHARACTERS</p>
        </span>
      </div>
      <div className="p-2">Second item</div>
      <div className="p-2">
        <span className='dataSpan'>
            <p className='dataLabel'>
                {/* translatedText */}
            </p>
        </span>
      </div>
    </Stack>
    </div>
 <Stack direction="horizontal" gap={3} id='panalFooter'>
      <div className="p-2">
        
      </div>
      <div className="p-2 ms-auto">
        <Button
        variant='warning'
        id='archiveBtn'
        type='button'
        // onClick={}
        >
            ARCHIVE
        </Button>
      </div>
      <div className="vr" />
      <div className="p-2">
        <Button 
        variant='danger'
        id='deleteDocBtn'
        type='button'
        // onClick={}
        >
        DELETE
        </Button>
      </div>
    </Stack>
        </div>
    </div>
  )
}
