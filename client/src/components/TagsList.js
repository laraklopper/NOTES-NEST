//TagsList.js
//IMPORT REQUIRED MODULES AND PACKAGES
import React, { useCallback, useState } from 'react'
// IMPORT CSS STYLESHEETS
import '../css/componentCss/ListTables.css'
// IMPORT BOOTSTRAP COMPONENTS
import Button from 'react-bootstrap/Button';
// IMPORT UTILITY FUNCTIONS
import { dateDisplay } from '../util/dateFunctions';
// IMPORT ICONS FROM LUCIDE-REACT
import { PencilLineIcon, Save, Trash2, X } from 'lucide-react';

// TagsList component
/* Table of the user's tags. A tag can be renamed in place or deleted.
GET /tag/fetchTags (run by Notes.js), PUT /tag/:id, DELETE /tag/:id */
export default function TagsList(
    {//PROPS PASSED FROM PARENT COMPONENT (NoteDataLists.js)
        tags = [],// The user's tags (with noteCount) from GET /tag/fetchTags
        fetchTags,// Refreshes the tags in Notes.js
        fetchNotes,// Refreshes the notes, so a deleted tag disappears from them
        setError
    }
) {
    //================STATE VARIABLES=================
    const [editingId, setEditingId] = useState(null)//Id of tag row being edited
    const [editName, setEditName] = useState('')
    const [actionId, setActionId] = useState(null)// Id of the tag a save/delete request is running for

    // Open a row for editing with its current name
    const startEdit = (tag) => {
        setEditingId(tag._id)
        setEditName(tag.name)
    }
    const cancelEdit = useCallback(() => {
        setEditingId(null)
        setEditName('')
    }, [])

    //=========PUT====================
    /*PUT request to edit tag name
    use a put request because the tag name is the only field.*/
    const editTagName = useCallback(async (tag) => {
        const newName = editName.trim().toLowerCase()// Tags are stored lowercase

        // Check the name is not only spaces
        if (!newName) {
            alert('Please enter a tag name.')
            return
        }
        if (newName === tag.name) {
            cancelEdit()// Nothing changed, so there is nothing to send
            return
        }

        setError?.(null)
        setActionId(tag._id)
        try {
            // Send a PUT request to the '/tag/:id' endpoint (the browser sends the JWT cookie)
            const response = await fetch(`/tag/${tag._id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name: newName })
            })
            const data = await response.json().catch(() => ({}))
            if (!response.ok) {
                setError?.(data.message || 'Failed to update tag.')
                return
            }
            cancelEdit()
            await Promise.all([fetchTags?.(), fetchNotes?.()])// Refresh the lists so the new name shows on the notes too
            alert(`Tag "${tag.name}" renamed to "${data.tag?.name || newName}"`)
        } catch (error) {
            console.error('[ERROR: TagsList.js] Updating tag failed:', error.message)
            setError?.('An error occurred while updating your tag.')
        } finally {
            setActionId(null)
        }
    }, [editName, cancelEdit, setError, fetchTags, fetchNotes])

    //========DELETE TAG REQUEST===============
    const deleteTag = useCallback(async (tag) => {
        setError?.(null)
        setActionId(tag._id)
        try {
            // The browser sends the JWT cookie with the request
            const response = await fetch(`/tag/${tag._id}`, {
                method: 'DELETE',
            })
            const data = await response.json().catch(() => ({}))
            if (!response.ok) {
                setError?.(data.message || 'Failed to delete tag.')
                return
            }
            if (editingId === tag._id) cancelEdit()
            await Promise.all([fetchTags?.(), fetchNotes?.()])// Refresh the lists so the tag disappears
            alert(`Tag "${tag.name}" successfully deleted`)
        } catch (error) {
            console.error('[ERROR: TagsList.js] Deleting tag failed:', error.message)
            setError?.('An error occurred while deleting your tag.')
        } finally {
            setActionId(null)
        }
    }, [editingId, cancelEdit, setError, fetchTags, fetchNotes])

    // Ask before deleting, and say how many notes will lose the tag
    const handleDelete = (tag) => {
        const usage = tag.noteCount > 0
            ? ` It will be removed from ${tag.noteCount} note${tag.noteCount === 1 ? '' : 's'}.`
            : ''
        const confirmDelete = window.confirm(`Are you sure you want to permanently delete the tag "${tag.name}"?${usage}`)
        if (!confirmDelete) return
        deleteTag(tag)
    }

     
    //=======================JSX RENDERING=======================================
  return (
    <div id='tagsTableWrapper'>
        <table id='tagsTable'>
            <thead>
                <tr>
                    <th colSpan={5}>TAGS</th>
                </tr>
                <tr>
                    <th>#</th>
                    <th>NAME</th>
                    <th>NOTES</th>
                    <th>DATE ADDED</th>
                    <th>{/*BUTTONS: EDIT + DELETE*/}</th>
                </tr>
            </thead>
            <tbody>
                {tags.length === 0 ? (
                    <tr>
                        <td colSpan={5}>NO TAGS YET</td>
                    </tr>
                ) : (
                    tags.map((tag, index) => {
                        const isEditing = editingId === tag._id
                        const isBusy = actionId === tag._id
                        return (
                        <tr key={tag._id}>
                            <td>{index + 1}</td>
                            <td>
                                {isEditing ? (
                                    <input
                                    className='input'
                                    type='text'
                                    value={editName}
                                    maxLength={30}
                                    required
                                    onChange={(e) => setEditName(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') editTagName(tag)// Enter saves
                                        if (e.key === 'Escape') cancelEdit()// Escape cancels
                                    }}
                                    disabled={isBusy}
                                    autoFocus
                                    // ARIA ATTRIBUTES:
                                    aria-label='Tag name'
                                    aria-required='true'
                                    />
                                ) : tag.name}
                            </td>
                            <td>{tag.noteCount ?? 0}</td>
                            <td>{dateDisplay(tag.createdAt)}</td>
                            <td style={{width: '280px'}}>
                                <div id='tagTableBtns'>
                                    {isEditing ? (
                                        <>
                                            <Button
                                            variant='light'
                                            id='editTagName'
                                            type='button'
                                            onClick={() => editTagName(tag)}
                                            disabled={isBusy}
                                            // ARIA ATTRIBUTES:
                                            aria-label={`Save new name for tag ${tag.name}`}
                                            >
                                                <Save aria-hidden='true' focusable='false'/>{isBusy ? 'SAVING...' : 'SAVE'}
                                            </Button>
                                            <Button
                                            variant='warning'
                                            id='editTagName'
                                            type='button'
                                            onClick={cancelEdit}
                                            disabled={isBusy}
                                            // ARIA ATTRIBUTES:
                                            aria-label='Cancel editing tag'
                                            >
                                                <X aria-hidden='true' focusable='false'/>CANCEL
                                            </Button>
                                        </>
                                    ) : (
                                        <>
                                            <Button
                                            variant='warning'
                                            id='editTagName'
                                            type='button'
                                            onClick={() => startEdit(tag)}
                                            disabled={actionId !== null}
                                            // ARIA ATTRIBUTES:
                                            aria-label={`Edit name of tag ${tag.name}`}
                                            >
                                                <PencilLineIcon aria-hidden='true' focusable='false'/> EDIT TAG NAME
                                            </Button>
                                            <Button
                                            variant='danger'
                                            id='deleteItemBtn'
                                            type='button'
                                            onClick={() => handleDelete(tag)}
                                            disabled={actionId !== null}
                                            // ARIA ATTRIBUTES:
                                            aria-label={`Delete tag ${tag.name}`}
                                            >
                                                {isBusy ? 'DELETING...' : 'DELETE'}
                                                <Trash2 aria-hidden='true' focusable='false'/>
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
