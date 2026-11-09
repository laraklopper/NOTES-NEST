// NotePanal.js
import React from 'react'
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
export default function NotePanal(
    {//PROPS PASSED FROM PARENT COMPONENT (NotesList.js)
        note,// The selected note
        rowNumber,// The note's number in the table
        editNote,// True while the edit form is open
        onToggleEdit,
        onClose,
        onCopy,
        onArchive,
        onDelete,
        actionLoading = false// True while an archive/trash request is running
    }
) {
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
                    onClick={onCopy}
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
        onClick={onArchive}
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
        onClick={onDelete}
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
