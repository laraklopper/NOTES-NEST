//TranslationsList.js
//IMPORT REQUIRED MODULES AND PACKAGES
import React, { useCallback, useEffect, useRef, useState } from 'react'
// IMPORT CSS STYLESHEETS
import '../css/componentCss/ListTables.css'
import '../css/componentCss/DetailsPanals.css'
// IMPORT BOOTSTRAP COMPONENTS
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Stack from 'react-bootstrap/Stack';
import Button from 'react-bootstrap/Button';
// IMPORT UTILITY FUNCTIONS
import { languageName } from '../util/languageFunc';

// IMPORT ICONS FROM LUCIDE-REACT
import { ArrowRight, Filter, FilterX } from 'lucide-react';
// IMPORT COMPONENTS
import FilterTranslations, { EMPTY_FILTERS } from './FilterTranslations';
import TranslationPanal from './TranslationPanal';
import Pagination, { PAGE_SIZES } from './Pagination';

// Shortens long text for the table cells; the full text is shown in the panal
const preview = (text = '', max = 60) => (text.length > max ? `${text.slice(0, max)}…` : text)

// TranslationsList component
/* Table of the user's saved translations, with a details panal for the selected one
GET /translation/fetch, DELETE /translation/delete/:id */
export default function TranslationsList(
    {//PROPS PASSED FROM PARENT COMPONENT (Translate.js)
        currentUser,
        active = true// True while the translations tab is open; the list refreshes each time it opens
    }
) {
    const [translations, setTranslations] = useState([])
    const [pagination, setPagination] = useState({ page: 1, limit: PAGE_SIZES[0], total: 0, totalPages: 1 })
    const [page, setPage] = useState(1)
    const [limit, setLimit] = useState(PAGE_SIZES[0])
    const [filters, setFilters] = useState(EMPTY_FILTERS)// Applied filters; '' = all languages
    const [loading, setLoading] = useState(false)
    const [actionLoading, setActionLoading] = useState(false)// True while a delete request is running
    const [error, setError] = useState(null)
    const [selectedId, setSelectedId] = useState(null)// Id of the translation shown in the panal
    const [showFilter, setShowFilter] = useState(false)// Shows/hides the filter form
    const latestRequest = useRef(0)// Id of the most recent fetch, used to ignore stale responses
    /* The selected translation is looked up from the list (rather than stored as
    a copy) so it always shows the latest data after a re-fetch */
    const selectedIndex = translations.findIndex((t) => t._id === selectedId)
    const selectedTranslation = selectedIndex === -1 ? null : translations[selectedIndex]
    const rowNumber = (index) => (pagination.page - 1) * pagination.limit + index + 1// Numbering carries on across pages
    const { sourceLanguage, targetLanguage } = filters
    const filtersActive = Boolean(sourceLanguage || targetLanguage)

    const toggleFilter = () => setShowFilter((prev) => !prev)
    //========FETCH TRANSLATIONS REQUEST===============
    const fetchTranslations = useCallback(async () => {
        /* Number each request so only the newest one updates the list. Without this a
        slow earlier request (e.g. the previous page or filter) could finish last and
        overwrite the results the user actually asked for. */
        const requestId = ++latestRequest.current
        const isStale = () => requestId !== latestRequest.current
        setError(null)
        setLoading(true)
        try {
            // Only send params that have a value
            const params = new URLSearchParams({ page: String(page), limit: String(limit) })
            if (sourceLanguage) params.set('sourceLanguage', sourceLanguage)
            if (targetLanguage) params.set('targetLanguage', targetLanguage)

            // The browser sends the JWT cookie with the request
            const response = await fetch(`/translation/fetch?${params.toString()}`, {
                method: 'GET',
                credentials: 'include',
            })
            const data = await response.json().catch(() => ({}))
            if (isStale()) return// A newer request has replaced this one
            if (!response.ok) throw new Error(data?.message || 'Failed to load translations')

            setTranslations(Array.isArray(data.translations) ? data.translations : [])
            if (data.pagination) {
                setPagination(data.pagination)
                // A delete can empty the last page; step back to the new last page
                const lastPage = Math.max(data.pagination.totalPages || 1, 1)
                if (page > lastPage) setPage(lastPage)
            }
            console.log(`[SUCCESS: TranslationsList.js] Fetched ${data.translations?.length || 0} translations`)
        } catch (error) {
            if (isStale()) return
            console.error('[ERROR: TranslationsList.js] Fetching translations failed:', error.message)
            setError(error.message || 'Something went wrong while loading translations.')
        } finally {
            if (!isStale()) setLoading(false)
        }
    }, [page, limit, sourceLanguage, targetLanguage])

    // Fetch when the tab opens and whenever the page/filters change
    useEffect(() => {
        if (active) fetchTranslations()
    }, [active, fetchTranslations])

    //========DELETE TRANSLATION REQUEST===============
    const deleteTranslation = useCallback(async (id) => {
        setError(null)
        setActionLoading(true)
        try {
            const response = await fetch(`/translation/delete/${id}`, {
                method: 'DELETE',
                credentials: 'include',
            })
            const data = await response.json().catch(() => ({}))
            if (!response.ok) throw new Error(data?.message || 'Failed to delete translation')

            setSelectedId(null)// Close the panal
            await fetchTranslations()// Refresh the list so the translation disappears from it
            alert('Translation successfully deleted')
        } catch (error) {
            console.error('[ERROR: TranslationsList.js] Deleting translation failed:', error.message)
            setError(error.message || 'Something went wrong while deleting. Please try again.')
        } finally {
            setActionLoading(false)
        }
    }, [fetchTranslations])

    // Ask before deleting the selected translation
    const handleDelete = () => {
        if (!selectedTranslation) return
        const confirmDelete = window.confirm('Are you sure you want to permanently delete this translation?')
        if (!confirmDelete) return
        deleteTranslation(selectedTranslation._id)
    }

    // Copy the translated text to the clipboard
    const handleCopy = async () => {
        if (!selectedTranslation) return
        try {
            await navigator.clipboard.writeText(selectedTranslation.translatedText || '')
            alert('Translation copied to clipboard')
        } catch (error) {
            console.error('[ERROR: TranslationsList.js] Copying translation failed:', error)
            setError('Could not copy the translation to the clipboard.')
        }
    }

    // Applying or clearing filters starts again from page 1
    const handleApplyFilters = (newFilters) => {
        setFilters({ ...EMPTY_FILTERS, ...newFilters })
        setPage(1)
        setSelectedId(null)
    }
    const handleClearFilters = () => {
        setFilters(EMPTY_FILTERS)
        setPage(1)
        setSelectedId(null)
    }
    const handleLimitChange = (newLimit) => {
        setLimit(newLimit)
        setPage(1)
        setSelectedId(null)
    }
    const goToPage = (newPage) => {
        setPage(newPage)
        setSelectedId(null)
    }

    //=======================JSX RENDERING=======================================
  return (
    <div id='translationsList'>
    <Row id='errorRow'>
        <Col/>
        <Col id='errorCol' xs={6}>
            <span>{error && <p className='text-danger' role='alert'>{error}</p>}</span>
        </Col>
        <Col/>
    </Row>
    <Row id='toggleFilterRow'>
        <Col id='toggleFilterCol'>
        <div className='toggleFilterDiv'>
                   <Stack direction="horizontal" gap={3} id='toggleFilterStack'>
      {/* SUMMARY OF THE APPLIED FILTERS */}
      <div className="p-2" aria-live='polite'>
        {filtersActive ? (
            <span className='filterStatusSpan'>
                FILTERED: {sourceLanguage ? languageName(sourceLanguage) : 'Any language'}
                <ArrowRight aria-label='to'/>
                {targetLanguage ? languageName(targetLanguage) : 'Any language'}
            </span>
        ) : (
            <span className='filterStatusSpan'>
                SHOWING ALL TRANSLATIONS
                </span>
        )}
      </div>
      <div className="p-2 ms-auto">
        {filtersActive && (
            <Button
            variant='light'
            type='button'
            onClick={handleClearFilters}
            disabled={loading}
            // ARIA ATTRIBUTES:
            aria-label='Clear translation filters'
            >
                <FilterX aria-hidden='true' focusable='false'/> CLEAR
            </Button>
        )}
      </div>
      <div className="p-2">
        <Button
        onClick={toggleFilter}
        variant='light'
        type='button'
        id='toggleFilterBtn'
        // ARIA ATTRIBUTES:
        aria-expanded={showFilter}
        aria-controls={showFilter ? 'translationFilterPanal' : undefined}// Only point at the panal while it exists
        >
            <Filter aria-hidden='true' focusable='false'/> {showFilter ? 'HIDE FILTER' : 'SHOW FILTER'}
        </Button>
      </div>
    </Stack>
        </div>
        </Col>
    </Row>
    {showFilter && (
        <Row style={{width: '100%'}} id='translationFilterRow'>
        <Col style={{width: '100%'}} id='translationsFilterCol'>
        <FilterTranslations
            loading={loading}
            filters={filters}
            onApply={handleApplyFilters}
        />
        </Col>
    </Row>
    )}
    <Row id='translationsListRow'>
        <Col xs={12} md={12} id='translationsListCol'>
             <div id='translationsTableWrapper'>
        <table id='translationsTable'>
            <thead>
                <tr>
                    <th colSpan={6}>TRANSLATIONS</th>
                </tr>
                <tr>
                    <th>#</th>
                    <th>SOURCE TEXT</th>
                    <th>SOURCE LANGUAGE</th>
                    <th>TRANSLATED TEXT</th>
                    <th>TARGET LANGUAGE</th>
                    {/* BUTTONS */}
                    <th></th>
                </tr>
            </thead>
            <tbody>
                {loading && translations.length === 0 ? (
                    <tr>
                        <td colSpan={6}>LOADING TRANSLATIONS...</td>
                    </tr>
                ) : translations.length === 0 ? (
                    <tr>
                        <td colSpan={6}>{filtersActive ? 'NO TRANSLATIONS MATCH THESE FILTERS' : 'NO TRANSLATIONS YET'}</td>
                    </tr>
                ) : (
                    translations.map((translation, index) => (
                        <tr key={translation._id}>
                            <td>{rowNumber(index)}</td>
                            <td>{preview(translation.sourceText)}</td>
                            <td>{languageName(translation.sourceLanguage)}</td>
                            <td>{preview(translation.translatedText)}</td>
                            <td>{languageName(translation.targetLanguage)}</td>
                            <td>
                                <div className='translationBtnDiv'>
                                    <Button
                                    variant='light'
                                    id='viewTranslationBtn'
                                    type='button'
                                    onClick={() => setSelectedId(translation._id)}
                                    // ARIA ATTRIBUTES:
                                    aria-label={`View translation ${rowNumber(index)}`}
                                    aria-pressed={translation._id === selectedId}
                                    >VIEW</Button>
                                </div>
                            </td>
                        </tr>
                    ))
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
                        onPageChange={goToPage}
                        onLimitChange={handleLimitChange}
                        loading={loading}
                        controlId='translationPageSize'
                    />
                    </td>
                </tr>
            </tfoot>
        </table>
    </div>

        </Col>
    </Row>
    {/* SELECTED TRANSLATION PANAL (TranslationPanal.js) */}
    {selectedTranslation && (
    <Row style={{width: '100%'}} id='translationPanalRow'>
         <Col style={{width: '100%'}} id='translationCol'>
        <TranslationPanal
            translation={selectedTranslation}
            rowNumber={rowNumber(selectedIndex)}
            currentUser={currentUser}
            onClose={() => setSelectedId(null)}
            onCopy={handleCopy}
            onDelete={handleDelete}
            deleting={actionLoading}
        />
    </Col>
    </Row>
    )}
    </div>
  )
}
