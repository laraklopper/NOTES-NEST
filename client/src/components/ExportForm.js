// ExportForm.js
// IMPORT REQUIRED MODULES AND PACKAGES
import React, { useCallback, useState } from 'react'
import '../css/componentCss/FilterForms.css';//Use FilterForms.css for Filter and Export forms
import '../css/componentCss/FormSetup.css';
import Stack from 'react-bootstrap/Stack';
import Button from 'react-bootstrap/Button'
import { Asterisk, FileClock, FileDown } from 'lucide-react';


/* Every export request in the app, keyed by the `type` prop.
    - path:     route on exportRoutes.js (mounted at /export)
    - method:   'GET' routes read the user's data from the database,
    - filename: name of the downloaded file (the extension is added from the format)
    - title:    screen reader heading for the form */
const EXPORT_TYPES = {
    notes: { path: '/export/notes', method: 'GET',  filename: 'notes',      title: 'EXPORT TRANSACTIONS FORM' },
    translations:     { path: '/export/translations',     method: 'GET',  filename: 'translations',          title: 'EXPORT HOLDINGS FORM' },
}
// Download data as a file (query: `type` = `notes` \| `archived` \| `translations`, `format` = `csv` \| `xlsx`)
// ExportForm function component
/* Used to export TranslationsList.js and NotesList, & Filtered Lists
 */
export default function ExportForm(
    {
        error,
        setError
    }
) {
    const [format, setFormat] = useState('')// Selected file format ('csv' or 'xlsx')
    // Tracks whether the download request is currently running.
    const [loading, setLoading] = useState(false)// State to confirm a download once the file has been handed to the browser.
    const [notice, setNotice] = useState(null)// State to confirm a download once the file has been handed to the browser.

    /*Function to export NotesList.js or TranslationsList.js 
    as xlsx or csv file*/
    const exportList = useCallback(async () => {
        setLoading(true)
          setNotice(null)
        setError('')// Clear any previous error messages.
        // Conditional rendering to check that a format has been selected.
        if (!format) { setError('Please select a format.'); return }
       try {
         const token = localStorage.getItem('token')// Retrieve JWT token from localStorage.
            if(!token) return;
            const response = await fetch(`http://localhost:3001/export/`,{
                method: 'GET',
                mode: 'cors',
                headers: {
                    Authorization: `Bearer ${token}`,// Attach JWT token for authorization
                }
            })
            /* Conditional rendering to check if the response
               is not successful (status code is not in the range 200-299)*/
            if (!response.ok) {
                const data = await response.json().catch(() => ({}))// If the request fails, attempt to read the error message.
                throw new Error(data.message || 'Export failed.')//Throw an error message if the request is unsuccessful
            }
            // Trigger a browser download without navigating away from the page.
            const blob = await response.blob()// Convert response into a downloadable Blob object.
            const url = URL.createObjectURL(blob)// Create temporary browser URL for the file.
            const a = document.createElement('a')// Create an invisible anchor element.
            a.href = url// Set download URL.
            // a.download = `${exportType.filename}.${format}`// Example: translations.csv, translations.xlsx
            a.click()// Trigger download.
            URL.revokeObjectURL(url)// free the object URL after click is dispatched
            setNotice(`${a.download} downloaded.`)// Confirm the download to the user
       } catch (error) {
        setError(error.message || 'Export failed.')// Set the error state to display the error in the UI
       }finally{
        setLoading(false)
       }
    },[setLoading, setError, format])
    
    // Function to submit exportForm
    const handleExport = (e) => {
        e.preventDefault()
        exportList()
    }

    //============JSX RENDERING================
  return (
    <form id='exportForm' onSubmit={handleExport} method='GET' aria-labelledby='formTitle'>
        {/* ------Screen Reader Heading-------- */}
        <p className='visually-hidden' id='formTitle'></p>
        <div id='exportFormInput'>
            <Stack gap={3} id='exportStack1'>
                <div className="p-2">
                    <label>CHOOSE EXPORT FORMAT:</label>
                    <select
                        className='exportSelect'
                        required
                        id='exportFormatSelect'
                        name='format'
                        value={format}
                        onChange={(e) => { setFormat(e.target.value); setError(''); setNotice(null) }}
                        // ARIA ATTRIBUTES:
                        aria-label='Export format'
                        aria-required='true'
                    >
                        <option value=''>SELECT</option>
                        <option value='csv'>CSV (.csv)</option>
                        <option value='xlsx'>EXCEL (.xlsx)</option>
                    </select>
                    <Asterisk color="#C22419" fontWeight={700} size={12} aria-hidden='true' focusable='false'/>
                </div>
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
                <div className="p-2">
                    <Button></Button>
                </div>
                </Stack>
        </div>
        <Stack direction="horizontal" gap={3} id='exportStack2'>
      <div className="p-2"></div>
      <div className="p-2 ms-auto"/>
      <div className="vr" />
      <div className="p-2" id='exportBtnBlock'>
        <Button
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
