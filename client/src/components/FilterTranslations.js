import React from 'react'
import '../css/componentCss/FormSetup.css'
import Stack from 'react-bootstrap/Stack';
import Button from 'react-bootstrap/Button';
import { Search } from 'lucide-react';
import languageData from '../util/languageData';
export default function FilterTranslations({loading , handleLanguageFilter, targetLanguage}) {
  return (
    <form id='filterForm' aria-busy={loading}>
        <div id='formHeadingBlock' hidden>
                <p className='visually-hidden' id='formTitle'>FILTER TRANSLATIONS</p>
            </div>
        <div>
             <Stack direction="horizontal" gap={3} id='filterStack1'>
       <div className="p-2" id='filterByBlock'>
              <label className='visually-hidden'>FILTER BY:</label>
              <div className='inputDiv'>
                  <label className='filterLabel'>SOURCE LANGUAGE</label>
                  <select 
                      className='input' 
                      value={targetLanguage} 
                      onChange={handleLanguageFilter}
                      >
                       <option value=''>All languages</option>
                                          {languageData.map((language) => (
                                              <option key={language.code} value={language.code}>{language.name}</option>
                                          ))}
                  </select>
              </div>
              <div className='inputDiv'>
                  <label className='filterLabel'>TARGET LANGUAGE:</label>
                   <select 
                      className='input' 
                      value={targetLanguage} 
                      onChange={handleLanguageFilter}
                      >
                       <option value=''>All languages</option>
                                          {languageData.map((language) => (
                                              <option key={language.code} value={language.code}>{language.name}</option>
                                          ))}
                  </select>
              </div>
            </div>
      <div className="p-2 ms-auto"/>
      <div className="p-2"/>
    </Stack>
    <Stack direction="horizontal" gap={3}>
      <div className="p-2"/>
      <div className="p-2 ms-auto">
          <Button
   variant='light'
        type='submit'
        id='applyFilterBtn'
        >
            APPLY <Search aria-hidden='true' focusable='false'/>
        </Button>
      </div>
      <div className="vr" />
      <div className="p-2">
        <Button
        variant='danger'
        type='button'
        id='clearFormBtn'
        >
            CLEAR FILTERS
        </Button>
      </div>
    </Stack>
        </div>


    </form>
  )
}
