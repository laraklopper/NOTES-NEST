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
import { Trash2 } from 'lucide-react';

// TagsList component
/* Table of the user's tags. Tags can be deleted but not edited.
GET /tag/fetchTags (run by Notes.js), DELETE /tag/:id */
export default function TagsList(
    {//PROPS PASSED FROM PARENT COMPONENT (NoteDataLists.js)
        tags = [],// The user's tags (with noteCount) from GET /tag/fetchTags
        fetchTags,// Refreshes the tags in Notes.js
        fetchNotes,// Refreshes the notes, so a deleted tag disappears from them
        setError
    }
) {
    //================STATE VARIABLES=================
    const [deletingId, setDeletingId] = useState(null)// Id of the tag being deleted

    //========DELETE TAG REQUEST===============
    const deleteTag = useCallback(async (tag) => {
        setError?.(null)
        setDeletingId(tag._id)
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
            await Promise.all([fetchTags?.(), fetchNotes?.()])// Refresh the lists so the tag disappears
            alert(`Tag "${tag.name}" successfully deleted`)
        } catch (error) {
            console.error('[ERROR: TagsList.js] Deleting tag failed:', error.message)
            setError?.('An error occurred while deleting your tag.')
        } finally {
            setDeletingId(null)
        }
    }, [setError, fetchTags, fetchNotes])

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
                    <th>{/*BUTTONS: DELETE*/}</th>
                </tr>
            </thead>
            <tbody>
                {tags.length === 0 ? (
                    <tr>
                        <td colSpan={5}>NO TAGS YET</td>
                    </tr>
                ) : (
                    tags.map((tag, index) => (
                        <tr key={tag._id}>
                            <td>{index + 1}</td>
                            <td>{tag.name}</td>
                            <td>{tag.noteCount ?? 0}</td>
                            <td>{dateDisplay(tag.createdAt)}</td>
                            <td style={{width: '200px'}}>
                                <div id='tagTableBtns'>
                                    <Button
                                    variant='danger'
                                    id='deleteItemBtn'
                                    type='button'
                                    onClick={() => handleDelete(tag)}
                                    disabled={deletingId !== null}
                                    // ARIA ATTRIBUTES:
                                    aria-label={`Delete tag ${tag.name}`}
                                    >
                                        {deletingId === tag._id ? 'DELETING...' : 'DELETE'}
                                        <Trash2 aria-hidden='true' focusable='false'/>
                                    </Button>
                                </div>
                            </td>
                        </tr>
                    ))
                )}
            </tbody>
        </table>
    </div>
  )
}
