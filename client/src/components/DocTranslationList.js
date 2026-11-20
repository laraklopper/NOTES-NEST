//DocTranslationList.js
//IMPORT REQUIRED MODULES AND PACKAGES
import React, { useCallback, useEffect, useRef, useState } from 'react'
// IMPORT CSS STYLESHEETS
import '../css/componentCss/ListTables.css'
import '../css/componentCss/ListLayout.css'
import '../css/componentCss/ListBtns.css'
import '../css/componentCss/DetailsPanals.css'
// IMPORT BOOTSTRAP COMPONENTS
import Stack from 'react-bootstrap/Stack';
import Button from 'react-bootstrap/Button';
// IMPORT COMPONENTS
import Pagination, { PAGE_SIZES } from './Pagination';
// IMPORT UTILITY FUNCTIONS
import { languageName } from '../util/languageFunc';
import { dateDisplay } from '../util/dateFunctions';
import { downloadName } from '../util/formUtil';
// IMPORT ICONS FROM LUCIDE-REACT
import { Archive, ArrowRight, Copy, Download, ScrollText, Trash2, X } from 'lucide-react';

// DocTranslationList function component
/* Table of the user's saved document translations, with a details panal for the selected one
GET /document/fetchDocuments, GET /document/fetchDoc/:id,
PATCH /archive/document/:id (archive), DELETE /document/:id (move to trash) */
export default function DocTranslationList() {
    /*======STATE VARIABLES=============== */
    const [documents, setDocuments] = useState([])// The current page of document translations (text omitted)
    const [pagination, setPagination] = useState({ page: 1, limit: PAGE_SIZES[0], total: 0, totalPages: 1 })
    const [page, setPage] = useState(1)
    const [limit, setLimit] = useState(PAGE_SIZES[0])
    const [selectedId, setSelectedId] = useState(null)// Id of the row the panal is open for
    const [selected, setSelected] = useState(null)// The full document translation from GET /fetchDoc/:id
    const [loading, setLoading] = useState(true)// State variable to indicate the list is still being fetched
    const [loadingDoc, setLoadingDoc] = useState(false)// True while the panal's document is being fetched
    const [actionRunning, setActionRunning] = useState(false)// True while an archive/delete request is running
    const [error, setError] = useState('')//Global list error state
    const latestRequest = useRef(0)// Id of the most recent list fetch, used to ignore stale responses

    const rowNumber = (index) => (pagination.page - 1) * pagination.limit + index + 1// Numbering carries on across pages
    const selectedIndex = documents.findIndex((doc) => doc._id === selectedId)

    //========FETCH DOCUMENT TRANSLATIONS REQUEST===============
    const fetchDocuments = useCallback(async () => {
        // Only the newest request updates the table (a slow earlier page can't overwrite it)
        const requestId = ++latestRequest.current
        const isStale = () => requestId !== latestRequest.current
        setLoading(true)
        try {
            const params = new URLSearchParams({ page: String(page), limit: String(limit) })
            // The browser sends the JWT cookie with the request
            const response = await fetch(`/document/fetchDocuments?${params.toString()}`, {
                method: 'GET',
                credentials: 'include',
            })
            const data = await response.json().catch(() => ({}))
            if (isStale()) return// A newer request has replaced this one
            if (!response.ok) throw new Error(data?.message || 'Failed to load document translations')

            setDocuments(Array.isArray(data.documents) ? data.documents : [])
            if (data.pagination) {
                setPagination(data.pagination)
                // An archive/delete can empty the last page; step back to the new last page
                const lastPage = Math.max(data.pagination.totalPages || 1, 1)
                if (page > lastPage) setPage(lastPage)
            }
            console.log(`[SUCCESS: DocTranslationList.js] Fetched ${data.documents?.length || 0} document translations`)
        } catch (error) {
            if (isStale()) return
            console.error('[ERROR: DocTranslationList.js] Fetching document translations failed:', error.message)
            setError(error.message || 'Something went wrong while loading your document translations.')
        } finally {
            if (!isStale()) setLoading(false)
        }
    }, [page, limit])

    // Fetch when the list opens (it mounts each time SHOW DOCUMENTS is clicked) and when the page changes
    useEffect(() => {
        fetchDocuments()
    }, [fetchDocuments])

    //========FETCH ONE DOCUMENT TRANSLATION REQUEST===============
    /* The list leaves the text out, so the full row is fetched when VIEW is pressed.
    The AbortController cancels the previous request if another row is opened first */
    useEffect(() => {
        if (!selectedId) {
            setSelected(null)
            return
        }
        const controller = new AbortController()
        const fetchDocument = async () => {
            setError('')
            setLoadingDoc(true)
            setSelected(null)
            try {
                const response = await fetch(`/document/fetchDoc/${selectedId}`, {
                    method: 'GET',
                    credentials: 'include',
                    signal: controller.signal,
                })
                const data = await response.json().catch(() => ({}))
                if (!response.ok) throw new Error(data?.message || 'Failed to load the document translation')
                setSelected(data)
            } catch (error) {
                if (error.name === 'AbortError') return// Another row was opened, or the list closed
                console.error('[ERROR: DocTranslationList.js] Fetching document translation failed:', error.message)
                setError(error.message || 'Something went wrong while loading the document translation.')
                setSelectedId(null)
            } finally {
                if (!controller.signal.aborted) setLoadingDoc(false)
            }
        }
        fetchDocument()
        return () => controller.abort()
    }, [selectedId])

    const closePanal = useCallback(() => setSelectedId(null), [])

    /* Shared request runner for the ARCHIVE and DELETE buttons.
    Closes the panal and re-fetches so the row leaves the table and the page refills */
    const runPanalAction = useCallback(async (url, method, fallbackMessage) => {
        setError('')
        setActionRunning(true)
        try {
            const response = await fetch(url, { method, credentials: 'include' })
            const data = await response.json().catch(() => ({}))
            if (!response.ok) {
                // 404 means it already left the list (e.g. in another tab); resync the table
                if (response.status === 404) { closePanal(); fetchDocuments() }
                throw new Error(data?.message || fallbackMessage)
            }
            closePanal()
            await fetchDocuments()
            return true
        } catch (error) {
            console.error(`[ERROR: DocTranslationList.js] ${fallbackMessage}`, error.message)
            setError(error.message || fallbackMessage)
            return false
        } finally {
            setActionRunning(false)
        }
    }, [closePanal, fetchDocuments])

    //========ARCHIVE DOCUMENT TRANSLATION REQUEST===============
    // Hides the document translation from the list; it can be restored from DOCUMENT ARCHIVE/TRASH
    const handleArchive = async () => {
        if (!selected) return
        const confirmArchive = window.confirm(`Move "${selected.fileName}" to the archive?`)
        if (!confirmArchive) return
        const success = await runPanalAction(`/archive/document/${selected._id}`, 'PATCH', 'Error archiving the document translation.')
        if (success) alert('Document translation successfully archived')
    }

    //========DELETE (MOVE TO TRASH) REQUEST===============
    const handleDelete = async () => {
        if (!selected) return
        const confirmDelete = window.confirm(`Move "${selected.fileName}" to the trash?`)
        if (!confirmDelete) return
        const success = await runPanalAction(`/document/${selected._id}`, 'DELETE', 'Error moving the document translation to trash.')
        if (success) alert('Document translation moved to trash')
    }

    // Copy the translated text to the clipboard
    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(selected?.translatedText || '')
            alert('Translation copied to clipboard')
        } catch (error) {
            console.error('[ERROR: DocTranslationList.js] Copying translation failed:', error)
            setError('Could not copy the translation to the clipboard.')
        }
    }

    // Download the translated text as a .txt file named after the document (same as DocTranslator.js)
    const handleDownload = () => {
        if (!selected?.translatedText) return
        const blob = new Blob([selected.translatedText], { type: 'text/plain;charset=utf-8' })
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = downloadName(selected.fileName, selected.targetLanguage)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
    }

    //=======================JSX RENDERING=======================================
  return (
    <div id='translatedDocsList'>
      {error && <p className='text-danger' role='alert'>{error}</p>}
      <div id='docTranslationsWrapper'>
        <table id='documentTranslationsTable'>
            <thead>
                <tr>
                    <th colSpan={5}>DOCUMENT TRANSLATIONS:</th>
                </tr>
                <tr>
                    <th>#{/*INDEX*/}</th>
                    <th>DOCUMENT NAME</th>
                    <th>SOURCE LANGUAGE</th>
                    <th>TARGET LANGUAGE</th>
                    <th>{/*BUTTONS*/}</th>
                </tr>
            </thead>
            <tbody>
                {loading && documents.length === 0 ? (
                    <tr>
                        <td colSpan={5}>LOADING DOCUMENT TRANSLATIONS...</td>
                    </tr>
                ) : documents.length === 0 ? (
                    <tr>
                        <td colSpan={5}>NO DOCUMENT TRANSLATIONS YET</td>
                    </tr>
                ) : (
                    documents.map((doc, index) => (
                        <tr key={doc._id}>
                            <td>{rowNumber(index)}</td>
                            <td>{doc.fileName}</td>
                            <td>{languageName(doc.sourceLanguage)}</td>
                            <td>{languageName(doc.targetLanguage)}</td>
                            <td>
                                <Button
                                variant='light'
                                type='button'
                                onClick={() => setSelectedId(doc._id)}
                                // ARIA ATTRIBUTES:
                                aria-label={`View document translation ${rowNumber(index)}`}
                                aria-pressed={doc._id === selectedId}
                                >
                                    VIEW<ScrollText aria-hidden='true' focusable='false'/>
                                </Button>
                            </td>
                        </tr>
                    ))
                )}
            </tbody>
            <tfoot>
                <tr>
                    <td colSpan={5}>
                        {/* PAGINATION (Pagination.js) */}
                        <Pagination
                            page={pagination.page}
                            totalPages={pagination.totalPages}
                            total={pagination.total}
                            limit={limit}
                            setPage={setPage}
                            setLimit={setLimit}
                            onChange={closePanal}// Close the panal
                            loading={loading}
                            controlId='docTranslationPageSize'
                        />
                    </td>
                </tr>
            </tfoot>
        </table>
        </div>
        {/* DETAILS PANAL FOR THE SELECTED DOCUMENT TRANSLATION */}
        {selectedId && (
        <div id='documentPanal' role='group' aria-busy={loadingDoc}>
            <Stack direction="horizontal" gap={3} id='panalHeader'>
                <div className="p-2">
                    {selected && (
                        <h4 className='panalHeading'>
                            #{selectedIndex === -1 ? '' : rowNumber(selectedIndex)} {languageName(selected.sourceLanguage)}
                            <ArrowRight aria-label='to'/>
                            {languageName(selected.targetLanguage)}
                        </h4>
                    )}
                </div>
                <div className="p-2 ms-auto"/>
                <div className="vr" />
                <div className="p-2">
                    <Button
                    id='closePanalBtn'
                    variant='warning'
                    type='button'
                    onClick={closePanal}
                    // ARIA ATTRIBUTES:
                    aria-label='Close document translation details'
                    >
                        <X aria-hidden='true' focusable='false'/> CLOSE
                    </Button>
                </div>
            </Stack>
            {loadingDoc || !selected ? (
                <p className='p-2'>LOADING DOCUMENT TRANSLATION...</p>
            ) : (
            <>
            <div id='docPanalBody'>
                <Stack gap={3} id='docBodyStack1'>
                    <div className="p-2">
                        <span className='dataSpan'>
                            <p className='dataLabel'>DOCUMENT NAME:</p>
                            <p className='dataValue'>{selected.fileName}</p>
                        </span>
                    </div>
                    <div className="p-2">
                        <p className='dataLabel' id='docLanguageLabel'>LANGUAGES:</p>
                        <div className='dataGroup' id='docLanguageGroup' aria-labelledby='docLanguageLabel'>
                            <span>
                                <p className='dataLabel'>SOURCE LANGUAGE:</p>
                                <p className='dataValue'>{languageName(selected.sourceLanguage)}</p>
                            </span>
                            <span>
                                <p className='dataLabel'>TARGET LANGUAGE:</p>
                                <p className='dataValue'>{languageName(selected.targetLanguage)}</p>
                            </span>
                        </div>
                    </div>
                    <div className="p-2">
                        <span className='dataSpan'>
                            <p className='dataLabel'>DATE ADDED:</p>
                            <p className='dataValue'>{dateDisplay(selected.createdAt)}</p>
                        </span>
                    </div>
                </Stack>
                <Stack gap={3} id='docBodyStack2'>
                    <div className="p-2">
                        <span className='dataSpan'>
                            <p className='dataLabel'>{selected.pageCount} PAGE(S)</p>
                            <p className='dataValue'>{selected.characterCount} CHARACTERS</p>
                        </span>
                    </div>
                    <div className="p-2">
                        <span className='dataSpan'>
                            <p className='dataLabel'>TRANSLATED TEXT:</p>
                            <p className='dataValue' style={{ whiteSpace: 'pre-wrap' }}>{selected.translatedText}</p>
                        </span>
                    </div>
                </Stack>
            </div>
            <Stack direction="horizontal" gap={3} id='panalFooter'>
                <div className="p-2">
                    <Button
                    variant='light'
                    id='copyDocTranslationBtn'
                    type='button'
                    onClick={handleCopy}
                    // ARIA ATTRIBUTES:
                    aria-label='Copy translated text'
                    >
                        <Copy aria-hidden='true' focusable='false'/>COPY
                    </Button>
                </div>
                <div className="p-2">
                    <Button
                    variant='light'
                    id='downloadDocTranslationBtn'
                    type='button'
                    onClick={handleDownload}
                    // ARIA ATTRIBUTES:
                    aria-label='Download the translation as a text file'
                    >
                        <Download aria-hidden='true' focusable='false'/>DOWNLOAD (.TXT)
                    </Button>
                </div>
                <div className="p-2 ms-auto">
                    <Button
                    variant='warning'
                    id='archiveBtn'
                    type='button'
                    onClick={handleArchive}
                    disabled={actionRunning}
                    // ARIA ATTRIBUTES:
                    aria-label='Archive document translation'
                    aria-disabled={actionRunning}
                    >
                        ARCHIVE<Archive aria-hidden='true' focusable='false'/>
                    </Button>
                </div>
                <div className="vr" />
                <div className="p-2">
                    <Button
                    variant='danger'
                    id='deleteDocBtn'
                    type='button'
                    onClick={handleDelete}
                    disabled={actionRunning}
                    // ARIA ATTRIBUTES:
                    aria-label='Move document translation to trash'
                    aria-disabled={actionRunning}
                    >
                        DELETE<Trash2 aria-hidden='true' focusable='false'/>
                    </Button>
                </div>
            </Stack>
            </>
            )}
        </div>
        )}
    </div>
  )
}
