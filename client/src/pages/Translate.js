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
import ArchivedTranslations from '../components/ArchivedTranslations';
import LanguagesList from '../components/LanguagesList';
import MainHeader from '../components/MainHeader';
import DocTranslator from '../components/DocTranslator';
import DocTranslationList from '../components/DocTranslationList';
import TrashArchiveDocs from '../components/TrashArchiveDocs';
// IMPORT ICONS FROM LUCIDE-REACT
import { Archive, ArchiveX, BookOpenCheck, FileSymlink , MessageCircleX , 
  BookOpenText, BookX, LanguagesIcon, ScanText, FolderOpen, FolderClosed } from 'lucide-react';
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
  const [showDocTranslations ,setShowDocTranslations] = useState(false)
  const [showDocArchive, setShowDocArchive] = useState(false)
  const [showArchive, setShowArchive] = useState(false)
  const [showLang, setShowLang] = useState(false)


  // ============EVENT LISTENERS====================
  // TOGGLE BUTTONS
  // Function to toggle Text translator
  const toggleTranslator = useCallback(() => {
    setShowTranslator(prev => (!prev))
    setDocumentTranslate(false)
    setShowArchive(false)   
    setShowDocArchive(false)
    setShowTranslations(false)
  },[])
    // Function to toggle Document translator
  const toggleDocTranslator = useCallback(() => {
    setDocumentTranslate(prev => (!prev))
    setShowTranslator(false)
    setShowArchive(false)
    setShowDocArchive(false)
    setShowTranslations(false)
  },[])
   // Function to toggle API languages
  const toggleLang = useCallback(() => {
    setShowLang(prev => (!prev))
  }, [])
  // Function to toggle text translations
  const toggleTranslations = useCallback(() => {
    setShowTranslations(prev => (!prev))
    setShowTranslator(false)
    setShowDocTranslations(false)
    setDocumentTranslate(false)
    setShowArchive(false)
  }, [])
  // Function to toggle text translations
  const toggleDocTranslations = useCallback(() => {
    setShowDocTranslations(prev => (!prev))
    setShowTranslations(false)
    setShowTranslator(false)
    setDocumentTranslate(false)
    setShowArchive(false)
  }, [])
  const toggleDocArchive = useCallback(() => {
    setShowDocArchive(prev => (!prev))
     setShowTranslator(false)
    setDocumentTranslate(false)
    setShowArchive(false)
    
  },[])
  const toggleArchive = useCallback(() => {
    setShowArchive(prev => (!prev))
    setShowTranslator(false)
    setDocumentTranslate(false)
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
      SECTION 1: Translate Forms
      --------------- */}
      <section id='translateSec1'>
        <div id='translateSectionPanal'>
         <Row id='toggleTranslatorRow'>
        <Col id='toggleTranslateCol1'/>
        <Col xs={5} id='toggleTranslateCol'>
        {/* STACK 1: TOGGLE TRANSLATORS STACK */}
          <Stack gap={2} id='toggleTranslatorStack'>
          <div className='p-2' id='toggleTranslator1Block'>
      {/* Toggle Translate Form Button */}
        {showTranslator ? (<span className='btnTextSpan'><h6>Hide Translator</h6><MessageCircleX  size={24} aria-hidden='true' focusable='false'/>
        </span>) : (
          <span className='btnTextSpan'>
          <h6>Open Text Translator</h6><ScanText size={24} aria-hidden='true' focusable='false'/></span>)}
      <Button 
      variant="light"
      onClick={toggleTranslator}
      id='toggleTranslator1Btn'
      type='buttons'
      // ARIA ATTRIBUTES:
      aria-label={showTranslator ? 'Hide Translator' : 'Translate Text'}
      aria-pressed={showTranslator}
      aria-expanded={showTranslator}
      aria-controls='translateForm1Panal'
      >
      {showTranslator ? 'Hide Translator' : 'Translate Text'}
      
      </Button>
      </div>
      <div className='p-2'  id='toggleTranslator2Block'>
         {documentTranslate ? (
          <span className='btnTextSpan'>
            <h6>Hide Translator</h6>   
            <MessageCircleX size={24} aria-hidden='true' focusable='false'/>
          </span>
          ) :(<span className='btnTextSpan'>
        <h6>Translate Document</h6>
           <FileSymlink aria-hidden='true' focusable='false'/>
        </span>) }
        <Button 
        variant="light" 
        id='toggleTranslator2Btn'
        onClick={toggleDocTranslator}
        // ARIA ATTRIBUTES:
        aria-label={documentTranslate ? 'Hide Document Translator' : 'Translate Document'}
        aria-pressed={documentTranslate}
        aria-expanded={documentTranslate}
        aria-controls='translateForm2Panal'
        >
        {documentTranslate ? 'Hide  Translator' : 'TRANSLATE Document'}
      </Button>
      </div>
    </Stack>
        </Col>
        <Col id='toggleTranslateCol2'/>
      </Row>
      <div id='translatorDiv'>
      {/* TOGGLE THE TEXT TRANSLATOR FORM */}
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
                {/* Button to toggle Languages */}
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
            {/* TOGGLE API LANGUAGES LIST */}
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
      {/* TOGGLE THE DOCUMENT TRANSLATOR FORM */}
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
                {/* Button to toggle API languages */}
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
            {/* TOGGLE API LANGUAGES LIST */}
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
      {/* -----------------
      SECTION 2: TEXT AND DOCUMENT TRANSLATIONS LIST
      ----------------------- */}
      <section id='translateSec2'>
        <div id='translationsListDiv' role='region'>
        {/* Row 1: toggle translations buttons */}
         <Row id='toggleTranslationsRow1'>
         {/* Toggle translations lists */}
        <Col xs={6} id='toggleTranslationsCol1'>
                {/* TOGGLE TRANSLATIONS: TEXT AND DOCUMENTS */}
          <Stack gap={3} id='toggleTranslationStack1' role='group'>
            <div className="p-2" id='toggleTranslationsBlock'>
        {showTranslations ? (
          <span className='btnTextSpan'>
          <h6>CLOSE TEXT <br/>TRANSLATIONS</h6><BookX aria-hidden='true' focusable='false'/>
          </span>
                  ):(
                    <span className='btnTextSpan'>
                    <h6>OPEN TEXT <br/> TRANSLATIONS</h6><BookOpenText aria-hidden='true' focusable='false'/>
                    </span>   
                  )}
              {/* BUTTON TO TOGGLE TEXT TRANSLATIONS */}
                  <Button
                    variant='light'
                    id='showTranslationsBtn'
                    onClick={toggleTranslations}
                    type='button'
                    aria-label={showTranslations ? 'HIDE TEXT TRANSLATIONS': 'SHOW TEXT TRANSLATIONS'}
                    aria-pressed={showTranslations}
                    aria-expanded={showTranslations}
                    aria-controls='translationListPanal'
                  >
                    {showTranslations ? 'Hide Translations': 'Text Translations'}
                  </Button>
                </div>
      <div className="p-2" id='toggleDocsBlock'>
        {showDocTranslations ? (
          <span className='btnTextSpan'>
           <h6>CLOSE TRANSLATED <br/> DOCUMENTS</h6>
           <FolderClosed aria-hidden='true' focusable='false'/>
          </span>  
                  ):(
                    <span className='btnTextSpan'>
           <h6>OPEN TRANSLATED <br/>DOCUMENTS</h6>
           <FolderOpen  size={24} aria-hidden='true' focusable='false'/>
          </span>
                  )}
      {/* BUTTON TO TOGGLE TRANSLATED DOCUMENTS */}
        <Button
        variant='light'
        id='toggleDocumentsBtn'
        onClick={toggleDocTranslations}
        type='button'
        aria-label={showDocTranslations ? 'Hide Documents' : 'SHow documents'}
        aria-pressed={showDocTranslations}
        aria-expanded={showDocTranslations}
        aria-controls='docListPanal'
        >
          {showDocTranslations ? 'Hide' : 'Open Translations'}
        </Button>
      </div>
      
    </Stack>
        </Col>
        {/* Toggle Trashed and archived 
        text and trashed translations */}
        <Col xs={6} toggleTranslationsCol2>
            {/* STACK TOGGLE ARCHIVED AND TRASHED TRANSLATIONS BUTTONS */}
              <Stack gap={3} id='toggleTranslationStack2' role='group'>
                <div className="p-2" id='toggleTranslationArchiveBlock1'>
                 {showArchive ? (<span className='btnTextSpan'>
                        <h6>Close Archived and trashed text translations </h6>
                        <ArchiveX aria-hidden='true' focusable='false'/>
                        </span>
                        ): (
                        <span className='btnTextSpan'>
                       <h6 style={{textAlign:'center'}}>Open Archived and trashed <br/>text translations</h6> 
                        <Archive aria-hidden='true' focusable='false'/>
                        </span>)}
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
                    {showArchive ? 'Hide Archive':'Archive/Trash'}
                  </Button>
                </div>               
                <div className="p-2" id='toggleTranslationsArchiveBlock2'>
                  {showDocArchive ? (
                    <span className='btnTextSpan'>
                      <h6>HIDE ARCHIVED AND TRASHED DOCUMENTS</h6><ArchiveX/>
                    </span>
                  ):(
                    <span className='btnTextSpan'>
                    <h6 style={{textAlign: 'center'}}>OPEN ARCHIVED AND TRASHED <br/>TRANSLATED DOCUMENTS</h6><Archive/>
                    </span>
                  )}
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
                    {showDocArchive ? 'Hide Documents': 'Archive/Trash'}
                  </Button>
                </div>
              </Stack>
        </Col>
      </Row>
          {/* TRANSLATIONS LIST + TRANSLATED DOCUMENTS LIST */}
      <div id='translationListsPanal1' role='group' aria-labelledby='listGroup1'>
      <p className='visually-hidden' id='listGroup1'>Open text and document translations</p>
            {/* TOGGLE TRANSLATIONS LIST */}
            {showTranslations && (
              <div id='translationListPanal'>
                <TranslationsList
                  currentUser={currentUser}
                />
              </div>
            )}
            {/* TOGGLE DOCUMENT TRANSLATIONS */}
            {showDocTranslations && (
              <div id='docListPanal'>
                <Row id='docsListRow'>
                  <Col md='12' id='docsListCol'>
                    <div id='docsList'>
                      <DocTranslationList/>
                    </div>
                  </Col>
                </Row>
              </div>
            )}
        </div>
          {/* TRANSLATIONS ARCHIVE + TRANSLATIONS TRASH + 
          TRANSLATED DOCUMENTS TRASH AND ARCHIVE*/}
          <div id='translationListPanal2' role='group' aria-labelledby='listGroup2'>  
          <p className='visually-hidden' id='listGroup2'>Open archived and deleted text and document translations</p>     
            {/* TOGGLE ARCHIVED AND TRASH TEXT TRANSLATIONS */}
            {showArchive && (
              <div id='archivedTranslationPanal'>
                <Row id='translationsArchiveRow'>
                  <Col id='translationsArchiveCol' md='12'>
                    <ArchivedTranslations/>
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
