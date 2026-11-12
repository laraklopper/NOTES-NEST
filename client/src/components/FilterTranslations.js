//FilterTranslations.js
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
// IMPORT UTILITY DATA and FUNCTIONS
import languageData from '../util/languageData';
import { EMPTY_FILTERS } from '../util/formUtil';


// FilterTranslations component
/* Filter form for the TranslationsList table. The selects hold draft values;
the list only re-fetches when APPLY is pressed. */
export default function FilterTranslations(
    {//PROPS PASSED FROM PARENT COMPONENT (TranslationsList.js)
        loading,
        filters = EMPTY_FILTERS,// The filters currently applied to the list
        onApply// Called with { sourceLanguage, targetLanguage }
    }
) {
    const [draft, setDraft] = useState(filters)

    // Keep the selects in step when the applied filters change from outside (e.g. cleared)
    useEffect(() => {
        setDraft(filters)
    }, [filters])

    const handleChange = (e) => {
        const { name, value } = e.target
        setDraft((prev) => ({ ...prev, [name]: value }))
    }

    const handleSubmit = (e) => {
        e.preventDefault()// Stop the page reloading
        if (sameLanguage) return// Pressing Enter can still submit; this filter would always be empty
        onApply?.(draft)
    }

    // A translation can't have the same source and target language, so this would always be empty
    const sameLanguage = draft.sourceLanguage !== '' && draft.sourceLanguage === draft.targetLanguage

    //=======================JSX RENDERING=======================================
    return (
        <form id='filterForm' aria-busy={loading} aria-label='Filter translations' onSubmit={handleSubmit}>
            <div id='filterFormInput'>
                <Stack direction="horizontal" gap={3} id='filterStack1'>
                    <fieldset className="p-2" id='filterByBlock'>
                        <legend className='visually-hidden'>FILTER BY:</legend>
                        <div className='inputDiv'>
                            <label className='filterLabel' htmlFor='filterSourceLanguage'>SOURCE LANGUAGE:</label>
                            <select
                                id='filterSourceLanguage'
                                name='sourceLanguage'
                                className='input'
                                value={draft.sourceLanguage}
                                onChange={handleChange}
                                // ARIA ATTRIBUTES:
                                aria-required='false'
                            >
                                <option value=''>All languages</option>
                                {languageData.map((language) => (
                                    <option key={language.code} value={language.code}>{language.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className='inputDiv'>
                            <label className='filterLabel' htmlFor='filterTargetLanguage'>TARGET LANGUAGE:</label>
                            <select
                                id='filterTargetLanguage'
                                name='targetLanguage'
                                className='input'
                                value={draft.targetLanguage}
                                onChange={handleChange}
                                // ARIA ATTRIBUTES:
                                aria-required='false'
                                aria-invalid={sameLanguage}
                                aria-describedby={sameLanguage ? 'filterLanguageError' : undefined}
                            >
                                <option value=''>All languages</option>
                                {languageData.map((language) => (
                                    <option key={language.code} value={language.code}>{language.name}</option>
                                ))}
                            </select>
                        </div>
                    </fieldset>
                </Stack>
                {sameLanguage && (
                    <p className='text-danger p-2 m-0' id='filterLanguageError' role='alert'>
                        Source and target language must be different.
                    </p>
                )}
                <Stack direction="horizontal" gap={3}>
                    <div className="p-2" />
                    <div className="p-2 ms-auto">
                        <Button
                            variant='light'
                            type='submit'
                            id='applyFilterBtn'
                            disabled={loading || sameLanguage}
                        >
                            APPLY <Search aria-hidden='true' focusable='false' />
                        </Button>
                    </div>
                </Stack>
            </div>
        </form>
    )
}
