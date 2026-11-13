//ArchivedNotes.js
//IMPORT REQUIRED MODULES AND PACKAGES
import React, { useCallback, useEffect, useState } from 'react'
// IMPORT CSS STYLESHEETS
import '../css/componentCss/ListBtns.css'
import '../css/componentCss/Trash.css'
import '../css/componentCss/ListTables.css'
// IMPORT BOOTSTRAP COMPONENTS
import Button from 'react-bootstrap/Button';
// IMPORT UTILITY FUNCTIONS
import { formatTimestamp } from '../util/dateFunctions';
import { languageName } from '../util/languageFunc';
import { ARCHIVE_DAYS, archiveDaysLeft } from '../util/listUtilFunc';
// IMPORT ICONS FROM LUCIDE-REACT
import { Archive, ArchiveRestore, Trash } from 'lucide-react';

// ArchivedNotes component
/* Table of the user's archived notes
GET /archive/fetchNotes, PATCH /archive/:id/restore, DELETE /archive/:id */
export default function ArchivedNotes(
    {//PROPS PASSED FROM PARENT COMPONENT (Notes.js)
        setError,
        fetchNotes// Refreshes the main notes list after a note is restored
    }
) {
    //=========STATE VARIABLES==========
    const [notes, setNotes] = useState([])// The user's archived notes
    const [loading, setLoading] = useState(false)
    const [actionId, setActionId] = useState(null)// Id of the note a restore/delete request is running for

    //========FETCH ARCHIVED NOTES REQUEST===============
    const fetchArchivedNotes = useCallback(async () => {
        setLoading(true)
        try {
            // The browser sends the JWT cookie with the request
            const response = await fetch('/archive/fetchNotes', { method: 'GET' })
            const data = await response.json().catch(() => ({}))
            if (!response.ok) throw new Error(data.message || 'Failed to fetch archived notes')
            setNotes(data.notes || [])
        } catch (error) {
            console.error('[ERROR: ArchivedNotes.js] Fetching archived notes failed:', error.message)
            setError?.('An error occurred while loading your archived notes.')
        } finally {
            setLoading(false)
        }
    }, [setError])

    // Fetch when the archive list is opened (it mounts each time SHOW ARCHIVE is clicked)
    useEffect(() => {
        fetchArchivedNotes()
    }, [fetchArchivedNotes])

    /* Shared request runner for the restore and delete buttons.
    Removes the note from the table on success */
    const runArchiveAction = useCallback(async (id, url, method, fallbackMessage) => {
        setError?.(null)
        setActionId(id)
        try {
            const response = await fetch(url, { method })
            const data = await response.json().catch(() => ({}))
            if (!response.ok) {
                setError?.(data.message || fallbackMessage)
                // 404 means the note already left the archive (e.g. in another tab); resync the table
                if (response.status === 404) fetchArchivedNotes()
                return false
            }
            setNotes((prev) => prev.filter((note) => note._id !== id))
            return true
        } catch (error) {
            console.error(`[ERROR: ArchivedNotes.js] ${fallbackMessage}`, error)
            setError?.(fallbackMessage)
            return false
        } finally {
            setActionId(null)
        }
    }, [setError, fetchArchivedNotes])

    //========RESTORE NOTE REQUEST===============
    // Moves the note back to the main notes list
    const handleRestore = async (note) => {
        const confirmRestore = window.confirm(`Restore "${note.title}" to your notes?`)
        if (!confirmRestore) return
        const success = await runArchiveAction(note._id, `/archive/${note._id}/restore`, 'PATCH', 'Error restoring note.')
        if (success) {
            fetchNotes?.()// So the note shows in the NOTES tab straight away
            alert('Note successfully restored')
        }
    }

    //========MOVE ARCHIVED NOTE TO TRASH REQUEST===============
    const handleDelete = async (note) => {
        const confirmDelete = window.confirm(`Are you sure you want to move "${note.title}" to trash?`)
        if (!confirmDelete) return
        const success = await runArchiveAction(note._id, `/archive/${note._id}`, 'DELETE', 'Error moving note to trash.')
        if (success) alert('Note successfully moved to trash')
    }

    //=======================JSX RENDERING=======================================
    return (
        <div id='archiveTableWrapper'>
            <table id='archiveTable'>
                <thead>
                    <tr>
                        <th colSpan={6}><p className='tableHeading'>ARCHIVED NOTES<Archive/></p></th>
                    </tr>
                    <tr>
                        <th style={{color: '#212529'}}>#</th>
                        <th style={{color: '#212529'}}>TITLE</th>
                        <th style={{color: '#212529'}}>LANGUAGE</th>
                        <th style={{color: '#212529'}}>DATE ADDED</th>
                        <th style={{color: '#212529'}}>MOVES TO TRASH IN</th>
                        <th style={{color: '#212529'}}></th>
                    </tr>
                </thead>
                <tbody>
                    {loading && notes.length === 0 ? (
                        <tr>
                            <td colSpan={6}>LOADING ARCHIVED NOTES...</td>
                        </tr>
                    ) : notes.length === 0 ? (
                        <tr>
                            <td colSpan={6}>NO ARCHIVED NOTES</td>
                        </tr>
                    ) : (
                        notes.map((note, index) => {
                            const remaining = archiveDaysLeft(note)
                            return (
                            <tr key={note._id}>
                                <td>{index + 1}</td>
                                <td>{note.title}</td>
                                <td>{languageName(note.language)}</td>
                                <td>{formatTimestamp(note.createdAt)}</td>
                                {/* 60-day rule: highlight notes with a week or less left */}
                                <td style={remaining !== null && remaining <= 7 ? {color: '#B82C3A', fontWeight: '800'} : undefined}>
                                    {remaining === null ? '-' : remaining === 0 ? 'TODAY' : `${remaining} DAY${remaining === 1 ? '' : 'S'}`}
                                </td>
                                <td>
                                    <div className='archiveTableBtns'>
                                        <Button
                                            variant='light'
                                            className='restoreNoteBtn'
                                            type='button'
                                            onClick={() => handleRestore(note)}
                                            disabled={actionId !== null}
                                            // ARIA ATTRIBUTES:
                                            aria-label={`Restore note ${note.title}`}
                                        >
                                            <ArchiveRestore aria-hidden='true' focusable='false'/> RESTORE
                                        </Button>
                                        <Button
                                            variant='danger'
                                            className='deleteArchiveNoteBtn'
                                            type='button'
                                            onClick={() => handleDelete(note)}
                                            disabled={actionId !== null}
                                            // ARIA ATTRIBUTES:
                                            aria-label={`Move note ${note.title} to trash`}
                                        >
                                            <Trash aria-hidden='true' focusable='false'/>DELETE
                                        </Button>
                                    </div>
                                </td>
                            </tr>
                            )
                        })
                    )}
                </tbody>
                <tfoot>
                    <tr>
                        <td colSpan={6}>RESTORE TO VIEW NOTE DETAILS</td>
                    </tr>
                    <tr>
                        <td colSpan={6}><i style={{color: "#B82C3A", fontWeight: "800"}}>ARCHIVED NOTES ARE MOVED TO TRASH {ARCHIVE_DAYS} DAYS AFTER BEING ARCHIVED</i></td>
                    </tr>
                </tfoot>
            </table>
        </div>
    )
}
