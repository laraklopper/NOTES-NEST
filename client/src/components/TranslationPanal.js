//TranslationPanal.js
import React from 'react'
import '../css/componentCss/DetailsPanals.css'
// IMPORT BOOTSTRAP COMPONENTS
import Stack from 'react-bootstrap/Stack';
import Button from 'react-bootstrap/Button';
// IMPORT UTILITY FUNCTIONS
import { formatTimestamp } from '../util/dateFunctions';
import { languageName } from '../util/languageFunc';
// IMPORT ICONS FROM LUCIDE-REACT
import { ArrowRight, Copy, Trash2, X } from 'lucide-react';

// PANAL FOR A SELECTED TRANSLATION
export default function TranslationPanal(
    {//PROPS PASSED FROM PARENT COMPONENT (TranslationsList.js)
        translation,// The selected translation
        rowNumber,// The translation's number in the table
        currentUser,
        onClose,
        onCopy,
        onDelete,
        deleting = false// True while a delete request is running
    }
) {
    if (!translation) return null

  return (
    <div id='translationPanal'>
        <Stack direction="horizontal" gap={3} id='translationPanalHead'>
      <div className="p-2" id='panalHeadingBlock'>
        <h4 className='panalHeading'>
            #{rowNumber} {languageName(translation.sourceLanguage)}
            <ArrowRight aria-label='to'/>
            {languageName(translation.targetLanguage)}
        </h4>
      </div>
      <div className="p-2 ms-auto">
        {currentUser?.username && <h6>@{currentUser.username}</h6>}
      </div>
      <div className="vr" />
      <div className="p-2">
        <Button
        id='closePanalBtn'
        variant='warning'
        type='button'
        onClick={onClose}
        // ARIA ATTRIBUTES:
        aria-label='Close translation details'
        >
            <X aria-hidden='true' focusable='false'/> CLOSE
        </Button>
      </div>
    </Stack>
    <div id='translationPanalBody'>
        <Stack gap={3}>
      <div className="p-2">
            <span className='dataSpan'>
                <p className='dataLabel'>SOURCE LANGUAGE:</p>
                <p className='dataValue'>{languageName(translation.sourceLanguage)}</p>
            </span>
      </div>
      <div className="p-2">
          <span className='dataSpan'>
                <p className='dataLabel'>TARGET LANGUAGE:</p>
                <p className='dataValue'>{languageName(translation.targetLanguage)}</p>
            </span>
      </div>
      {/* NOTE if translation is linked to a note (text copied from a note) */}
      {translation.note && (
      <div className="p-2">
        <span className='dataSpan'>
                <p className='dataLabel'>NOTE:</p>
                <p className='dataValue'>{translation.note.title || 'Untitled note'}</p>
            </span>
      </div>
      )}
      <div className="p-2">
          <span className='dataSpan'>
            <p className='dataLabel'>DATE ADDED:</p>
            <p className='dataValue'>{formatTimestamp(translation.createdAt)}</p>
        </span>
      </div>
    </Stack>
    <Stack gap={3}>
      <div className="p-2">
        <span className='dataSpan'>
            <p className='dataLabel'>SOURCE TEXT:</p>
            <p className='dataValue'>{translation.sourceText}</p>
        </span>
      </div>
      <div className="p-2">
         <span className='dataSpan'>
            <p className='dataLabel'>TRANSLATED TEXT:</p>
            <p className='dataValue'>{translation.translatedText}</p>
        </span>
      </div>
    </Stack>
    </div>
     <Stack direction="horizontal" gap={3} id='panalFooter'>
      <div className="p-2">
        <Button
        variant='light'
        id='copyBtn'
        type='button'
        onClick={onCopy}
        // ARIA ATTRIBUTES:
        aria-label='Copy translated text'
        >
            <Copy aria-hidden='true' focusable='false'/>COPY
        </Button>
      </div>
      <div className="p-2 ms-auto"></div>
      <div className="vr" />
      <div className="p-2">
        <Button
        variant='danger'
        id='deleteItemBtn'
        type='button'
        onClick={onDelete}
        disabled={deleting}
        // ARIA ATTRIBUTES:
        aria-label='Delete translation'
        >
            DELETE<Trash2 aria-hidden='true' focusable='false'/>
        </Button>
      </div>
    </Stack>
    </div>
  )
}
