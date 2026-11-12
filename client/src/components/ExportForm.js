// ExportForm.js
// IMPORT REQUIRED MODULES AND PACKAGES
import React, { useCallback, useState } from 'react'
import '../css/componentCss/FilterForms.css';//Use FilterForms.css for Filter and Export forms
import '../css/componentCss/FormSetup.css';
import Stack from 'react-bootstrap/Stack';
import Button from 'react-bootstrap/Button'
import { Asterisk, FileClock, FileDown } from 'lucide-react';
import { EXPORT_TYPES, filenameFromHeader } from '../util/formUtil';

/* Every export request in the app, keyed by the `type` prop.
    - filterKeys: the list filters sent as query params when exporting the filtered list
    - filename:   fallback name of the downloaded file (the server's Content-Disposition name is used when available)
    - title:      screen reader heading for the form */
// const EXPORT_TYPES = {
//     notes:        { filterKeys: ['language', 'notebook', 'tag'],           filename: 'note-nest-notes',        title: 'EXPORT NOTES FORM' },
//     translations: { filterKeys: ['sourceLanguage', 'targetLanguage'],      filename: 'note-nest-translations', title: 'EXPORT TRANSLATIONS FORM' },
// }

// // Reads the filename from a Content-Disposition header, e.g. attachment; filename="note-nest-notes-2026-11-09.csv"
// const filenameFromHeader = (header) => header?.match(/filename="?([^";]+)"?/i)?.[1] || null

// ExportForm function component
/* Used to export NotesList.js and TranslationsList.js (all rows, or only the rows
matching the applied filters) as an .xlsx or .csv file.
GET /export?type=notes|translations&format=csv|xlsx (+ the filters) */
export default function ExportForm(
    {//PROPS PASSED FROM PARENT COMPONENT (NotesList.js / TranslationsList.js)
        type = 'notes',// Key of EXPORT_TYPES
        filters = {},// The filters currently applied to the list
        filtersActive = false// True when the list is filtered
    }
) {
    const exportType = EXPORT_TYPES[type] || EXPORT_TYPES.notes
    //================STATE VARIABLES========================
    const [format, setFormat] = useState('')// Selected file format ('csv' or 'xlsx')
    const [scope, setScope] = useState('filtered')// 'filtered' = only the rows matching the filters, 'all' = everything
    const [loading, setLoading] = useState(false)// Tracks whether the download request is currently running.
    const [error, setError] = useState('')// Error message shown in the form
    const [notice, setNotice] = useState(null)// State to confirm a download once the file has been handed to the browser.

    const exportFiltered = filtersActive && scope === 'filtered'

    /*Function to export NotesList.js or TranslationsList.js
    as xlsx or csv file*/
    const exportList = useCallback(async () => {
        setNotice(null)
        setError('')// Clear any previous error messages.
        // Conditional rendering to check that a format has been selected.
        if (!format) { setError('Please select a format.'); return }
        setLoading(true)
        try {
            // Only send the filters that have a value, and only when exporting the filtered list
            const params = new URLSearchParams({ type, format })
            if (exportFiltered) {
                exportType.filterKeys.forEach((key) => {
                    if (filters[key]) params.set(key, filters[key])
                })
            }
            // The browser sends the JWT cookie with the request
            const response = await fetch(`/export?${params.toString()}`, {
                method: 'GET',//HTTP request method
                credentials: 'include',
            })
            /* Conditional rendering to check if the response
               is not successful (status code is not in the range 200-299)*/
            if (!response.ok) {
                const data = await response.json().catch(() => ({}))// If the request fails, attempt to read the error message.
                throw new Error(data.message || 'Export failed.')//Throw an error message if the request is unsuccessful
            }
            // Trigger a browser download without navigating away from the page.
            const blob = await response.blob()// Convert response into a downloadable Blob object.
            const filename = filenameFromHeader(response.headers.get('Content-Disposition'))
                || `${exportType.filename}${exportFiltered ? '-filtered' : ''}.${format}`// Example: note-nest-translations.csv
            const url = URL.createObjectURL(blob)// Create temporary browser URL for the file.
            const a = document.createElement('a')// Create an invisible anchor element.
            a.href = url// Set download URL.
            a.download = filename
            document.body.appendChild(a)// Firefox only follows links that are in the document
            a.click()// Trigger download.
            a.remove()
            setTimeout(() => URL.revokeObjectURL(url), 0)// free the object URL after the click has been handled
            setNotice(`${filename} downloaded.`)// Confirm the download to the user
        } catch (error) {
            console.error('[ERROR: ExportForm.js] Export failed:', error.message)
            setError(error.message || 'Export failed.')// Set the error state to display the error in the UI
        } finally {
            setLoading(false)
        }
    }, [type, format, exportFiltered, exportType, filters])

    // Function to submit exportForm
    const handleExport = (e) => {
        e.preventDefault()
        exportList()
    }

    //============JSX RENDERING================
    return (
        <form id='exportForm' onSubmit={handleExport} aria-labelledby='formTitle'>
            {/* ------Screen Reader Heading-------- */}
            <p className='visually-hidden' id='formTitle'>{exportType.title}</p>
            <div id='exportFormInput'>
            {/* STACK 1*/}
                <Stack gap={3} id='exportStack1'>
                    <div className="p-2" id='selectExportBlock'>
                        <label className='exportLabel' htmlFor='exportFormatSelect'>CHOOSE EXPORT FORMAT:</label>
                        <div className='inputDiv'>
                            <select
                                className='input'
                                required
                                id='exportFormatSelect'
                                name='format'
                                value={format}
                                onChange={(e) => { setFormat(e.target.value); setError(''); setNotice(null) }}
                                // ARIA ATTRIBUTES:
                                aria-required='true'
                            >
                                <option value=''>SELECT</option>
                                <option value='csv'>CSV (.csv)</option>
                                <option value='xlsx'>EXCEL (.xlsx)</option>
                            </select>
                            <Asterisk color="#C22419" fontWeight={700} size={12} aria-hidden='true' focusable='false'/>
                        </div>
                    </div>
                    {/* Only offered when the list is filtered; otherwise everything is exported */}
                    {filtersActive && (
                        <div className="p-2" id='selectExportScopeBlock'>
                            <label className='exportLabel' htmlFor='exportScopeSelect'>ROWS TO EXPORT:</label>
                            <div className='inputDiv'>
                                <select
                                    className='input'
                                    id='exportScopeSelect'
                                    name='scope'
                                    value={scope}
                                    onChange={(e) => { setScope(e.target.value); setNotice(null) }}
                                >
                                    <option value='filtered'>FILTERED LIST</option>
                                    <option value='all'>ALL {type.toUpperCase()}</option>
                                </select>
                            </div>
                        </div>
                    )}
                    {/* ======================ERROR MESSAGE===================== */}
                    {error && (
                        <div className="p-2" id='exportError' role='alert' aria-live='polite'>
                            <span style={{ color: '#C22419', fontFamily: '"Roboto Mono", monospace', fontSize: '0.85rem' }}>{error}</span>
                        </div>
                    )}
                    {/* ======================DOWNLOAD NOTICE===================== */}
                    {notice && (
                        <div className="p-2" id='exportNotice' role='status' aria-live='polite'>
                            <span style={{ fontFamily: '"Roboto Mono", monospace', fontSize: '13.6px' }}>{notice}</span>
                        </div>
                    )}
                    <div className="p-2"/>
                </Stack>
            </div>
            {/* STACK 2 */}
            <Stack direction="horizontal" gap={3} id='exportStack2'>
                <div className="p-2"></div>
                <div className="p-2 ms-auto"/>
                <div className="vr" />
                <div className="p-2" id='exportBtnBlock'>
                    <Button
                        variant='light'
                        id='exportFormBtn'
                        type='submit'
                        disabled={loading}
                        // ARIA ATTRIBUTES:
                        aria-label={loading ? 'DOWNLOADING...' : 'DOWNLOAD'}
                        aria-disabled={loading}
                    >
                        {loading ? (
                            <>
                                <FileClock fontWeight={700} aria-hidden='true' focusable='false'/> DOWNLOADING...
                            </>
                        ):(
                            <>
                                <FileDown fontWeight={700} aria-hidden='true' focusable='false'/> DOWNLOAD
                            </>
                        )}
                    </Button>
                </div>
            </Stack>
        </form>
    )
}
