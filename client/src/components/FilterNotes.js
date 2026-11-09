import React from 'react'
// IMPORT CSS STYLESHEETS
import '../css/componentCss/FilterForms.css'
import '../css/componentCss/FormSetup.css'
// IMPORT BOOTSTRAP COMPONENTS
import Stack from 'react-bootstrap/Stack';
import Button from 'react-bootstrap/Button';
import languageData from '../util/languageData';
import { Search, Trash } from 'lucide-react';

export default function FilterNotes() {
  return (
    <form id='filterForm'>
        <div id='filterFormInput'>
                        <Stack direction="horizontal" gap={3} id='filterStack1'>
                    <fieldset className="p-2" id='filterByBlock'>
                        <legend className='visually-hidden'>FILTER BY:</legend>
                        <div className='inputDiv'>
                            <label className='filterLabel' htmlFor=''>LANGUAGE</label>
                            <select
                            className='input'
                            id='languageFilter'
                            // name=''
                            // value={}
                            // onChange={}
                            // ARIA ATTRIBUTES:
                            aria-required='false'
                            >
                            <option value=''>ALL LANGUAGES</option>
                            {languageData.map((language) => (
                                <option key={language.code} value={language.code}>{language.name}</option>
                            ))}
                            </select>
                        </div>
                        <div className='inputDiv'>
                           <label className='filterLabel' htmlFor=''>NOTEBOOK:</label>
                             <select
                             className='input'
                             id='notebookFilter'
                            //  name=''
                            // value={}
                            // onChange={}
                            aria-required='false'
                             >
                                <option value=''>ALL NOTEBOOKS:</option>
                            </select>
                        </div>
                        <div className='inputDiv'>
                            <label className='filterLabel' htmlFor=''>TAGS:</label>
                            <select
                             className='input'
                             id='tagFilter'
                            //  name=''
                            // value={}
                            // onChange={}
                            // ARIA ATTRIBUTES:
                            aria-required='false'
                            >
                                <option value=''>ALL TAGS</option>
                            </select>
                        </div>
                    </fieldset>
                </Stack>
     <Stack direction="horizontal" gap={3} id='filterStack2'>
      <div className="p-2"/>
      <div className="p-2 ms-auto">
        <Button 
         variant='light'
            type='submit'
            id='applyFilterBtn'
            // disabled={}
            // ARIA ATTRIBUTES:
            role='button'
            // aria-label=''
            // aria-disabled={}
        >
            APPLY <Search aria-hidden='true' focusable='false' />
        </Button>
      </div>
      <div className="p-2">
        <Button
            variant='danger'
            type='button'
            id='clearFilterBtn'
            // onClick={}
            // ARIA ATTRIBUTES:
            // aria-label=''
            // aria-disabled={}
                            >
                              CLEAR FILTERS <Trash aria-hidden='true' focusable='false'/> 
                            </Button>
      </div>
    </Stack>
        </div>
    </form>
  )
}
