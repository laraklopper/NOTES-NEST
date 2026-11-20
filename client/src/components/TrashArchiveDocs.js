//TrashArchiveDocs.js
//IMPORT REQUIRED MODULES AND PACKAGES
import React, { useCallback, useEffect, useRef, useState } from 'react'
// IMPORT CSS STYLESHEETS
import '../css/componentCss/ListLayout.css'
import '../css/componentCss/ListTables.css'
import '../css/componentCss/ListBtns.css'
import '../css/componentCss/Trash.css'
// IMPORT BOOTSTRAP COMPONENTS
import Button from 'react-bootstrap/Button';
// IMPORT COMPONENTS
import Pagination, { PAGE_SIZES } from './Pagination';
// IMPORT UTILITY FUNCTIONS
import { languageName } from '../util/languageFunc';
import { ARCHIVE_DAYS, PURGE_DAYS, archiveDaysLeft, daysLeft, formatDaysLeft, urgentStyle } from '../util/listUtilFunc';
// IMPORT ICONS FROM LUCIDE-REACT
import { ArchiveRestore, Trash2Icon, TrashIcon } from 'lucide-react';

/* Every request this table makes, keyed by the row's status.
  - restore: archived → main list, trashed → main list
  - remove:  archived → trash (soft), trashed → gone (permanent) */
const ACTIONS = {
    archived: {
        restore: (id) => ({ url: `/archive/document/${id}/restore`, method: 'PATCH' }),
        remove: (id) => ({ url: `/archive/document/${id}`, method: 'DELETE' }),
    },
    trash: {
        restore: (id) => ({ url: `/document/${id}/restore`, method: 'PATCH' }),
        remove: (id) => ({ url: `/document/${id}/permanent`, method: 'DELETE' }),
    },
}

// TrashArchiveDocs function component
/* Table displaying the user's archived and trashed document translations.
Archived rows are all shown first; trashed rows follow, one page at a time.
GET /archive/fetchDocuments, PATCH /archive/document/:id/restore, DELETE /archive/document/:id,
GET /document/trash, PATCH /document/:id/restore, DELETE /document/:id/permanent */
export default function TrashArchiveDocs() {
  //=========STATE VARIABLES==========
  const [archived, setArchived] = useState([])// All archived document translations (the archive list isn't paged)
  const [trashed, setTrashed] = useState([])// The current page of trashed document translations
  const [pagination, setPagination] = useState({ page: 1, limit: PAGE_SIZES[0], total: 0, totalPages: 1 })// Trash paging
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(PAGE_SIZES[0])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [actionId, setActionId] = useState(null)// Id of the row a restore/delete request is running for
  const latestRequest = useRef(0)// Id of the most recent fetch, used to ignore stale responses

  // One list for the table: archived rows first, then this page of trashed rows
  const rows = [
    ...archived.map((doc) => ({ ...doc, status: 'archived' })),
    ...trashed.map((doc) => ({ ...doc, status: 'trash' })),
  ]
  // Trashed rows carry their numbering on across pages, after the archived rows
  const rowNumber = (row, index) => (
    row.status === 'archived'
      ? index + 1
      : archived.length + (pagination.page - 1) * pagination.limit + (index - archived.length) + 1
  )

  //========FETCH ARCHIVED + TRASHED DOCUMENTS REQUEST===============
  const fetchDocs = useCallback(async () => {
    // Only the newest request updates the table (a slow earlier page can't overwrite it)
    const requestId = ++latestRequest.current
    const isStale = () => requestId !== latestRequest.current
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) })
      // Both lists are independent, so they're fetched at the same time
      // The trash request also applies the 60-day archive rule, so it runs alongside rather than after
      const [archiveResponse, trashResponse] = await Promise.all([
        fetch('/archive/fetchDocuments', { method: 'GET', credentials: 'include' }),
        fetch(`/document/trash?${params.toString()}`, { method: 'GET', credentials: 'include' }),
      ])
      const [archiveData, trashData] = await Promise.all([
        archiveResponse.json().catch(() => ({})),
        trashResponse.json().catch(() => ({})),
      ])
      if (isStale()) return// A newer request has replaced this one
      if (!archiveResponse.ok) throw new Error(archiveData.message || 'Failed to fetch archived documents')
      if (!trashResponse.ok) throw new Error(trashData.message || 'Failed to fetch trashed documents')

      setArchived(Array.isArray(archiveData.documents) ? archiveData.documents : [])
      setTrashed(Array.isArray(trashData.documents) ? trashData.documents : [])
      if (trashData.pagination) {
        setPagination(trashData.pagination)
        // A restore/delete can empty the last page; step back to the new last page
        const lastPage = Math.max(trashData.pagination.totalPages || 1, 1)
        if (page > lastPage) setPage(lastPage)
      }
    } catch (error) {
      if (isStale()) return
      console.error('[ERROR: TrashArchiveDocs.js] Fetching archived/trashed documents failed:', error.message)
      setError('An error occurred while loading your archived and deleted documents.')
    } finally {
      if (!isStale()) setLoading(false)
    }
  }, [page, limit])

  // Fetch when the table is opened (it mounts each time the toggle is clicked) and when the page changes
  useEffect(() => {
    fetchDocs()
  }, [fetchDocs])

  /* Shared request runner for the RESTORE and DELETE buttons.
  Re-fetches on success so moved rows change status (archive → trash) and the page refills */
  const runAction = useCallback(async (id, { url, method }, fallbackMessage) => {
    setError(null)
    setActionId(id)
    try {
      const response = await fetch(url, { method, credentials: 'include' })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(data.message || fallbackMessage)
        // 404 means the row already moved (e.g. in another tab); resync the table
        if (response.status === 404) fetchDocs()
        return false
      }
      await fetchDocs()
      return true
    } catch (error) {
      console.error(`[ERROR: TrashArchiveDocs.js] ${fallbackMessage}`, error)
      setError(fallbackMessage)
      return false
    } finally {
      setActionId(null)
    }
  }, [fetchDocs])

  //========RESTORE REQUEST===============
  // Moves the document translation back to the main document list (from the archive or the trash)
  const handleRestore = async (row) => {
    const confirmRestore = window.confirm(`Restore "${row.fileName}" to your document translations?`)
    if (!confirmRestore) return
    const success = await runAction(row._id, ACTIONS[row.status].restore(row._id), 'Error restoring the document translation.')
    if (success) alert('Document translation successfully restored')
  }

  //========DELETE REQUEST===============
  // Archived: moves it to the trash. Trashed: deletes it permanently
  const handleDelete = async (row) => {
    const isTrash = row.status === 'trash'
    const confirmDelete = window.confirm(
      isTrash
        ? `Are you sure you want to permanently delete "${row.fileName}"?\nThis cannot be undone.`
        : `Are you sure you want to move "${row.fileName}" to trash?`
    )
    if (!confirmDelete) return
    const success = await runAction(
      row._id,
      ACTIONS[row.status].remove(row._id),
      isTrash ? 'Error deleting the document translation.' : 'Error moving the document translation to trash.'
    )
    if (success) alert(isTrash ? 'Document translation permanently deleted' : 'Document translation moved to trash')
  }

  //=======================JSX RENDERING=======================================
  return (
    <div id='trashArchiveDocsList'>
        {error && <p className='text-danger' role='alert'>{error}</p>}
        <div id='documentTrashWrapper'>
            <table id='documentTrashTable'>
                <thead>
                    <tr>
                        <th colSpan={6}>ARCHIVED &amp; DELETED DOCUMENT TRANSLATIONS</th>
                    </tr>
                    <tr>
                        <th>#</th>
                        <th>DOCUMENT NAME</th>
                        <th>SOURCE LANGUAGE</th>
                        <th>TARGET LANGUAGE</th>
                        <th>STATUS</th>
                        <th>{/* RESTORE + DELETE BUTTONS */}</th>
                    </tr>
                </thead>
                <tbody>
                    {loading && rows.length === 0 ? (
                        <tr>
                            <td colSpan={6}>LOADING DOCUMENTS...</td>
                        </tr>
                    ) : rows.length === 0 ? (
                        <tr>
                            <td colSpan={6}>NO ARCHIVED OR DELETED DOCUMENTS</td>
                        </tr>
                    ) : (
                        rows.map((row, index) => {
                            const isTrash = row.status === 'trash'
                            // Archived: days until the 60-day move to trash. Trashed: days until the 30-day purge
                            const remaining = isTrash ? daysLeft(row.deletedAt) : archiveDaysLeft(row)
                            const number = rowNumber(row, index)
                            return (
                            <tr key={`${row.status}-${row._id}`}>
                                <td>{number}</td>
                                <td>{row.fileName}</td>
                                <td>{languageName(row.sourceLanguage)}</td>
                                <td>{languageName(row.targetLanguage)}</td>
                                {/* display document status */}
                                <td>
                                    {isTrash ? 'TRASH' : 'ARCHIVED'}
                                    {remaining !== null && (
                                        <><br/><small style={urgentStyle(remaining)}>
                                            ({formatDaysLeft(remaining)} {isTrash ? 'LEFT' : 'UNTIL TRASH'})
                                        </small></>
                                    )}
                                </td>
                                <td>
                                    <div className={isTrash ? 'trashTableBtns' : 'archiveTableBtns'}>
                                        <Button
                                        variant='light'
                                        className='restoreNoteBtn'
                                        type='button'
                                        onClick={() => handleRestore(row)}
                                        disabled={actionId !== null}
                                        // ARIA ATTRIBUTES:
                                        aria-label={`Restore document translation ${number}`}
                                        >
                                            RESTORE <ArchiveRestore aria-hidden='true' focusable='false'/>
                                        </Button>
                                        {/* Permanent delete if the status is trash */}
                                        <Button
                                        variant='danger'
                                        className={isTrash ? 'permanentDeleteBtn' : 'deleteArchiveNoteBtn'}
                                        type='button'
                                        onClick={() => handleDelete(row)}
                                        disabled={actionId !== null}
                                        // ARIA ATTRIBUTES:
                                        aria-label={isTrash
                                            ? `Permanently delete document translation ${number}`
                                            : `Move document translation ${number} to trash`}
                                        >
                                            DELETE{isTrash
                                                ? <Trash2Icon aria-hidden='true' focusable='false'/>
                                                : <TrashIcon aria-hidden='true' focusable='false'/>}
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
                            {/* PAGINATION (Pagination.js): pages through the trashed rows */}
                            <Pagination
                                page={pagination.page}
                                totalPages={pagination.totalPages}
                                total={pagination.total}
                                limit={limit}
                                setPage={setPage}
                                setLimit={setLimit}
                                loading={loading}
                                controlId='trashArchiveDocsPageSize'
                            />
                        </td>
                    </tr>
                    <tr>
                        <td colSpan={6}>RESTORE TO VIEW DETAILS</td>
                    </tr>
                    <tr>
                        <td colSpan={6}>
                        <i style={{color: "#B82C3A", fontWeight: "800"}}>ARCHIVED DOCUMENTS ARE MOVED TO TRASH {ARCHIVE_DAYS} DAYS AFTER BEING ARCHIVED.</i></td>
                    </tr>
                    <tr>
                      <td colSpan={6}><i style={{color: "#B82C3A", fontWeight: "800"}}>DOCUMENTS ARE PERMANENTLY DELETED {PURGE_DAYS} DAYS AFTER BEING MOVED TO TRASH</i></td>
                    </tr>
                </tfoot>
            </table>
        </div>
    </div>
  )
}
