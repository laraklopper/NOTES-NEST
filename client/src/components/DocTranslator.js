import React, { useCallback, useEffect, useRef, useState } from 'react'
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
    const [result, setResult] = useState(null)//What the server returned for the last upload
    const [loading, setLoading] = useState(false)// State variable to indicate if the form is submitting
    const [error, setError] = useState('')//Global error state
    const [copied, setCopied] = useState(false)//State to indicate if the translation is copied
    const [saving, setSaving] = useState(false)//State to indicate the SAVE request is in flight
    const [saved, setSaved] = useState(false)//Whether the translation on screen has been saved
    const [saveMessage, setSaveMessage] = useState('')//What the server said about the save

    const fileInputRef = useRef(null)//The file input is left uncontrolled
    const languagesTouched = useRef(false);

    //BOOLEAN VALUES
    const hasResult = Boolean(result?.translatedText);/*Only a translation the server has returned 
    can be copied or downloaded*/
    const canTranslate = Boolean(documentFile) && !loading;// Nothing to send until a file has been chosen
    const canClear = Boolean(documentFile || result || error);/* Only offer the clear action when 
    there is something to clear */

    useEffect(() => {
        if(languagesTouched.current) return;
        setSourceLang(defaultSourceLang)
        setTargetLang(defaultTargetLang)
    },[defaultSourceLang, defaultTargetLang])

    useEffect(() => {
        const controller = new AbortController()

        const fetchLanguages = async () => {
            try {
                const response = await fetch(`/api/language/translate/v2/languages`, {
                method: 'GET',//HTTP request method
                credentials: 'include',// Send the HTTP-only auth cookie
                mode: 'cors',
                headers: {
                    'Content-Type': 'application/json',// Specify the Content-Type in the request payload as JSON
                },
                signal: controller.signal,
                })

                 const fetchedLanguages = await response.json().catch(() => ([]));// Safely parse the JSON response (avoid crash if server returns non-JSON)

                 if (response.ok && Array.isArray(fetchedLanguages) && fetchedLanguages.length) {
                    setLanguages(fetchedLanguages);
                    console.log(`[SUCCESS: TranslateDocument.js] Fetched ${fetchedLanguages.length} supported languages`);
                }
            } catch (error) {
                if (error.name === 'AbortError') return;// Component unmounted
                // FALLBACK_LANGUAGES already in state; nothing else to do
                console.error('[ERROR: TranslateDocument.js] Failed to fetch supported languages:', error.message);// Log the error message in the console for debugging
            }
        }
        fetchLanguages()
        return() => controller.abort()
    },[])
     const handleSourceLangChange = useCallback((event) => {
        languagesTouched.current = true;
        setSourceLang(event.target.value);
    }, [])
    //Function to change the target language
    const handleTargetLangChange = useCallback((event) => {
        languagesTouched.current = true;
        setTargetLang(event.target.value);
    }, [])
     //Function to flip the language pair.
    const handleSwap = useCallback(() => {
        if (sourceLang === 'auto') return;// Nothing meaningful to swap from "auto"
        languagesTouched.current = true;
        setSourceLang(targetLang);
        setTargetLang(sourceLang);
    }, [sourceLang, targetLang])

    //Function to handle file changes
    /* Checks the chosen file against the limits the route enforces, so a file
    it would refuse is reported here rather than after being uploaded. */
    // const handleFileChange = useCallback((event) => {
    //     const [chosenFile] = event.target.files || [];
    //     setResult(null);// The result on screen belongs to the previous file
    //     setCopied(false);
    //     setSaved(false);
    //     setSaveMessage('');
    //     setError('');

    //     // Conditional rendering to check a file was chosen (the dialog can be cancelled)
    //     if (!chosenFile) {
    //         setDocumentFile(null);
    //         return;
    //     }

    //     // Conditional rendering to check the file is a PDF
    //     const isPdf = chosenFile.type === ACCEPTED_MIME_TYPE
    //         || chosenFile.name.toLowerCase().endsWith(ACCEPTED_EXTENSION);
    //     if (!isPdf) {
    //         console.error(`[ERROR: TranslateDocument.js] Rejected "${chosenFile.name}": not a PDF`);// Log an error message in the console for debugging purposes
    //         setDocumentFile(null);
    //         setError('Only PDF documents can be translated. Please choose a .pdf file.');// Set the error state to display the error in the UI
    //         return;
    //     }

    //     // Conditional rendering to check the file is within the upload limit
    //     if (chosenFile.size > MAX_FILE_SIZE_BYTES) {
    //         console.error(`[ERROR: TranslateDocument.js] Rejected "${chosenFile.name}": ${chosenFile.size} bytes`);// Log an error message in the console for debugging purposes
    //         setDocumentFile(null);
    //         setError(`The document is too large. Please choose a PDF of ${MAX_FILE_SIZE_MB} MB or less.`);// Set the error state to display the error in the UI
    //         return;
    //     }

    //     setDocumentFile(chosenFile);
    //     console.log(`[SUCCESS: TranslateDocument.js] Selected "${chosenFile.name}" (${chosenFile.size} bytes)`);
    // }, [])

    // Function to copy the translation to the clipboard with a brief confirmation state.
    const handleCopy = useCallback(async () => {
        if (!result?.translatedText) return;
        await navigator.clipboard.writeText(result.translatedText);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    })

        /* Hands the translation to the browser as a plain text file, named after
    the document it came from. Nothing is downloaded from the server: the text
    is already on the page, so the file is built here from a blob a generated
    link clicks. */
    const handleDownload = useCallback(() => {
        if (!result?.translatedText) return;

        const blob = new Blob([result.translatedText], { type: 'text/plain;charset=utf-8' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = downloadName(result.fileName, result.targetLanguage);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);// The file is saved, so the URL can be released

        console.log(`[SUCCESS: TranslateDocument.js] Downloaded ${link.download}`);
    }, [result])

      /* Function to clear the document form:
    Returns the form to its opening state. */
    const clearForm = useCallback(() => {
        setDocumentFile(null);
        setResult(null);
        setError('');
        setCopied(false);
        setSaved(false);
        setSaveMessage('');
        // Back to the user's saved defaults, the pair the form opened on
        languagesTouched.current = false;
        setSourceLang(defaultSourceLang);
        setTargetLang(defaultTargetLang);
        /* The chosen file lives on the input itself rather than in state, so
        emptying it is what takes the file name off the screen. */
        if (fileInputRef.current) fileInputRef.current.value = '';
        console.log('[SUCCESS: TranslateDocument.js] Document form cleared');
    }, [defaultSourceLang, defaultTargetLang])
    //=======================================================
  return (
    <form id='translateDocForm' method='POST'>
        <div id='formHeadingBlock'>
            <h3 id='formHeading'>TRANSLATE DOCUMENT</h3>
        </div>
        <div id='translateDocInput'>
            <fieldset id='translateDocGroup1'>
                <Stack gap={3}>
                    <div className="p-2" id='docLanguageSelectBlock'>
                        <div className='languageSelectDiv' id='selectSourceLangBlock'>
                            {/* LANGUAGE SELECTER */}
                            <div className='inputDiv'>
                                <label>SOURCE LANGUAGE</label>
                                <select
                                className='input'
                                >
                                    <option>AUTO-DETECT</option>
                                    {languages.map((language) => (
                                        <option key={language.code} value={language.code}>{language.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div id='swapLanguageDiv'>
                            {/* SWAP LANGUAGE BTN */}
                            <Button
                                variant='light'
                                size='sm'
                                id='swapLanguageBtn'
                                onClick={handleSwap}// Function to  flip source/target language and text
                                type='button'
                                title='Swap language'
                            >
                                <ArrowRightLeft aria-hidden='true' focusable='false' />

                            </Button>
                        </div>
                        <div className='languageSelectDiv' id='targetLangSelectdiv'>
                        {/* LANGUAGE SELECTOR */}
                        <div className='inputDiv'>
                            <label>TARGET LANGUAGE</label>
                            <select
                            className='input'
                            id='docTargetLang'
                            // name=''
                            // value={}
                            // onChange={}
                            disabled={loading}
                            >
                                    
                                    {languages.map((language) => (
                                        <option key={language.code} value={language.code}>{language.name}</option>
                                    ))}
                                </select>
                        </div>
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
