import React from 'react'
import '../css/componentCss/ListTables.css'
import Stack from 'react-bootstrap/Stack';
import Button from 'react-bootstrap/Button';
import { ArrowRight, Trash2, X } from 'lucide-react';
export default function TranslationsList() {
  return (
    <div id='translationsList'>
 <div id='translationsTableWrapper'>
        <table id='translationsTable'>
            <thead>
                <tr>
                    <th colSpan={7}>TRANSLATIONS</th>
                </tr>
                <tr>
                    <th>#</th>
                    <th>SOURCE TEXT</th>
                    <th>SOURCE LANGUAGE</th>
                    <th>TRANSLATED TEXT</th>
                    <th>TARGET LANGUAGE</th>
                    {/* BUTTONS */}
                    <th></th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>#</td>
                    <td>source text</td>
                    <td></td>
                    <td>translatedText</td>
                    <td>TargetLanguage</td>
                    <td>
                        <div id='translationBtnDiv'>
                            <Button
                            variant='light'
                            id='viewTranslationBtn'
                            type='button'
                            >VIEW</Button>
                        </div>

                    </td>
                </tr>
            </tbody>
        </table>
    </div>
    <div id='translationPanal'>
        <Stack direction="horizontal" gap={3} id='translationPanalHead'>
      <div className="p-2" id='panalHeadingBlock'>
      
        <h4>{/* index : source language  */}<ArrowRight/>{/*target language  */}</h4>
      </div>
      <div className="p-2 ms-auto">
        <h6>@{/* currentUser.username */}</h6>
      </div>
      <div className="vr" />
      <div className="p-2">
        <Button
        id='closePanalBtn'
        variant='warning'>
            <X/> CLOSE
        </Button>
      </div>
    </Stack>
    <div id='translationPanalBody'>
        <Stack gap={3}>
      <div className="p-2">
        
            <span className='dataSpan'>
                <p className='dataLabel'>SOURCE LANGUAGE:</p>
                <p className='dataValue'>language</p>
            </span>
      </div>
      <div className="p-2">
          <span className='dataSpan'>
                <p className='dataLabel'>TARGET LANGUAGE:</p>
                <p className='dataValue'>language</p>
            </span>
      </div>
      <div className="p-2">
      {/* NOTE if translation is linked to a note (text copied from a note) */}
        <span className='dataSpan'>
                <p className='dataLabel'>NOTE:</p>
                <p className='dataValue'>note title</p>
            </span>
      </div>
    </Stack>
    <Stack gap={3}>
      <div className="p-2">
        <span className='dataSpan'>
            <p className='dataLabel'>SOURCE TEXT:</p>
            <p className='dataValue'>source text</p>
        </span>
      </div>
      <div className="p-2">
         <span className='dataSpan'>
            <p className='dataLabel'>TRANSLATED TEXT:</p>
            <p className='dataValue'>source text</p>
        </span>
      </div>
      <div className="p-2">
          <span className='dataSpan'>
            <p className='dataLabel'>DATE ADDED:</p>
            <p className='dataValue'>date</p>
        </span>
      </div>
    </Stack>
    </div>
     <Stack direction="horizontal" gap={3} id='panalFooter'>
      <div className="p-2"></div>
      <div className="p-2 ms-auto"></div>
      <div className="vr" />
      <div className="p-2">
        <Button
        variant='danger'
        id='deleteItemBtn'
        type='button'
        // onClick={}
        // ARIA ATTRIBUTES:
        >
            DELETE<Trash2/>
        </Button>
      </div>
    </Stack>
    </div>
    </div>
   
  )
}
