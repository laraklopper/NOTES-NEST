//TrashedTranslations.js
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
import { formatTimestamp } from '../util/dateFunctions';
import { languageName } from '../util/languageFunc';
import { PURGE_DAYS, daysLeft, formatDaysLeft, urgentStyle } from '../util/listUtilFunc';
// IMPORT ICONS FROM LUCIDE-REACT
import { ArchiveRestore, ArchiveX, Trash2Icon } from 'lucide-react';

// Shortens long source text for the table cells
const preview = (text = '', max = 60) => (text.length > max ? `${text.slice(0, max)}…` : text)

// TrashedTranslations Function component
/* Table of the user's trashed translations
GET /translation/trash, PATCH /translation/:id/restore, DELETE /translation/:id/permanent */
export default function TrashedTranslations() {
  //=========STATE VARIABLES==========
  const [translations, setTranslations] = useState([])// The user's trashed translations
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [actionId, setActionId] = useState(null)// Id of the translation a restore/delete request is running for
  const [pagination, setPagination] = useState({ page: 1, limit: PAGE_SIZES[0], total: 0, totalPages: 1 })
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(PAGE_SIZES[0])
  const latestRequest = useRef(0)// Id of the most recent fetch, used to ignore stale responses
  const rowNumber = (index) => (pagination.page - 1) * pagination.limit + index + 1// Numbering carries on across pages

  //========FETCH TRASHED TRANSLATIONS REQUEST===============
  const fetchTrash = useCallback(async () => {
    // Only the newest request updates the table (a slow earlier page can't overwrite it)
    const requestId = ++latestRequest.current
    const isStale = () => requestId !== latestRequest.current
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) })
      // The browser sends the JWT cookie with the request
      const response = await fetch(`/translation/trash?${params.toString()}`, { method: 'GET', credentials: 'include' })
      const data = await response.json().catch(() => ({}))
      if (isStale()) return// A newer request has replaced this one
      if (!response.ok) throw new Error(data.message || 'Failed to fetch trashed translations')
      setTranslations(Array.isArray(data.translations) ? data.translations : [])
      if (data.pagination) {
        setPagination(data.pagination)
        // A restore/delete can empty the last page; step back to the new last page
        const lastPage = Math.max(data.pagination.totalPages || 1, 1)
        if (page > lastPage) setPage(lastPage)
      }
    } catch (error) {
      if (isStale()) return
      console.error('[ERROR: TrashedTranslations.js] Fetching trashed translations failed:', error.message)
      setError('An error occurred while loading your deleted translations.')
    } finally {
      if (!isStale()) setLoading(false)
    }
  }, [page, limit])

  // Fetch when the trash list is opened (it mounts each time SHOW TRASH is clicked) and when the page changes
  useEffect(() => {
    fetchTrash()
  }, [fetchTrash])

  /* Shared request runner for the restore and delete buttons.
  Removes the translation from the table on success, then re-fetches so the
  page is refilled from the next one and the totals stay correct */
  const runTrashAction = useCallback(async (id, url, method, fallbackMessage) => {
    setError(null)
    setActionId(id)
    try {
      const response = await fetch(url, { method, credentials: 'include' })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(data.message || fallbackMessage)
        // 404 means the translation already left the trash (e.g. in another tab); resync the table
        if (response.status === 404) fetchTrash()
        return false
      }
      setTranslations((prev) => prev.filter((translation) => translation._id !== id))
      fetchTrash()
      return true
    } catch (error) {
      console.error(`[ERROR: TrashedTranslations.js] ${fallbackMessage}`, error)
      setError(fallbackMessage)
      return false
    } finally {
      setActionId(null)
    }
  }, [fetchTrash])

  //========RESTORE TRANSLATION REQUEST===============
  // Moves the translation back to the main translations list
  const handleRestore = async (translation) => {
    const success = await runTrashAction(translation._id, `/translation/${translation._id}/restore`, 'PATCH', 'Error restoring translation.')
    if (success) alert('Translation successfully restored')
  }

  //========PERMANENTLY DELETE TRANSLATION REQUEST===============
  const handleDelete = async (translation) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to permanently delete "${preview(translation.sourceText, 30)}"?\nThis cannot be undone.`
    )
    if (!confirmDelete) return
    const success = await runTrashAction(translation._id, `/translation/${translation._id}/permanent`, 'DELETE', 'Error deleting translation.')
    if (success) alert('Translation permanently deleted')
  }

  //=======================JSX RENDERING=======================================
  return (
    <div id='deletedTranslationList'>
      {error && <p className='text-danger' role='alert'>{error}</p>}
      <div id='deletedTranslateWrapper'>
        <table id='trashTable'>
          <thead>
            <tr>
              <th colSpan={6}>
                <p className='tableHeading'>DELETED TRANSLATIONS<ArchiveX aria-hidden='true' focusable='false'/></p>
              </th>
            </tr>
            <tr>
              <th>#</th>
              <th>SOURCE TEXT</th>
              <th>SOURCE LANGUAGE</th>
              <th>TARGET LANGUAGE</th>
              <th>DELETED ON</th>
              <th>{/* RESTORE + DELETE BUTTONS */}</th>
            </tr>
          </thead>
          <tbody>
            {loading && translations.length === 0 ? (
              <tr>
                <td colSpan={6}>LOADING DELETED TRANSLATIONS...</td>
              </tr>
            ) : translations.length === 0 ? (
              <tr>
                <td colSpan={6}>TRASH IS EMPTY</td>
              </tr>
            ) : (
              translations.map((translation, index) => {
                const remaining = daysLeft(translation.deletedAt)
                return (
                  <tr key={translation._id}>
                    <td>{rowNumber(index)}</td>
                    <td>{preview(translation.sourceText)}</td>
                    <td>{languageName(translation.sourceLanguage)}</td>
                    <td>{languageName(translation.targetLanguage)}</td>
                    <td>
                      {formatTimestamp(translation.deletedAt)}
                      {/* 30-day purge: red when a week or less is left */}
                      {remaining !== null && <><br/><small style={urgentStyle(remaining)}>({formatDaysLeft(remaining)} LEFT)</small></>}
                    </td>
                    <td>
                      <div className='trashTableBtns'>
                        <Button
                          variant='light'
                          className='restoreNoteBtn'
                          type='button'
                          onClick={() => handleRestore(translation)}
                          disabled={actionId !== null}
                          // ARIA ATTRIBUTES:
                          aria-label={`Restore translation ${rowNumber(index)}`}
                        >
                          RESTORE <ArchiveRestore aria-hidden='true' focusable='false'/>
                        </Button>
                        <Button
                          variant='danger'
                          className='permanentDeleteBtn'
                          type='button'
                          onClick={() => handleDelete(translation)}
                          disabled={actionId !== null}
                          // ARIA ATTRIBUTES:
                          aria-label={`Permanently delete translation ${rowNumber(index)}`}
                        >
                          DELETE<Trash2Icon aria-hidden='true' focusable='false'/>
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
                  controlId='trashedTranslationPageSize'
                />
              </td>
            </tr>
            <tr>
              <td colSpan={6}><i style={{color: "#B82C3A", fontWeight: "800"}}>TRANSLATIONS ARE PERMANENTLY DELETED {PURGE_DAYS} DAYS AFTER BEING MOVED TO TRASH</i></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
