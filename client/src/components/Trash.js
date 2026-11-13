//Trash.js
//IMPORT REQUIRED MODULES AND PACKAGES
import React, { useCallback, useEffect, useRef, useState } from 'react'
// IMPORT CSS STYLESHEETS
import '../css/componentCss/Trash.css'
import '../css/componentCss/ListTables.css'
import '../css/componentCss/ListBtns.css'
// IMPORT BOOTSTRAP COMPONENTS
import Button from 'react-bootstrap/Button';
// IMPORT COMPONENTS
import Pagination, { PAGE_SIZES } from './Pagination';
// IMPORT UTILITY FUNCTIONS
import { dateDisplay } from '../util/dateFunctions';
import { languageName } from '../util/languageFunc';
import { PURGE_DAYS, daysLeft } from '../util/listUtilFunc';
// IMPORT ICONS FROM LUCIDE-REACT
import { ArchiveRestore, ArchiveX, TrashIcon } from 'lucide-react';

//Trash Function Component
/* Table of the user's trashed notes
GET /notes/trash, PATCH /notes/:id/restore, DELETE /notes/:id/permanent */
export default function Trash(//Export default Trash function component
  {//PROPS PASSED FROM PARENT COMPONENT (Notes.js)
    setError,
    fetchNotes// Refreshes the main notes list after a note is restored
  }) {
    //===============STATE VARIABLES
    const [notes, setNotes] = useState([])// The user's trashed notes
    const [loading, setLoading] = useState(false)
    const [actionId, setActionId] = useState(null)// Id of the note a restore/delete request is running for
    const [pagination, setPagination] = useState({ page: 1, limit: PAGE_SIZES[0], total: 0, totalPages: 1 })
    const [page, setPage] = useState(1)
    const [limit, setLimit] = useState(PAGE_SIZES[0])
    const latestRequest = useRef(0)// Id of the most recent fetch, used to ignore stale responses
    const rowNumber = (index) => (pagination.page - 1) * pagination.limit + index + 1// Numbering carries on across pages

    //========FETCH TRASHED NOTES REQUEST===============
    const fetchTrash = useCallback(async () => {
      // Only the newest request updates the table (a slow earlier page can't overwrite it)
      const requestId = ++latestRequest.current
      const isStale = () => requestId !== latestRequest.current
      setLoading(true)
      try {
        const params = new URLSearchParams({ page: String(page), limit: String(limit) })
        // The browser sends the JWT cookie with the request
        const response = await fetch(`/notes/trash?${params.toString()}`, { method: 'GET' })
        const data = await response.json().catch(() => ({}))
        if (isStale()) return// A newer request has replaced this one
        if (!response.ok) throw new Error(data.message || 'Failed to fetch trash')
        setNotes(Array.isArray(data.notes) ? data.notes : [])
        if (data.pagination) {
          setPagination(data.pagination)
          // A restore/delete can empty the last page; step back to the new last page
          const lastPage = Math.max(data.pagination.totalPages || 1, 1)
          if (page > lastPage) setPage(lastPage)
        }
      } catch (error) {
        if (isStale()) return
        console.error('[ERROR: Trash.js] Fetching trashed notes failed:', error.message)
        setError?.('An error occurred while loading your trash.')
      } finally {
        if (!isStale()) setLoading(false)
      }
    }, [setError, page, limit])

    // Fetch when the trash list is opened (it mounts each time SHOW TRASH is clicked) and when the page changes
    useEffect(() => {
      fetchTrash()
    }, [fetchTrash])

    /* Shared request runner for the restore and delete buttons.
    Removes the note from the table on success, then re-fetches so the page is
    refilled from the next one and the totals stay correct. Returns the response data */
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
        fetchTrash()
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
              <th colSpan={6}><p className='tableHeading'>TRASH<ArchiveX/></p></th>
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
                    <td>{rowNumber(index)}</td>
                    <td>{note.title}</td>
                    <td>{languageName(note.language)}</td>
                    <td>{dateDisplay(note.createdAt)}</td>
                    <td>
                      {dateDisplay(note.deletedAt)}
                      {remaining !== null && <><br/><small>({remaining} {remaining === 1 ? 'DAY' : 'DAYS'} LEFT)</small></>}
                    </td>
                    <td>
                    {/* TABLE BUTTONS */}
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
                        >
                        DELETE<TrashIcon aria-hidden='true' focusable='false'/>
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
              <td colSpan={6}>
                {/* PAGINATION (Pagination.js) */}
                <Pagination
                  page={pagination.page}
                  totalPages={pagination.totalPages}
                  total={pagination.total}
                  limit={limit}
                  setPage={setPage}
                  setLimit={setLimit}
                  loading={loading}
                  controlId='trashedNotePageSize'
                />
              </td>
            </tr>
            <tr>
              <td colSpan={6}><i style={{color: "#B82C3A", fontWeight: "800"}}>NOTES ARE PERMANENTLY DELETED {PURGE_DAYS} DAYS AFTER BEING MOVED TO TRASH</i></td>
            </tr>
          </tfoot>
        </table>
      </div>
  )
}
