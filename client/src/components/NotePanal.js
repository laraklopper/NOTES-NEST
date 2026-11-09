// NotePanal.js
import React, { useCallback, useState } from 'react'
import { Link } from 'react-router-dom';
import '../css/componentCss/DetailsPanals.css'
// IMPORT BOOTSTRAP COMPONENTS
import Stack from 'react-bootstrap/Stack';
import Button from 'react-bootstrap/Button';
// IMPORT UTILITY FUNCTIONS
import { formatTimestamp } from '../util/dateFunctions';
import { languageName } from '../util/languageFunc';
// IMPORT ICONS FROM LUCIDE-REACT
import { ArchiveArrowDownIcon, Copy, Edit3Icon, Trash2, X } from 'lucide-react';

// PANAL FOR A SELECTED NOTE
/* PATCH /archive/:id, DELETE /notes/delete/:id */
export default function NotePanal(
    {//PROPS PASSED FROM PARENT COMPONENT (NotesList.js)
        note,// The selected note
        rowNumber,// The note's number in the table
        editNote,// True while the edit form is open
        onToggleEdit,
        onClose,// Closes the panal (and the edit form)
        fetchNotes,// Refreshes the list after an archive/trash
        setError// Shows an error message above the list
    }
) {
    const [actionLoading, setActionLoading] = useState(false)// True while an archive/trash request is running

    /* Shared request runner for the archive and trash buttons.
    Refreshes the list and closes the panal on success */
    const runNoteAction = useCallback(async (url, method, fallbackMessage) => {
        setError?.(null)
        setActionLoading(true)
        try {
            // The browser sends the JWT cookie with the request
            const response = await fetch(url, { method })
            const data = await response.json().catch(() => ({}))
            if (!response.ok) {
                setError?.(data.message || fallbackMessage)
                return false
            }
            onClose?.()
            await fetchNotes?.()// Refresh the list so the note disappears from it
            return true
        } catch (error) {
            console.error(fallbackMessage, error)
            setError?.(fallbackMessage)
            return false
        } finally {
            setActionLoading(false)
        }
    }, [setError, onClose, fetchNotes])

    //========ARCHIVE NOTE REQUEST===============
    const archiveNote = useCallback(async (id) => {
        const success = await runNoteAction(`/archive/${id}`, 'PATCH', 'Error archiving note.')
        if (success) alert('Note successfully archived')
    }, [runNoteAction])

    //========MOVE NOTE TO TRASH REQUEST===============
    const moveToTrash = useCallback(async (id) => {
        const success = await runNoteAction(`/notes/delete/${id}`, 'DELETE', 'Error moving note to trash.')
        if (success) alert('Note successfully moved to trash')
    }, [runNoteAction])

    // Ask before archiving the note
    const handleArchive = () => {
        const confirmArchive = window.confirm(
            `Are you sure you want to archive "${note.title}"?`
        )
        if (!confirmArchive) return;
        archiveNote(note._id)
    }

    // Ask before moving the note to trash
    const handleDelete = () => {
        const confirmDelete = window.confirm(
            `Are you sure you want to move "${note.title}" to trash?`
        )
        if (!confirmDelete) return;
        moveToTrash(note._id)
    }

    // Copy the note text (without HTML tags) to the clipboard
    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(note.plainText || '')
            alert('Note copied to clipboard')
        } catch (error) {
            console.error('Error copying note:', error)
            setError?.('Could not copy the note to the clipboard.')
        }
    }

    // Hooks above must run on every render, so this check comes after them
    if (!note) return null

  return (
    <div id='notePanal'>
            <Stack direction="horizontal" gap={3} id='notePanalHead'>
      <div className="p-2">
      <span id='panalHeadSpan'>
      <h4 className='panalHeading'>#{rowNumber} {note.title}</h4>
      </span>
      </div>
      <div className="p-2 ms-auto">
        <Button
        variant='warning'
        id='editNoteBtn'
        type='button'
        onClick={onToggleEdit}
        // ARIA ATTRIBUTES:
        aria-label={editNote ? 'Hide Form': 'Edit Note'}
        >
            {editNote ? (
                <>
                   <X/> HIDE FORM
                </>
            ): (
                <>
                    <Edit3Icon/>
                    EDIT NOTE
                </>
            )}
        </Button>
      </div>
      <div className="vr" style={{width: '2px'}} />
      <div className="p-2">
        <Button
        variant='warning'
        id='closePanalBtn'
        type='button'
        onClick={onClose}
        // ARIA ATTRIBUTES:
        aria-label='Close note details'
        >
          <X aria-hidden='true' focusable='false' />  CLOSE
        </Button>
      </div>
    </Stack>
        <div id='notePanalBody'>
        {/* STACK 1 */}
             <Stack gap={3} id='notePanalStack1'>
      <div className="p-2" id='noteContentBlock'>
        <div id='noteContentDiv'>
            <span className='dataSpan'>
                <p className='dataLabel'>CONTENT:</p>
                {/* Content is TipTap HTML, sanitised by noteSchema before it is saved.
                A div is used because the HTML contains its own <p> tags */}
                 <div
                    id='noteContentPara'
                    className='detailValue'
                    dangerouslySetInnerHTML={{ __html: note.content }}
                 />
            </span>
                 <div id='copyNoteDiv'>
                {/* COPY CONTENT BUTTON */}
                <Button
                    variant='light'
                    id='copyContentBtn'
                    type='button'
                    onClick={handleCopy}
                    // ARIA ATTRIBUTES:
                    aria-label='Copy note text'
                ><Copy aria-hidden='true' focusable='false'/>COPY</Button>
            </div>
        </div>
      </div>
        <div className="p-2">
        <span className='dataSpan'>
            <p className='dataLabel'>LANGUAGE:</p>
            <p className='dataValue'>{languageName(note.language)}</p>
        </span>
      </div>
    </Stack>
    {/* STACK 2: */}
             <Stack gap={3} id='notePanalStack2'>
                <div className="p-2">
        <span className='dataSpan'>
            <p className='dataLabel'>DATE ADDED:</p>
            <p className='dataValue'>{formatTimestamp(note.createdAt)}</p>
        </span>
    </div>
      <div className="p-2" id='noteBookBlock'>
        {/* Notebook */}
        <span className='dataSpan'>
            <p className='dataLabel'>NOTE BOOK:</p>
            <p className='dataValue'>{note.notebook?.name || 'No notebook'}</p>
        </span>
      </div>
      <div className="p-2" id='noteTagGroup'>
{/* Tags */}
<p className='dataLabel'>TAGS:</p>
        <ul className='tagList'>
            {note.tags?.length ? (
                note.tags.map((tag) => (
                    <li className='tagListItem' key={tag._id}>{tag.name}</li>
                ))
            ) : (
                <li className='tagListItem'>No tags</li>
            )}
        </ul>
      </div>
    </Stack>
        </div>
    <Stack direction="horizontal" gap={3} id='panalFooter'>
      <div className="p-2">
        {/* Link to translateForm; the note id is passed in the route state */}
        <Link className='refLink' to='/translate' state={{ noteId: note._id }}>TRANSLATE</Link>
      </div>
      <div className="p-2 ms-auto">
        <Button
        variant='warning'
        id='archiveNoteBtn'
        type='button'
        onClick={handleArchive}
        disabled={actionLoading}
        // ARIA ATTRIBUTES
        aria-label='Archive note'
        >
           <ArchiveArrowDownIcon aria-hidden='true' focusable='false'/> ARCHIVE
        </Button>
      </div>
      <div className="vr" style={{width: '2px'}}/>
      <div className="p-2">
        <Button
        variant='danger'
        id='trashNoteBtn'
        type='button'
        onClick={handleDelete}
        disabled={actionLoading}
        // ARIA ATTRIBUTES:
        aria-label='Move to trash'
        >
            <Trash2 aria-hidden='true' focusable='false'/>DELETE
        </Button>
      </div>
    </Stack>
    </div>
  )
}
