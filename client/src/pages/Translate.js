//Translate.js
import React, { useCallback, useState } from 'react'
import '../css/pagesCss/Translate.css'
import '../css/pagesCss/PageSetup.css'
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import Stack from 'react-bootstrap/Stack';
// IMPORT CUSTOM COMPONENTS
import Footer from '../components/Footer'
import TranslateForm from '../components/TranslateForm';
import { BookOpenCheck } from 'lucide-react';
import TranslationsList from '../components/TranslationsList';
import TrashedTranslations from '../components/TrashedTranslations';
import ArchivedTranslations from '../components/ArchivedTranslations';
import LanguagesList from '../components/LanguagesList';
import MainHeader from '../components/MainHeader';
export default function Translate(
  {//PROPS PASSED FROM PARENT COMPONENT (App.js)
    currentUser,
    logout,
    loggedIn
  }
) {
  // =========STATE VARIABLES=============
 
  const [showTranslations, setShowTranslations] =useState(false)
  const [showTrash, setShowTrash] = useState(false)
  const [showArchive, setShowArchive] = useState(false)
  const [showLang, setShowLang] = useState(false)


  const toggleLang = useCallback(() => {
    setShowLang(prev => (!prev))
  }, [])
  const toggleTranslations =useCallback(() => {
    setShowTranslations(prev => (!prev))
    setShowTrash(false)
    setShowArchive(false)
  }, [])
  const toggleArchive = useCallback(() => {
    setShowArchive(prev => (!prev))
    setShowTrash(false)
    setShowTranslations(false)
  }, [])

  const toggleTrash = useCallback(() => {
    setShowTrash(prev => (!prev))
    setShowArchive(false)
        setShowTranslations(false)

  }, [])
  //=============JSX RENDERING====================
  return (
    <div id='pageContainer' role='main' aria-labelledby='pageTitle'>
      {/* ---------Screen Reader Heading------------------ */}
      <p className='visually-hidden' id='pageTitle'>TRANSLATE PAGE</p>
      {/* Render the MainHeader.js component with 'TRANSLATE' as the Heading */}
      <MainHeader heading={'TRANSLATE'} currentUser={currentUser} loggedIn={loggedIn}/>
      {/* ==========EVENT/ANIMATION=========== */}
      <Row id='eventRow' role='presentation'>
        <Col id='eventCol'>
          <div className='eventBar'>
            <div className='eventTrack'>
              <BookOpenCheck className='eventSlide' color='#000' size={32} aria-hidden='true' focusable='false' />
            </div>
          </div>
        </Col>
      </Row>
      {/* -----------------
      SECTION 1: TranslationsList
      --------------- */}
      <section id='translateSec1'>
        <div id='translateSectionPanal'>
         {/* TRANSLATE FORM */}
        <div id='translatorDiv'>
                <Row id='translatorRow'>
                  <Col xs={12} md={12} id='translatorCol'>
                    <div id='translatorPanal'>
                      <TranslateForm
                        currentUser={currentUser}
                      />
                    </div>
                  </Col>
                </Row>
           <Row id='toggleLanguagesRow'>
        <Col id='toggleLangCol1'/>
        <Col xs={5} id='toggleLangCol'>
          <Button
          variant='light'
          id='toggleLangBtn'
          onClick={toggleLang}
          >
            {showLang ? 'HIDE AVAILABLE LANGUAGES' : 'SHOW AVAILABLE LANGUAGES'}
          </Button>
        </Col>
        <Col id='toggleLangCol2'/>
      </Row>
       {/* API LANGUAGES LIST */}
      {showLang && (
         <div id='langaugeListPanal'>
                {/* Langauges */}
                <div id='languageList'>
                <Row id='langaugeListRow'>
                  <Col id='languageListCol1' />
                  <Col xs={12} md={8} id='languageListCol'>
                    <LanguagesList/>
                  </Col>
                  <Col id='languageListCol2' />
                </Row>
                </div>
              </div>
      )}
              </div>
        </div>
      </section>
      <section id='translateSec2'>
            <div id='translationsListDiv'>
               <Row id='toggleTranslationsRow'>
        <Col id='toggleTranslationsCol1'/>
        <Col xs={5} id='toggleTranslationsCol'>
             <Stack gap={3} id='toggleTranslationStack'>
             <div className="p-2" id='toggleTranslationsBlock'>
 <Button
 variant='light'
         id='showTranslationsBtn'
         onClick={toggleTranslations}
         >
          SHOW TRANSLATIONS
         </Button>
             </div>
                        <div className="p-2" id='toggleArchiveBlock'>
                          <Button
                          variant='light'
                          id='toggleTranslateArchiveBtn'
                          onClick={toggleArchive}
                          type='button'
                          // ARIA ATTRIBUTES:
                          aria-label={showArchive ? 'Hide Archive': 'Show Archive' }
                          >
                            {showArchive ? 'Hide Archive': 'Show Archive' }
                          </Button>
                        </div>
                        <div className="p-2" id='toggleTrashBlock'>
                          <Button
                          variant='light'
                          onClick={toggleTrash}
                          id='toggleTranslateTrashBtn'
                          type='button'
                          // ARIA ATTRIBUTES: 
                          aria-label={showTrash ? 'Hide Trash' : 'SHOW TRASH'}
                          aria-pressed={showTrash}
                          aria-expanded={showTrash}

                          >
                          {showTrash ? 'Hide Trash' : 'SHOW TRASH'}
                           
                          </Button>
                        </div>
                      </Stack>
          
        </Col>
         <Col id='toggleTranslationsCol2'/>
        </Row>
          <div id='translationListsPanal'>
        {showTranslations && (
               <div id='translationListPanal'>
                <TranslationsList
                  currentUser={currentUser}
                />
              </div>
        )}
     
                  <div id='listsDiv'>
                {showArchive && (
                  <div id='archivedTranslationPanal'>
                  <Row id='translationsArchiveRow'>
                      <Col id='translationsArchiveCol' md='12'>
                          <ArchivedTranslations/>                
                     </Col>
                  </Row>
                     </div>
                )}
                {showTrash && (
                  <div id='deletedTranslationPanal'>
                  <Row id='translationTrashRow'>
                    <Col md={12} id='translationTrashCol'>
                        <TrashedTranslations/>
                    </Col>
                  </Row>
                  </div>
                )}
                </div>
              </div>
            </div>
      </section>
      <Footer logout={logout} loggedIn={loggedIn} />
    </div>
  )
}
