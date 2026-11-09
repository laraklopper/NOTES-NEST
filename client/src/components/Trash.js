//Trash.js
//IMPORT REQUIRED MODULES AND PACKAGES
import React, { useCallback, useEffect, useState } from 'react'
// IMPORT CSS STYLESHEETS
import '../css/componentCss/Trash.css'
// IMPORT BOOTSTRAP COMPONENTS
import Button from 'react-bootstrap/Button';
// IMPORT UTILITY FUNCTIONS
import { formatTimestamp } from '../util/dateFunctions';
import { languageName } from '../util/languageFunc';
// IMPORT ICONS FROM LUCIDE-REACT
import { ArchiveRestore, TrashIcon } from 'lucide-react';

const PURGE_DAYS = 30;// Matches the TTL index on deletedAt in noteSchema
const DAY_MS = 24 * 60 * 60 * 1000;

// Whole days left before the note is purged automatically (never below 0)
const daysLeft = (deletedAt) => {
    const deleted = new Date(deletedAt).getTime()
    if (isNaN(deleted)) return null
    return Math.max(Math.ceil((deleted + PURGE_DAYS * DAY_MS - Date.now()) / DAY_MS), 0)
}

//====MAIN TRASH FUNCTION COMPONENT========
/* Table of the user's trashed notes
GET /notes/trash, PATCH /notes/:id/restore, DELETE /notes/:id/permanent */
export default function Trash(
  {//PROPS PASSED FROM PARENT COMPONENT (Notes.js)
    setError,
    fetchNotes// Refreshes the main notes list after a note is restored
  }) {
    const [notes, setNotes] = useState([])// The user's trashed notes
    const [loading, setLoading] = useState(false)
    const [actionId, setActionId] = useState(null)// Id of the note a restore/delete request is running for

    //========FETCH TRASHED NOTES REQUEST===============
    const fetchTrash = useCallback(async () => {
      setLoading(true)
      try {
        // The browser sends the JWT cookie with the request
        const response = await fetch('/notes/trash', { method: 'GET' })
        const data = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(data.message || 'Failed to fetch trash')
        setNotes(data.notes || [])
      } catch (error) {
        console.error('[ERROR: Trash.js] Fetching trashed notes failed:', error.message)
        setError?.('An error occurred while loading your trash.')
      } finally {
        setLoading(false)
      }
    }, [setError])

    // Fetch when the trash list is opened (it mounts each time SHOW TRASH is clicked)
    useEffect(() => {
      fetchTrash()
    }, [fetchTrash])

    /* Shared request runner for the restore and delete buttons.
    Removes the note from the table on success and returns the response data */
    const runTrashAction = useCallback(async (id, url, method, fallbackMessage) => {
      setError?.(null)
      setActionId(id)
      try {
        const response = await fetch(url, { method })
        const data = await response.json().catch(() => ({}))
        if (!response.ok) {
          setError?.(data.message || fallbackMessage)
          // 404 means the note already left the trash (e.g. in another tab); resync the table
          if (response.status === 404) fetchTrash()
          return null
        }
        setNotes((prev) => prev.filter((note) => note._id !== id))
        return data
      } catch (error) {
        console.error(`[ERROR: Trash.js] ${fallbackMessage}`, error)
        setError?.(fallbackMessage)
        return null
      } finally {
        setActionId(null)
      }
    }, [setError, fetchTrash])

    //========RESTORE NOTE REQUEST===============
    const handleRestore = async (note) => {
      const data = await runTrashAction(note._id, `/notes/${note._id}/restore`, 'PATCH', 'Error restoring note.')
      if (!data) return
      fetchNotes?.()// So the note shows in the NOTES tab straight away
      // A note trashed while it was archived goes back to the archive
      alert(data.note?.isArchived ? 'Note restored to the archive' : 'Note successfully restored')
    }

    //========PERMANENTLY DELETE NOTE REQUEST===============
    const handleDelete = async (note) => {
      const confirmDelete = window.confirm(
        `Are you sure you want to permanently delete "${note.title}" and its saved translations?\nThis cannot be undone.`
      )
      if (!confirmDelete) return
      const data = await runTrashAction(note._id, `/notes/${note._id}/permanent`, 'DELETE', 'Error deleting note.')
      if (data) alert('Note permanently deleted')
    }

      //================JSX RENDERING==================
  return (
      <div id='trashTableWrapper'>
        <table id='trashTable'>
          <thead>
            <tr>
              <th colSpan={6}>TRASH</th>
            </tr>
            <tr>
              <th>#</th>
              <th>TITLE</th>
              <th>LANGUAGE</th>
              <th>DATE ADDED</th>
              <th>DELETED ON</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && notes.length === 0 ? (
              <tr>
                <td colSpan={6}>LOADING TRASH...</td>
              </tr>
            ) : notes.length === 0 ? (
              <tr>
                <td colSpan={6}>TRASH IS EMPTY</td>
              </tr>
            ) : (
              notes.map((note, index) => {
                const remaining = daysLeft(note.deletedAt)
                return (
                  <tr key={note._id}>
                    <td>{index + 1}</td>
                    <td>{note.title}</td>
                    <td>{languageName(note.language)}</td>
                    <td>{formatTimestamp(note.createdAt)}</td>
                    <td>
                      {formatTimestamp(note.deletedAt)}
                      {remaining !== null && <><br/><small>({remaining} {remaining === 1 ? 'DAY' : 'DAYS'} LEFT)</small></>}
                    </td>
                    <td>
                      <div className='trashTableBtns'>
                        <Button
                        variant='light'
                        className='restoreNoteBtn'
                        type='button'
                        onClick={() => handleRestore(note)}
                        disabled={actionId !== null}
                        // ARIA ATTRIBUTES:
                        aria-label={`Restore note ${note.title}`}
                        >
                          RESTORE <ArchiveRestore aria-hidden='true' focusable='false'/>
                        </Button>
                        <Button
                        className='permanentDeleteBtn'
                        variant='danger'
                        type='button'
                        onClick={() => handleDelete(note)}
                        disabled={actionId !== null}
                        // ARIA ATTRIBUTES:
                        aria-label={`Permanently delete note ${note.title}`}
                        >DELETE
                          <TrashIcon aria-hidden='true' focusable='false'/>
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
              <td colSpan={6}>NOTES ARE PERMANENTLY DELETED {PURGE_DAYS} DAYS AFTER BEING MOVED TO TRASH</td>
            </tr>
          </tfoot>
        </table>
      </div>
  )
}
