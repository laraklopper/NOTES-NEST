//Translate.js
//IMPORT REQUIRED MODULES AND PACKAGES
import React, { useCallback, useState } from 'react'
// IMPORT CSS STYLESHEETS
import '../css/pagesCss/Translate.css'
import '../css/pagesCss/PageSetup.css'
// IMPORT BOOTSTRAP COMPONENTS
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import Stack from 'react-bootstrap/Stack';
// IMPORT CUSTOM COMPONENTS
import Footer from '../components/Footer'
import TranslateForm from '../components/TranslateForm';
import TranslationsList from '../components/TranslationsList';
import TrashedTranslations from '../components/TrashedTranslations';
import ArchivedTranslations from '../components/ArchivedTranslations';
import LanguagesList from '../components/LanguagesList';
import MainHeader from '../components/MainHeader';
// IMPORT ICONS FROM LUCIDE-REACT
import { Archive, ArchiveX, BookOpenCheck, BookOpenText, BookX, LanguagesIcon, Trash2Icon, TrashOff } from 'lucide-react';
import DocTranslator from '../components/DocTranslator';
import DocTranslationList from '../components/DocTranslationList';
import TrashArchiveDocs from '../components/TrashArchiveDocs';

// =======MAIN TRANSLATE COMPONENT============
export default function Translate(
  {//PROPS PASSED FROM PARENT COMPONENT (App.js)
    currentUser,
    logout,
    loggedIn
  }
) {
  // =========STATE VARIABLES=============
  const [showTranslator, setShowTranslator] = useState(false)
  const [documentTranslate, setDocumentTranslate] = useState(false)
  const [showTranslations, setShowTranslations] = useState(false)
  const [showTrash, setShowTrash] = useState(false)
  const [showDocTranslations ,setShowDocTranslations] = useState(false)
  const [showDocArchive, setShowDocArchive] = useState(false)
  const [showArchive, setShowArchive] = useState(false)
  const [showLang, setShowLang] = useState(false)


  // ============EVENT LISTENERS====================
  const toggleTranslator = useCallback(() => {
    setShowTranslator(prev => (!prev))
    setDocumentTranslate(false)
    setShowArchive(false)
    setShowTrash(false)
    setShowTranslations(false)
  },[])
  const toggleDocTranslator = useCallback(() => {
    setDocumentTranslate(prev => (!prev))
    setShowTranslator(false)
    setShowArchive(false)
    setShowTrash(false)
    setShowTranslations(false)
  },[])
  const toggleLang = useCallback(() => {
    setShowLang(prev => (!prev))
  }, [])
  const toggleTranslations = useCallback(() => {
    setShowTranslations(prev => (!prev))
    setShowTranslator(false)
    setDocumentTranslate(false)
    setShowTrash(false)
    setShowArchive(false)
  }, [])
  const toggleDocTranslations = useCallback(() => {
    setShowDocTranslations(prev => (!prev))
    setShowTranslations(false)
    setShowTranslator(false)
    setDocumentTranslate(false)
    setShowTrash(false)
    setShowArchive(false)
 
  }, [])
  const toggleDocArchive = useCallback(() => {
    setShowDocArchive(prev => (!prev))
     setShowTranslator(false)
    setDocumentTranslate(false)
    setShowTrash(false)
    setShowArchive(false)
    
  },[])
  const toggleArchive = useCallback(() => {
    setShowArchive(prev => (!prev))
    setShowTranslator(false)
    setDocumentTranslate(false)
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
         <Row id='toggleTranslatorRow'>
        <Col id='toggleTranslateCol1'/>
        <Col xs={5} id='toggleTranslateCol'>
          <Stack gap={2} id='toggleTranslatorStack'>
      <Button variant="light"
      onClick={toggleTranslator}
      id='toggleTranslator1Btn'
      >
        SHOW TRANSLATOR
      </Button>
      <Button 
        variant="light" 
        id='toggleTranslator2Btn'
        onClick={toggleDocTranslator}
        >
        SHOW DOCUMENT TRANSLATOR
      </Button>
    </Stack>
        </Col>
        <Col id='toggleTranslateCol2'/>
      </Row>
      <div id='translatorDiv'>
      {showTranslator && (
        <div id='translateForm1Panal'>
            <Row id='translatorRow1'>
              <Col xs={12} md={12} id='translatorCol1'>
                <div id='translatorPanal'>
                  <TranslateForm
                    currentUser={currentUser}
                  />
                </div>
              </Col>
            </Row>    
                      <div id='translateLanguagesPanal'>
<Row id='toggleLanguagesRow'>
              <Col id='toggleLangCol1'/>
              <Col xs={5} id='toggleLangCol'>
                
                <Button
                  variant='light'
                  id='toggleLangBtn'
                  onClick={toggleLang}
                  type='button'
                  aria-label={showLang ? 'HIDE AVAILABLE LANGUAGES' : 'SHOW AVAILABLE LANGUAGES'}
                  aria-pressed={showLang}
                  aria-expanded={showLang}
                  aria-controls='langaugeListPanal'
                >
                  {showLang ? (<>Hide Available Languages<BookX/></>) : <>Show Available Languages<LanguagesIcon/></>}
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
      )}
      {documentTranslate && (
        <div id='translateForm2Panal'>
          <Row id='translatorRow2'>
            <Col xs={12} md={12} id='translatorCol2'>
              <DocTranslator currentUser={currentUser}/>

            </Col>
          </Row>
          <div id='translateLanguagesPanal'>
<Row id='toggleLanguagesRow'>
              <Col id='toggleLangCol1'/>
              <Col xs={5} id='toggleLangCol'>
                
                <Button
                  variant='light'
                  id='toggleLangBtn'
                  onClick={toggleLang}
                  type='button'
                  aria-label={showLang ? 'HIDE AVAILABLE LANGUAGES' : 'SHOW AVAILABLE LANGUAGES'}
                  aria-pressed={showLang}
                  aria-expanded={showLang}
                  aria-controls='langaugeListPanal'
                >
                  {showLang ? (<>Hide Available Languages<BookX/></>) : <>Show Available Languages<LanguagesIcon/></>}
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
      )}
          </div>    
        </div>
      </section>
      <section id='translateSec2'>
        <div id='translationsListDiv'>
              <Row id='toggleTranslationsRow1'>
        <Col id='toggleTranslationsCol1'/>        <Col xs={5} id='toggleTranslationsCol2'>
           <Stack gap={3} id='toggleTranslationStack1'>
      <div className="p-2" id='toggleTranslationsBlock'>
      {/* BUTTON TO TOGGLE TRANSLATIONS */}
                  <Button
                    variant='light'
                    id='showTranslationsBtn'
                    onClick={toggleTranslations}
                    type='button'
                    aria-label={showTranslations ? 'HIDE TRANSLATIONS': 'SHOW TRANSLATIONS'}
                    aria-pressed={showTranslations}
                    aria-expanded={showTranslations}
                    aria-controls='translationListPanal'
                  >
                    {showTranslations ? (<>Hide Translations<BookX/></>): (<>Show Translations<BookOpenText/></>)}
                  </Button>
                </div>
      <div className="p-2" id='toggleDocsBlock'>
      {/* BUTTON TO TOGGLE TRANSLATEDOCUMENTS */}
        <Button
        variant='light'
        id='toggleDocumentsBtn'
        onClick={toggleDocTranslations}
        type='button'
        aria-label={showDocTranslations ? 'Hide Documents' : 'SHow documents'}
        aria-pressed={showDocTranslations}
        >
          {showDocTranslations ? 'Hide Documents' : 'SHow documents'}
        </Button>
      </div>
      
    </Stack>
        </Col>
        <Col id='toggleTranslationsCol3'/>
      </Row>
          {/* TRANSLATIONS LIST + TRANSLATED DOCUMENTS LIST */}
      <div id='translationListsPanal1'>
            {/* TOGGLE TRANSLATIONS LIST */}
            {showTranslations && (
              <div id='translationListPanal'>
                <TranslationsList
                  currentUser={currentUser}
                />
              </div>
            )}
            {showDocTranslations && (
              <div id='docListPanal'>
                <Row>
                  <Col md='12'>
                    <div>
                      <DocTranslationList/>
                    </div>
                  </Col>
                </Row>
              </div>
            )}
</div>
          <Row id='toggleTranslationsRow2'>
            <Col id='toggleTranslationsCol4'/>
            <Col xs={5} id='toggleTranslationsCol5'>
              <Stack gap={3} id='toggleTranslationStack2'>
                <div className="p-2" id='toggleTranslationsBlock2'>
                {/*  */}
                  <Button
                    variant='light'
                    id='showArchivedDocsBtn'
                    onClick={toggleDocArchive}
                    type='button'
                    aria-label={showDocArchive ? 'HIDE TRANSLATED DOCUMENTS': 'SHOW TRANSLATED DOCUMENTS'}
                    aria-pressed={showDocArchive}
                    aria-expanded={showDocArchive}
                    aria-controls='translationListPanal'
                  >
                    {showDocArchive ? (<>Hide Documents<ArchiveX/></>): (<>Document Archive/Trash<Archive/></>)}
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
                    aria-pressed={showArchive}
                    aria-expanded={showArchive}
                    aria-controls='archivedTranslationPanal'
                  >
                    {showArchive ? (<>
                        Hide Archive
                        <ArchiveX aria-hidden='true' focusable='false'/>
                        </>
                        ): (
                        <>
                        Show Archive
                        <Archive aria-hidden='true' focusable='false'/>
                        </>)}
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
                    aria-controls='deletedTranslationPanal'
                  >
                    {showTrash ? (<>Hide Trash <TrashOff/> </>) : (<>Show Trash<Trash2Icon/></>)}
                  </Button>
                </div>
              </Stack>
            </Col>
            <Col id='toggleTranslationsCol6'/>
          </Row>
          {/* TRANSLATIONS LIST + TRANSLATIONS ARCHIVE + TRANSLATIONS TRASH + TRANSLATED DOCUMENTS TRASH AND ARCHIve*/}
          <div id='translationListPanal2'>       
            {/* TOGGLE ARCHIVED TRANSLATIONS */}
            {showArchive && (
              <div id='archivedTranslationPanal'>
                <Row id='translationsArchiveRow'>
                  <Col id='translationsArchiveCol' md='12'>
                    <ArchivedTranslations/>
                  </Col>
                </Row>
              </div>
            )}
            {/* TOGGLE TRASHED TRANSLATIONS */}
            {showTrash && (
              <div id='deletedTranslationPanal'>
                <Row id='translationTrashRow'>
                  <Col md={12} id='translationTrashCol'>
                    <TrashedTranslations/>
                  </Col>
                </Row>
              </div>
            )}
            {/* DOCUMENT ARCHIVE AND TRASH */}
            {showDocArchive && (
              <div id='documentArchivePanal'>
                <Row id='docArchiveRow'>
                  <Col id='docArchiveCol'>
                    <div>
                      <TrashArchiveDocs/>
                    </div>
                  </Col>
                </Row>
              </div>
            )}
          </div>

        </div>
      </section>
      <Footer logout={logout} loggedIn={loggedIn} />
    </div>
  )
}
