//NoteBookList.js
//IMPORT REQUIRED MODULES AND PACKAGES
import React, { useCallback, useState } from 'react'
// IMPORT CSS STYLESHEETS
import '../css/componentCss/ListTables.css'
import '../css/componentCss/ListBtns.css'
import '../css/componentCss/ListLayout.css'
// IMPORT BOOTSTRAP COMPONENTS
import Button from 'react-bootstrap/Button';
// IMPORT UTILITY FUNCTIONS
import { dateDisplay } from '../util/dateFunctions';
// IMPORT ICONS FROM LUCIDE-REACT
import { Pencil, Save, Trash2, X } from 'lucide-react';

// Small square showing a notebook's colour
const ColourSwatch = ({ colour }) => (
    <span
    style={{ display: 'inline-block', width: '1em', height: '1em', marginRight: '0.4em', verticalAlign: 'middle', border: 'solid 1px #000', backgroundColor: colour }}
    aria-hidden='true'
    />
)

// NoteBookList component
/* Table of the user's notebooks. A row can be edited in place (name and colour)
or deleted; a deleted notebook's notes move to "No notebook".
GET /notebooks (run by Notes.js), PATCH /notebooks/:id, DELETE /notebooks/:id */
export default function NoteBookList(
    {//PROPS PASSED FROM PARENT COMPONENT (NoteDataLists.js)
        notebooks = [],// The user's notebooks (with noteCount) from GET /notebooks
        fetchNotebooks,// Refreshes the notebooks in Notes.js
        fetchNotes,// Refreshes the notes, so a renamed/deleted notebook shows correctly on them
        setError
    }
) {
    const [editingId, setEditingId] = useState(null)// Id of the notebook row being edited
    const [editName, setEditName] = useState('')
    const [editColour, setEditColour] = useState('')
    const [actionId, setActionId] = useState(null)// Id of the notebook a save/delete request is running for

    // Open a row for editing with its current values
    const startEdit = (notebook) => {
        setEditingId(notebook._id)
        setEditName(notebook.name)
        setEditColour(notebook.colour)
    }
    const cancelEdit = useCallback(() => {
        setEditingId(null)
        setEditName('')
        setEditColour('')
    }, [])

    //========UPDATE NOTEBOOK REQUEST===============
    const updateNotebook = useCallback(async (notebook) => {
        // Only send the fields that changed
        const changes = {}
        if (editName.trim() !== notebook.name) changes.name = editName.trim()
        if (editColour.toLowerCase() !== (notebook.colour || '').toLowerCase()) changes.colour = editColour

        // Conditional rendering to check the name is not only spaces
        if (!editName.trim()) {
            alert('Please enter a notebook name.')
            return
        }
        if (Object.keys(changes).length === 0) {
            cancelEdit()// Nothing changed, so there is nothing to send
            return
        }

        setError?.(null)
        setActionId(notebook._id)
        try {
            // The browser sends the JWT cookie with the request
            const response = await fetch(`/notebooks/${notebook._id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(changes)
            })
            const data = await response.json().catch(() => ({}))
            if (!response.ok) {
                setError?.(data.message || 'Failed to update notebook.')
                return
            }
            cancelEdit()
            await Promise.all([fetchNotebooks?.(), fetchNotes?.()])// Refresh the lists so the change shows everywhere
            alert(`Notebook "${data.notebook?.name || notebook.name}" successfully updated`)
        } catch (error) {
            console.error('[ERROR: NoteBookList.js] Updating notebook failed:', error.message)
            setError?.('An error occurred while updating your notebook.')
        } finally {
            setActionId(null)
        }
    }, [editName, editColour, cancelEdit, setError, fetchNotebooks, fetchNotes])

    //========DELETE NOTEBOOK REQUEST===============
    const deleteNotebook = useCallback(async (notebook) => {
        setError?.(null)
        setActionId(notebook._id)
        try {
            // The browser sends the JWT cookie with the request
            const response = await fetch(`/notebooks/${notebook._id}`, {
                method: 'DELETE',
            })
            const data = await response.json().catch(() => ({}))
            if (!response.ok) {
                setError?.(data.message || 'Failed to delete notebook.')
                return
            }
            if (editingId === notebook._id) cancelEdit()
            await Promise.all([fetchNotebooks?.(), fetchNotes?.()])// Refresh the lists so the notebook disappears
            alert(`Notebook "${notebook.name}" successfully deleted`)
        } catch (error) {
            console.error('[ERROR: NoteBookList.js] Deleting notebook failed:', error.message)
            setError?.('An error occurred while deleting your notebook.')
        } finally {
            setActionId(null)
        }
    }, [editingId, cancelEdit, setError, fetchNotebooks, fetchNotes])

    // Ask before deleting, and say what happens to the notebook's notes
    const handleDelete = (notebook) => {
        const usage = notebook.noteCount > 0
            ? ` Its ${notebook.noteCount} note${notebook.noteCount === 1 ? '' : 's'} will be kept and moved to "No notebook".`
            : ''
        const confirmDelete = window.confirm(`Are you sure you want to permanently delete the notebook "${notebook.name}"?${usage}`)
        if (!confirmDelete) return
        deleteNotebook(notebook)
    }

    //=======================JSX RENDERING=======================================
  return (
    <div id='notebookTableWrapper'>
        <table id='notebookTable'>
            <thead>
                <tr>
                    <th colSpan={6}>NOTEBOOKS</th>
                </tr>
                <tr>
                    <th>#</th>
                    <th>NAME</th>
                    <th>COLOUR</th>
                    <th>NOTES</th>
                    <th style={{width: '250px', margin: '0px', padding: '0px'}}>DATE ADDED</th>
                    <th>{/* BUTTONS: EDIT + DELETE*/}</th>
                </tr>
            </thead>
            <tbody>
                {notebooks.length === 0 ? (
                    <tr>
                        <td colSpan={6}>NO NOTEBOOKS YET</td>
                    </tr>
                ) : (
                    notebooks.map((notebook, index) => {
                        const isEditing = editingId === notebook._id
                        const isBusy = actionId === notebook._id
                        return (
                        <tr key={notebook._id}>
                            <td>{index + 1}</td>
                            <td>
                                {isEditing ? (
                                    <input
                                    className='input'
                                    type='text'
                                    value={editName}
                                    maxLength={80}
                                    required
                                    onChange={(e) => setEditName(e.target.value)}
                                    disabled={isBusy}
                                    // ARIA ATTRIBUTES:
                                    aria-label='Notebook name'
                                    aria-required='true'
                                    />
                                ) : notebook.name}
                            </td>
                            <td>
                                {isEditing ? (
                                    <input
                                    type='color'
                                    value={editColour}
                                    onChange={(e) => setEditColour(e.target.value)}
                                    disabled={isBusy}
                                    // ARIA ATTRIBUTES:
                                    aria-label='Notebook colour'
                                    />
                                ) : (
                                    <><ColourSwatch colour={notebook.colour}/>{notebook.colour}</>
                                )}
                            </td>
                            <td>{notebook.noteCount ?? 0}</td>
                            <td style={{width: '250px', margin: '0px', padding: '0px'}}>{dateDisplay(notebook.createdAt)}</td>
                            <td style={{width: '200px'}}>
                                <div id='notebooksListBtns'>
                                    {isEditing ? (
                                        <>
                                            <Button
                                            variant='light'
                                            id='toggleEditNoteBookBtn'
                                            type='button'
                                            onClick={() => updateNotebook(notebook)}
                                            disabled={isBusy}
                                            // ARIA ATTRIBUTES:
                                            aria-label={`Save changes to notebook ${notebook.name}`}
                                            >
                                                <Save aria-hidden='true' focusable='false'/>{isBusy ? 'SAVING...' : 'SAVE'}
                                            </Button>
                                            <Button
                                            variant='warning'
                                            id='toggleEditNoteBookBtn'
                                            type='button'
                                            onClick={cancelEdit}
                                            disabled={isBusy}
                                            // ARIA ATTRIBUTES:
                                            aria-label='Cancel editing notebook'
                                            >
                                                <X aria-hidden='true' focusable='false'/>CANCEL
                                            </Button>
                                        </>
                                    ) : (
                                        <>
                                            <Button
                                            variant='warning'
                                            id='toggleEditNoteBookBtn'
                                            type='button'
                                            onClick={() => startEdit(notebook)}
                                            disabled={actionId !== null}
                                            // ARIA ATTRIBUTES:
                                            aria-label={`Edit notebook ${notebook.name}`}
                                            >
                                                <Pencil aria-hidden='true' focusable='false'/>EDIT NOTEBOOK
                                            </Button>
                                            <Button
                                            variant='danger'
                                            id='deleteItemBtn'
                                            type='button'
                                            onClick={() => handleDelete(notebook)}
                                            disabled={actionId !== null}
                                            // ARIA ATTRIBUTES:
                                            aria-label={`Delete notebook ${notebook.name}`}
                                            >
                                                {isBusy ? 'DELETING...' : 'DELETE'}<Trash2 aria-hidden='true' focusable='false'/>
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </td>
                        </tr>
                        )
                    })
                )}
            </tbody>
        </table>
    </div>
  )
}
