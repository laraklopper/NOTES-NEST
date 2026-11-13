//Translate.js
import React, { useCallback, useState } from 'react'
import '../css/pagesCss/Translate.css'
import '../css/pagesCss/PageSetup.css'
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import Stack from 'react-bootstrap/Stack';
import Tab from 'react-bootstrap/Tab';
import Tabs from 'react-bootstrap/Tabs';
import Header from '../components/Header'
import Footer from '../components/Footer'
import TranslateForm from '../components/TranslateForm';
import { BookOpenCheck } from 'lucide-react';
import TranslationsList from '../components/TranslationsList';
import TrashedTranslations from '../components/TrashedTranslations';
import ArchivedTranslations from '../components/ArchivedTranslations';
import LanguagesList from '../components/LanguagesList';
export default function Translate(
  {//PROPS PASSED FROM PARENT COMPONENT (App.js)
    currentUser,
    logout
  }
) {
  // =========STATE VARIABLES=============
  const [key, setKey] = useState('translator')
  const [showTrash, setShowTrash] = useState(false)
  const [showArchive, setShowArchive] = useState(false)


  const toggleArchive = useCallback(() => {
    setShowArchive(prev => (!prev))
    setShowTrash(false)
  }, [])

  const toggleTrash = useCallback(() => {
    setShowTrash(prev => (!prev))
    setShowArchive(false)
  }, [])
  //=============JSX RENDERING====================
  return (
    <div id='pageContainer' role='main' aria-labelledby='pageTitle'>
      {/* ---------Screen Reader Heading------------------ */}
      <p className='visually-hidden' id='pageTitle'>TRANSLATE PAGE</p>
      <Header heading={'TRANSLATE'} currentUser={currentUser} />
      <Row id='eventRow'>
        <Col id='eventCol'>
          <div className='eventBar'>
            <div className='eventTrack'>
              <BookOpenCheck className='eventSlide' size={32} aria-hidden='true' focusable='false' />
            </div>
          </div>
        </Col>
      </Row>
      <section id='translateSec1'>
        <div id='translateSectionPanal'>
          <Tabs
            id="translateTabs"
            activeKey={key}
            onSelect={(k) => setKey(k)}
            className="mb-3"
          >
            {/* TRANSLATE FORM */}
            <Tab eventKey="translator" title="translate">
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
              </div>
            </Tab>
            {/* TRANSLATIONS LIST */}
            <Tab eventKey="translations" title="translations">
              <div id='translationListPanal'>
                <TranslationsList
                  currentUser={currentUser}
                  active={key === 'translations'}// Re-fetches each time the tab opens, so newly saved translations show
                />
              </div>
            </Tab>
            {/* TRASHED TRANLATIONS */}
            <Tab eventKey="trash" title='ARCHIVE & TRASH'>
              <div id='translationTrashPanal'>
                     <Row id='toggleTranslationsRow'>
                    <Col id='toggleTranslationsCol1'/>
                    <Col xs={6} id='toggleTranslationsCol'>
                      <Stack gap={3} id='toggleTranslationStack'>
                        <div className="p-2" id='toggleArchiveBlock'>
                          <Button
                          variant='light'
                          id='toggleArchiveBtn'
                          onClick={toggleArchive}
                          type='button'
                          // ARIA ATTRIBUTES: 
                          >
                            {showArchive ? 'Hide Archive': 'Show Archive' }
                          </Button>
                        </div>
                        <div className="p-2" id='toggleTrashBlock'>
                          <Button
                          variant='light'
                          onClick={toggleTrash}
                          id='toggleTrashBtn'
                          type='button'
                          // ARIA ATTRIBUTES: 

                          >
                          {showTrash ? 'Hide Trash' : 'SHOW TRASH'}
                           
                          </Button>
                        </div>
                      </Stack>
                    </Col>
                    <Col id='toggleTranslationsCol2'/>
                  </Row>
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
            </Tab>
            {/* API LANGUAGES LIST */}
            <Tab eventKey="languages" title="LANGUAGES">
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
            </Tab>
          </Tabs>
        </div>
      </section>
      <Footer logout={logout} />
    </div>
  )
}
