//ArchivedTranslations.js
//IMPORT REQUIRED MODULES AND PACKAGES
import React, { useCallback, useEffect, useState } from 'react'
// IMPORT CSS STYLESHEETS
import '../css/componentCss/ListTables.css'
import '../css/componentCss/ListLayout.css'
import '../css/componentCss/ListBtns.css'
import '../css/componentCss/Trash.css'
// IMPORT BOOTSTRAP COMPONENTS
import Button from 'react-bootstrap/Button';
// IMPORT UTILITY FUNCTIONS
import { languageName } from '../util/languageFunc';
// IMPORT ICONS FROM LUCIDE-REACT
import { ArchiveIcon, ArchiveRestoreIcon, TrashIcon } from 'lucide-react'

// Shortens long source text for the table cells
const preview = (text = '', max = 60) => (text.length > max ? `${text.slice(0, max)}…` : text)

// ArchivedTranslations component
/* Table of the user's archived translations
GET /archive/fetchTranslations, PATCH /archive/translation/:id/restore, DELETE /archive/translation/:id */
export default function ArchivedTranslations() {
  //=========STATE VARIABLES==========
  const [translations, setTranslations] = useState([])// The user's archived translations
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [actionId, setActionId] = useState(null)// Id of the translation a restore/delete request is running for

  //========FETCH ARCHIVED TRANSLATIONS REQUEST===============
  const fetchArchivedTranslations = useCallback(async () => {
    setLoading(true)
    try {
      // The browser sends the JWT cookie with the request
      const response = await fetch('/archive/fetchTranslations', { method: 'GET', credentials: 'include' })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.message || 'Failed to fetch archived translations')
      setTranslations(Array.isArray(data.translations) ? data.translations : [])
    } catch (error) {
      console.error('[ERROR: ArchivedTranslations.js] Fetching archived translations failed:', error.message)
      setError('An error occurred while loading your archived translations.')
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch when the archive list is opened (it mounts each time SHOW ARCHIVE is clicked)
  useEffect(() => {
    fetchArchivedTranslations()
  }, [fetchArchivedTranslations])

  /* Shared request runner for the restore and delete buttons.
  Removes the translation from the table on success */
  const runArchiveAction = useCallback(async (id, url, method, fallbackMessage) => {
    setError(null)
    setActionId(id)
    try {
      const response = await fetch(url, { method, credentials: 'include' })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(data.message || fallbackMessage)
        // 404 means the translation already left the archive (e.g. in another tab); resync the table
        if (response.status === 404) fetchArchivedTranslations()
        return false
      }
      setTranslations((prev) => prev.filter((translation) => translation._id !== id))
      return true
    } catch (error) {
      console.error(`[ERROR: ArchivedTranslations.js] ${fallbackMessage}`, error)
      setError(fallbackMessage)
      return false
    } finally {
      setActionId(null)
    }
  }, [fetchArchivedTranslations])

  //========RESTORE TRANSLATION REQUEST===============
  // Moves the translation back to the main translations list
  const handleRestore = async (translation) => {
    const confirmRestore = window.confirm(`Restore "${preview(translation.sourceText, 30)}" to your translations?`)
    if (!confirmRestore) return
    const success = await runArchiveAction(translation._id, `/archive/translation/${translation._id}/restore`, 'PATCH', 'Error restoring translation.')
    if (success) alert('Translation successfully restored')
  }

  //========MOVE ARCHIVED TRANSLATION TO TRASH REQUEST===============
  const handleDelete = async (translation) => {
    const confirmDelete = window.confirm(`Are you sure you want to move "${preview(translation.sourceText, 30)}" to trash?`)
    if (!confirmDelete) return
    const success = await runArchiveAction(translation._id, `/archive/translation/${translation._id}`, 'DELETE', 'Error moving translation to trash.')
    if (success) alert('Translation successfully moved to trash')
  }

  //=======================JSX RENDERING=======================================
  return (
    <div id='archiveTableWrapper'>
      {error && <p className='text-danger' role='alert'>{error}</p>}
      <table id='archiveTable'>
        <thead>
          <tr>
            <th colSpan={5}>
              <p className='tableHeading'>ARCHIVED TRANSLATIONS<ArchiveIcon aria-hidden='true' focusable='false'/></p>
            </th>
          </tr>
          <tr>
            <th>#</th>
            <th>SOURCE TEXT</th>
            <th>SOURCE LANGUAGE</th>
            <th>TARGET LANGUAGE</th>
            {/* RESTORE + DELETE BUTTONS */}
            <th></th>
          </tr>
        </thead>
        <tbody>
          {loading && translations.length === 0 ? (
            <tr>
              <td colSpan={5}>LOADING ARCHIVED TRANSLATIONS...</td>
            </tr>
          ) : translations.length === 0 ? (
            <tr>
              <td colSpan={5}>NO ARCHIVED TRANSLATIONS</td>
            </tr>
          ) : (
            translations.map((translation, index) => (
              <tr key={translation._id}>
                <td>{index + 1}</td>
                <td>{preview(translation.sourceText)}</td>
                <td>{languageName(translation.sourceLanguage)}</td>
                <td>{languageName(translation.targetLanguage)}</td>
                <td style={{ width: '260px' }}>
                  <div className='archiveTableBtns'>
                    <Button
                      variant='light'
                      className='restoreNoteBtn'
                      type='button'
                      onClick={() => handleRestore(translation)}
                      disabled={actionId !== null}
                      // ARIA ATTRIBUTES:
                      aria-label={`Restore translation ${index + 1}`}
                    >
                      <ArchiveRestoreIcon aria-hidden='true' focusable='false'/> RESTORE
                    </Button>
                    <Button
                      variant='danger'
                      className='deleteArchiveNoteBtn'
                      type='button'
                      onClick={() => handleDelete(translation)}
                      disabled={actionId !== null}
                      // ARIA ATTRIBUTES:
                      aria-label={`Move translation ${index + 1} to trash`}
                    >
                      <TrashIcon aria-hidden='true' focusable='false'/>DELETE
                    </Button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={5}>RESTORE TO VIEW TRANSLATION DETAILS</td>
          </tr>
          <tr>
            <td colSpan={5}><i style={{color: "#B82C3A", fontWeight: "800"}}>ARCHIVED TRANSLATIONS WILL BE MOVED TO TRASH IN 60 DAYS</i></td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
