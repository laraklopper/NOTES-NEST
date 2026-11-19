import React, { useCallback, useRef, useState } from 'react'
import '../css/componentCss/Translator.css'
import Stack from 'react-bootstrap/Stack';
import Button from 'react-bootstrap/Button';
import { ArrowRightLeft } from 'lucide-react';
import { FALLBACK_LANGUAGES, FALLBACK_SOURCE_LANG, FALLBACK_TARGET_LANG } from '../util/languageFunc';

export default function DocTranslator(
    {
        currentUser
    }
    ) {
        /* The language pair the form opens on, and the pair CLEAR FORM returns to:
    the logged-in user's saved defaults from GET /user/me, falling back to the
    constants above. */
    const defaultSourceLang = currentUser?.defaultLanguages?.defaultSourceLang || FALLBACK_SOURCE_LANG;
    const defaultTargetLang = currentUser?.defaultLanguages?.defaultTargetLang || FALLBACK_TARGET_LANG;
    const [languages, setLanguages] = useState(FALLBACK_LANGUAGES);
    const [sourceLang, setSourceLang] = useState(defaultSourceLang)//State to store the source language
    const [targetLang, setTargetLang] = useState(defaultTargetLang)//State to store the target language
    const [documentFile, setDocumentFile] = useState(null)//The PDF the user chose

    const languagesTouched = useRef(false);
     //Function to flip the language pair.
    const handleSwap = useCallback(() => {
        if (sourceLang === 'auto') return;// Nothing meaningful to swap from "auto"
        languagesTouched.current = true;
        setSourceLang(targetLang);
        setTargetLang(sourceLang);
    }, [sourceLang, targetLang])

    //=======================================================
  return (
    <form id='translateDocForm' method='POST'>
        <div id='formHeadingBlock'>
            <h3 id='formHeading'>TRANSLATE DOCUMENT</h3>
        </div>
        <div id='translateDocInput'>
            <fieldset id='translateDocGroup1'>
                <Stack gap={3}>
                    <div className="p-2">
                        <div className='languageSelectDiv' id='selectSourceLangBlock'>
                            {/* LANGUAGE SELECTER */}
                        </div>
                        <div id='swapLanguageDiv'>
                            {/* SWAP LANGUAGE BTN */}
                            <Button
                                variant='light'
                                size='sm'
                                id='swapLanguageBtn'
                                // onClick={handleSwap}// Function to  flip source/target language and text
                                type='button'
                                title='Swap language'
                            >
                                <ArrowRightLeft aria-hidden='true' focusable='false' />

                            </Button>
                        </div>
                        <div className='languageSelectDiv' id='targetLangSelectdiv'>
                        {/* LANGUAGE SELECTOR */}
                        </div>
                    </div>
                    <div className="p-2">Second item</div>
                    <div className="p-2">Third item</div>
                </Stack>
            </fieldset>

        </div>
    </form>
  )
}
