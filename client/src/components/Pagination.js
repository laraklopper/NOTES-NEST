//Pagination.js
import React from 'react'
// IMPORT CSS STYLESHEETS
import '../css/componentCss/ListTables.css'
// IMPORT BOOTSTRAP COMPONENTS
import Stack from 'react-bootstrap/Stack';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
// IMPORT ICONS FROM LUCIDE-REACT
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const PAGE_SIZES = [10, 20, 50];// Options for the "per page" select (server caps at 50)

/* Pagination controls (per page select, previous/next buttons and page count)
for NotesList.js, TranslationsList.js and UsersList.js */
export default function Pagination(
    {//PROPS PASSED FROM PARENT COMPONENT
        page = 1,// Current page
        totalPages = 1,
        total = 0,// Total number of items across all pages
        limit = PAGE_SIZES[0],// Items per page
        pageSizes = PAGE_SIZES,
        setPage,// Parent's page state setter
        setLimit,// Parent's limit state setter
        onChange,// Optional: runs after the page or limit changes (e.g. to close the details panal)
        loading = false,// Disables the controls while the list is loading
        controlId = 'pageSize'// Id for the per page select (must be unique on the page)
    }
) {
    // Move to another page
    const goToPage = (newPage) => {
        setPage?.(newPage)
        onChange?.()
    }

    // Changing the number per page starts again from page 1
    const handleLimitChange = (e) => {
        setLimit?.(Number(e.target.value))
        setPage?.(1)
        onChange?.()
    }

  return (
    <Stack gap={3} id='paginationStack'>
      <div className="p-2" id='paginationBlock1'>
        <Form.Group controlId={controlId}>
            <Form.Label className='m-0' id='pagLabel'>PER PAGE:</Form.Label>
            <Form.Select
            size='sm'
            value={limit}
            onChange={handleLimitChange}
            disabled={loading}
            >
                {pageSizes.map((size) => (
                    <option key={size} value={size}>{size}</option>
                ))}
            </Form.Select>
        </Form.Group>
      </div>
      <div className="p-2" id='paginationBlock2'>
        <Button
        variant='light'
        id='pagBtn1'
        size='sm'
        type='button'
        onClick={() => goToPage(page - 1)}
        disabled={loading || page <= 1}
        // ARIA ATTRIBUTES:
        aria-label='Previous page'
        ><ChevronLeft aria-hidden='true' focusable='false'/></Button>
        <span>
            PAGE {page} OF {totalPages} ({total} TOTAL)
        </span>
        <Button
        variant='light'
        id='pagBtn2'
        size='sm'
        type='button'
        onClick={() => goToPage(page + 1)}
        disabled={loading || page >= totalPages}
        // ARIA ATTRIBUTES:
        aria-label='Next page'
        ><ChevronRight aria-hidden='true' focusable='false'/></Button>
      </div>
    </Stack>
  )
}
