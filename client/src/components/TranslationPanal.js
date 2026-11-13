//TranslationPanal.js
//IMPORT REQUIRED MODULES AND PACKAGES
import React, { useCallback, useState } from 'react'
// IMPORT CSS STYLESHEETS
import '../css/componentCss/DetailsPanals.css'
// IMPORT BOOTSTRAP COMPONENTS
import Stack from 'react-bootstrap/Stack';
import Button from 'react-bootstrap/Button';
// IMPORT UTILITY FUNCTIONS
import { formatTimestamp } from '../util/dateFunctions';
import { languageName } from '../util/languageFunc';
// IMPORT ICONS FROM LUCIDE-REACT
import { Archive, ArrowRight, Copy, Trash2, X } from 'lucide-react';

// PANAL FOR A SELECTED TRANSLATION
/* DELETE /translation/:id (move to trash), PATCH /archive/translation/:id */
export default function TranslationPanal(
    {//PROPS PASSED FROM PARENT COMPONENT (TranslationsList.js)
        translation,// The selected translation
        rowNumber,// The translation's number in the table
        currentUser,
        onClose,// Closes the panal
        fetchTranslations,// Refreshes the list after a delete
        setError// Shows an error message above the list
    }
) {
    // =======STATE VARIABLES==============
    const [deleting, setDeleting] = useState(false)// True while a delete request is running
    const [archiving, setArchiving] = useState(false)// True while an archive request is running

    //========ARCHIVE TRANSLATION REQUEST===============
    // Hides the translation from the list; it can be restored from ARCHIVE & TRASH
    const archiveTranslation = useCallback(async (id) => {
        setError?.(null)
        setArchiving(true)
        try {
            const response = await fetch(`/archive/translation/${id}`, {
                method: 'PATCH',
                credentials: 'include',
            })
            const data = await response.json().catch(() => ({}))
            if (!response.ok) throw new Error(data?.message || 'Failed to archive translation')

            onClose?.()// Close the panal
            await fetchTranslations?.()// Refresh the list so the translation disappears from it
            alert('Translation successfully archived')
        } catch (error) {
            console.error('[ERROR: TranslationPanal.js] Archiving translation failed:', error.message)
            setError?.(error.message || 'Something went wrong while archiving. Please try again.')
        } finally {
            setArchiving(false)
        }
    }, [setError, onClose, fetchTranslations])

    // Ask before archiving the translation
    const handleArchive = () => {
        const confirmArchive = window.confirm('Move this translation to the archive?')
        if (!confirmArchive) return
        archiveTranslation(translation._id)
    }

    //========DELETE TRANSLATION REQUEST===============
    const deleteTranslation = useCallback(async (id) => {
        setError?.(null)
        setDeleting(true)
        try {
            const response = await fetch(`/translation/${id}`, {
                method: 'DELETE',
                credentials: 'include',
            })
            const data = await response.json().catch(() => ({}))
            if (!response.ok) throw new Error(data?.message || 'Failed to delete translation')

            onClose?.()// Close the panal
            await fetchTranslations?.()// Refresh the list so the translation disappears from it
            alert('Translation moved to trash')
        } catch (error) {
            console.error('[ERROR: TranslationPanal.js] Deleting translation failed:', error.message)
            setError?.(error.message || 'Something went wrong while deleting. Please try again.')
        } finally {
            setDeleting(false)
        }
    }, [setError, onClose, fetchTranslations])

    // Ask before deleting the translation
    const handleDelete = () => {
        const confirmDelete = window.confirm('Move this translation to the trash?')
        if (!confirmDelete) return
        deleteTranslation(translation._id)
    }

    // Copy the translated text to the clipboard
    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(translation.translatedText || '')
            alert('Translation copied to clipboard')
        } catch (error) {
            console.error('[ERROR: TranslationPanal.js] Copying translation failed:', error)
            setError?.('Could not copy the translation to the clipboard.')
        }
    }

    // Hooks above must run on every render, so this check comes after them
    if (!translation) return null

    //==============JSX RENDERING================
  return (
    <div id='translationPanal' role='group'>
    {/* Panal header Stack */}
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
    {/* Translation Panal Body */}
    <div id='translationPanalBody'>
    {/* STACK 1: */}
        <Stack gap={3} id='panalStack1'>
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
    {/* STACK 2: */}
    <Stack gap={3} id='panalStack2'>
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
    {/* PANAL FOOTER */}
     <Stack direction="horizontal" gap={3} id='panalFooter'>
      <div className="p-2">
        <Button
        variant='light'
        id='copyBtn'
        type='button'
        onClick={handleCopy}
        // ARIA ATTRIBUTES:
        aria-label='Copy translated text'
        >
            <Copy aria-hidden='true' focusable='false'/>COPY
        </Button>
      </div>
      <div className="p-2 ms-auto"></div>
      <div className="p-2">
        <Button
        variant='light'
        id='archiveTranslationBtn'
        type='button'
        onClick={handleArchive}
        disabled={archiving || deleting}
        // ARIA ATTRIBUTES:
        aria-label='Archive translation'
        aria-disabled={archiving || deleting ? 'true' : 'false'}
        >
            ARCHIVE<Archive aria-hidden='true' focusable='false'/>
        </Button>
      </div>
      <div className="vr" />
      <div className="p-2">
        <Button
        variant='danger'
        id='deleteItemBtn'
        type='button'
        onClick={handleDelete}
        disabled={deleting || archiving}
        // ARIA ATTRIBUTES:
        aria-label='Move translation to trash'
        aria-disabled={deleting ? 'true': 'false'}
        >
            DELETE<Trash2 aria-hidden='true' focusable='false'/>
        </Button>
      </div>
    </Stack>
    </div>
  )
}
