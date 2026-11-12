/* FilterNotes.js
Filter form for the NotesList table. The selects hold draft values;
the list only re-fetches when APPLY is pressed. */
//IMPORT REQUIRED MODULES AND PACKAGES
import React, { useEffect, useState } from 'react'
// IMPORT CSS STYLESHEETS
import '../css/componentCss/FilterForms.css'
import '../css/componentCss/FormSetup.css'
// IMPORT BOOTSTRAP COMPONENTS
import Stack from 'react-bootstrap/Stack';
import Button from 'react-bootstrap/Button';
// IMPORT ICONS FROM LUCIDE-REACT
import { Search } from 'lucide-react';
// IMPORT UTILITY DATA
import languageData from '../util/languageData';
import { EMPTY_NOTE_FILTERS } from '../util/formUtil';

// FilterNotes component
export default function FilterNotes(//Export default FilterNotes.js function component
    {//PROPS PASSED FROM PARENT COMPONENT (NotesList.js)
        loading,
        filters = EMPTY_NOTE_FILTERS,// The filters currently applied to the list
        notebooks = [],// The user's notebooks from GET /notebooks
        tags = [],// The user's tags from GET /tag/fetchTags
        onApply// Called with { language, notebook, tag }
    }
) {
    //============STATE VARIABLES============
    const [draft, setDraft] = useState(filters)

    // Keep the selects in step when the applied filters change from outside (e.g. cleared)
    useEffect(() => {
        setDraft(filters)
    }, [filters])

    //==============EVENT HANDLERS=====================
    //Function to handle field input changes
    const handleChange = (e) => {
        const { name, value } = e.target
        setDraft((prev) => ({ ...prev, [name]: value }))
    }

    //Function to submit form
    const handleSubmit = (e) => {
        e.preventDefault()// Stop the page reloading
        onApply?.(draft)
    }

    //=======================JSX RENDERING=======================================
    return (
        <form id='filterForm' aria-busy={loading} aria-label='Filter notes' onSubmit={handleSubmit}>
            <div id='filterFormInput'>
                <Stack direction="horizontal" gap={3} id='filterStack1'>
                    <fieldset className="p-2" id='filterByBlock' aria-labelledby='filterByLegend'>
                        <legend id='filterByLegend' className='visually-hidden'>FILTER BY:</legend>
                        {/* Language: 
                        select: value={draft.language} 
                        mappedOptions: value={language.code}*/}
                        <div className='inputDiv'>
                            <label className='filterLabel' htmlFor='languageFilter'>LANGUAGE:</label>
                            <select
                                className='input'
                                id='languageFilter'
                                name='language'
                                value={draft.language}
                                onChange={handleChange}
                                // ARIA ATTRIBUTES:
                                aria-required='false'
                            >
                                <option value=''>ALL LANGUAGES</option>
                                {languageData.map((language) => (
                                    <option key={language.code} value={language.code}>{language.name}</option>
                                ))}
                            </select>
                        </div>
                        {/* NOTEBOOK: 
                        select: value={draft.notebook} 
                        option: value={notebook._id}*/}
                        <div className='inputDiv'>
                            <label className='filterLabel' htmlFor='notebookFilter'>NOTEBOOK:</label>
                            <select
                                className='input'
                                id='notebookFilter'
                                name='notebook'
                                value={draft.notebook}
                                onChange={handleChange}
                                // ARIA ATTRIBUTES:
                                aria-required='false'
                            >
                                <option value=''>ALL NOTEBOOKS</option>
                                {notebooks.map((notebook) => (
                                    <option key={notebook._id} value={notebook._id}>{notebook.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className='inputDiv'>
                            <label className='filterLabel' htmlFor='tagFilter'>TAG:</label>
                            <select
                                className='input'
                                id='tagFilter'
                                name='tag'
                                value={draft.tag}
                                onChange={handleChange}
                                // ARIA ATTRIBUTES:
                                aria-required='false'
                            >
                                <option value=''>ALL TAGS</option>
                                {tags.map((tag) => (
                                    <option key={tag._id} value={tag._id}>{tag.name}</option>
                                ))}
                            </select>
                        </div>
                    </fieldset>
                </Stack>
                {/* STACK 2: BUTTONS */}
                <Stack direction="horizontal" gap={3} id='filterStack2'>
                    <div className="p-2" />
                    <div className="p-2 ms-auto">
                        <Button
                            variant='light'
                            type='submit'
                            id='applyFilterBtn'
                            disabled={loading}
                            // ARIA ATTRIBUTES:
                            aria-label='APPLY FILTER'
                            aria-disabled={loading ? 'true': 'false'}
                        >
                            APPLY <Search aria-hidden='true' focusable='false' />
                        </Button>
                    </div>
                </Stack>
            </div>
        </form>
    )
}
