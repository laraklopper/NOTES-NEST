//ArchivedTranslations.js
//IMPORT REQUIRED MODULES AND PACKAGES
import React, { useCallback, useEffect, useRef, useState } from 'react'
// IMPORT CSS STYLESHEETS
import '../css/componentCss/ListTables.css'
import '../css/componentCss/ListLayout.css'
import '../css/componentCss/ListBtns.css'
import '../css/componentCss/Trash.css'
// IMPORT BOOTSTRAP COMPONENTS
import Button from 'react-bootstrap/Button';
// IMPORT COMPONENTS
import Pagination, { PAGE_SIZES } from './Pagination';
// IMPORT UTILITY FUNCTIONS
import { languageName } from '../util/languageFunc';
import { formatTimestamp } from '../util/dateFunctions'
import { ARCHIVE_DAYS, PURGE_DAYS, archiveDaysLeft, daysLeft, formatDaysLeft, urgentStyle } from '../util/listUtilFunc';
// IMPORT ICONS FROM LUCIDE-REACT
import { ArchiveIcon, ArchiveRestoreIcon, Trash2Icon, TrashIcon } from 'lucide-react'

// Shortens long source text for the table cells
const preview = (text = '', max = 60) => (text.length > max ? `${text.slice(0, max)}…` : text)

/* Every request this table makes, keyed by the row's status.
  - restore: archived → main list, trashed → main list
  - remove:  archived → trash (soft), trashed → gone (permanent) */
const ACTIONS = {
  archived: {
    restore: (id) => ({ url: `/archive/translation/${id}/restore`, method: 'PATCH' }),
    remove: (id) => ({ url: `/archive/translation/${id}`, method: 'DELETE' }),
  },
  trash: {
    restore: (id) => ({ url: `/translation/${id}/restore`, method: 'PATCH' }),
    remove: (id) => ({ url: `/translation/${id}/permanent`, method: 'DELETE' }),
  },
}

// Archived and trashed text Translations component
/* Table of the user's archived and trashed text translations.
Archived rows are all shown first; trashed rows follow, one page at a time.
GET /archive/fetchTranslations, PATCH /archive/translation/:id/restore, DELETE /archive/translation/:id
GET /translation/trash, PATCH /translation/:id/restore, DELETE /translation/:id/permanent
*/
export default function ArchivedTranslations() {
  //=========STATE VARIABLES==========
  const [archived, setArchived] = useState([])// All archived translations (the archive list isn't paged)
  const [trashed, setTrashed] = useState([])// The current page of trashed translations
  const [pagination, setPagination] = useState({ page: 1, limit: PAGE_SIZES[0], total: 0, totalPages: 1 })// Trash paging
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(PAGE_SIZES[0])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [actionId, setActionId] = useState(null)// Id of the translation a restore/delete request is running for
  const latestRequest = useRef(0)// Id of the most recent fetch, used to ignore stale responses

  // One list for the table: archived rows first, then this page of trashed rows
  const rows = [
    ...archived.map((translation) => ({ ...translation, status: 'archived' })),
    ...trashed.map((translation) => ({ ...translation, status: 'trash' })),
  ]
  // Trashed rows carry their numbering on across pages, after the archived rows
  const rowNumber = (row, index) => (
    row.status === 'archived'
      ? index + 1
      : archived.length + (pagination.page - 1) * pagination.limit + (index - archived.length) + 1
  )

  //========FETCH ARCHIVED + TRASHED TRANSLATIONS REQUEST===============
  const fetchTranslations = useCallback(async () => {
    // Only the newest request updates the table (a slow earlier page can't overwrite it)
    const requestId = ++latestRequest.current
    const isStale = () => requestId !== latestRequest.current
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) })
      // Both lists are independent, so they're fetched at the same time
      // The browser sends the JWT cookie with the requests
      const [archiveResponse, trashResponse] = await Promise.all([
        fetch('/archive/fetchTranslations', { method: 'GET', credentials: 'include' }),
        fetch(`/translation/trash?${params.toString()}`, { method: 'GET', credentials: 'include' }),
      ])
      const [archiveData, trashData] = await Promise.all([
        archiveResponse.json().catch(() => ({})),
        trashResponse.json().catch(() => ({})),
      ])
      if (isStale()) return// A newer request has replaced this one
      if (!archiveResponse.ok) throw new Error(archiveData.message || 'Failed to fetch archived translations')
      if (!trashResponse.ok) throw new Error(trashData.message || 'Failed to fetch trashed translations')

      setArchived(Array.isArray(archiveData.translations) ? archiveData.translations : [])
      setTrashed(Array.isArray(trashData.translations) ? trashData.translations : [])
      if (trashData.pagination) {
        setPagination(trashData.pagination)
        // A restore/delete can empty the last page; step back to the new last page
        const lastPage = Math.max(trashData.pagination.totalPages || 1, 1)
        if (page > lastPage) setPage(lastPage)
      }
    } catch (error) {
      if (isStale()) return
      console.error('[ERROR: ArchivedTranslations.js] Fetching archived/trashed translations failed:', error.message)
      setError('An error occurred while loading your archived and deleted translations.')
    } finally {
      if (!isStale()) setLoading(false)
    }
  }, [page, limit])

  // Fetch when the table is opened (it mounts each time the toggle is clicked) and when the page changes
  useEffect(() => {
    fetchTranslations()
  }, [fetchTranslations])

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
        // 404 means the translation already moved (e.g. in another tab); resync the table
        if (response.status === 404) fetchTranslations()
        return false
      }
      await fetchTranslations()
      return true
    } catch (error) {
      console.error(`[ERROR: ArchivedTranslations.js] ${fallbackMessage}`, error)
      setError(fallbackMessage)
      return false
    } finally {
      setActionId(null)
    }
  }, [fetchTranslations])

  //========RESTORE TRANSLATION REQUEST===============
  // Moves the translation back to the main translations list (from the archive or the trash)
  const handleRestore = async (row) => {
    const confirmRestore = window.confirm(`Restore "${preview(row.sourceText, 30)}" to your translations?`)
    if (!confirmRestore) return
    const success = await runAction(row._id, ACTIONS[row.status].restore(row._id), 'Error restoring translation.')
    if (success) alert('Translation successfully restored')
  }

  //========DELETE TRANSLATION REQUEST===============
  // Archived: moves it to the trash. Trashed: deletes it permanently
  const handleDelete = async (row) => {
    const isTrash = row.status === 'trash'
    const confirmDelete = window.confirm(
      isTrash
        ? `Are you sure you want to permanently delete "${preview(row.sourceText, 30)}"?\nThis cannot be undone.`
        : `Are you sure you want to move "${preview(row.sourceText, 30)}" to trash?`
    )
    if (!confirmDelete) return
    const success = await runAction(
      row._id,
      ACTIONS[row.status].remove(row._id),
      isTrash ? 'Error deleting translation.' : 'Error moving translation to trash.'
    )
    if (success) alert(isTrash ? 'Translation permanently deleted' : 'Translation successfully moved to trash')
  }

  //=======================JSX RENDERING=======================================
  return (
    <div id='archiveTableWrapper'>
      {error && <p className='text-danger' role='alert'>{error}</p>}
      <table id='archiveTable'>
        <thead>
          <tr>
            <th colSpan={6}>
              <p className='tableHeading'>ARCHIVED &amp; DELETED TRANSLATIONS<ArchiveIcon aria-hidden='true' focusable='false'/></p>
            </th>
          </tr>
          <tr>
            <th>#</th>
            <th>SOURCE TEXT</th>
            <th>SOURCE LANGUAGE</th>
            <th>TARGET LANGUAGE</th>
            <th>STATUS</th>
            {/* RESTORE + DELETE BUTTONS */}
            <th></th>
          </tr>
        </thead>
        <tbody>
          {loading && rows.length === 0 ? (
            <tr>
              <td colSpan={6}>LOADING TRANSLATIONS...</td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={6}>NO ARCHIVED OR DELETED TRANSLATIONS</td>
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
                <td>{preview(row.sourceText)}</td>
                <td>{languageName(row.sourceLanguage)}</td>
                <td>{languageName(row.targetLanguage)}</td>
                {/* STATUS: red when a week or less is left */}
                <td style={{ width: '260px' }}>
                  {isTrash ? (
                    <span>
                      <p>TRASH</p>
                      <p>DELETED ON</p>
                      <p>{formatTimestamp(row.deletedAt)}</p>
                      {remaining !== null && <p><small style={urgentStyle(remaining)}>({formatDaysLeft(remaining)} LEFT)</small></p>}
                    </span>
                  ) : (
                    <span>
                      <p>ARCHIVED</p>
                      <p>MOVES TO TRASH IN</p>
                      <p style={urgentStyle(remaining)}>{formatDaysLeft(remaining)}</p>
                    </span>
                  )}
                </td>
                <td style={{ width: '260px' }}>
                  <div className={isTrash ? 'trashTableBtns' : 'archiveTableBtns'}>
                    <Button
                      variant='light'
                      className='restoreNoteBtn'
                      type='button'
                      onClick={() => handleRestore(row)}
                      disabled={actionId !== null}
                      // ARIA ATTRIBUTES:
                      aria-label={`Restore translation ${number}`}
                    >
                      <ArchiveRestoreIcon aria-hidden='true' focusable='false'/> RESTORE
                    </Button>
                    {/* Permanent delete if the status is trash */}
                    <Button
                      variant='danger'
                      className={isTrash ? 'permanentDeleteBtn' : 'deleteArchiveNoteBtn'}
                      type='button'
                      onClick={() => handleDelete(row)}
                      disabled={actionId !== null}
                      // ARIA ATTRIBUTES:
                      aria-label={isTrash ? `Permanently delete translation ${number}` : `Move translation ${number} to trash`}
                    >
                      {isTrash
                        ? <Trash2Icon aria-hidden='true' focusable='false'/>
                        : <TrashIcon aria-hidden='true' focusable='false'/>}DELETE
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
                controlId='archivedTranslationPageSize'
              />
            </td>
          </tr>
          <tr>
            <td colSpan={6}>RESTORE TO VIEW TRANSLATION DETAILS</td>
          </tr>
          <tr>
            <td colSpan={6}><i style={{color: "#B82C3A", fontWeight: "800"}}>ARCHIVED TRANSLATIONS ARE MOVED TO TRASH {ARCHIVE_DAYS} DAYS AFTER BEING ARCHIVED</i></td>
          </tr>
          <tr>
            <td colSpan={6}><i style={{color: "#B82C3A", fontWeight: "800"}}>TRANSLATIONS ARE PERMANENTLY DELETED {PURGE_DAYS} DAYS AFTER BEING MOVED TO TRASH</i></td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
