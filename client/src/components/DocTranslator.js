/* DocTranslator.js:The document translator: uploads a PDF, 
and shows the translation of the text read out of it.*/
//IMPORT REQUIRED MODULES AND PACKAGES
import React, { useCallback, useEffect, useRef, useState } from 'react'
// IMPORT CSS STYLESHEETS
import '../css/componentCss/Translator.css';
import '../css/componentCss/FormSetup.css';
// IMPORT BOOTSTRAP COMPONENTS
import Stack from 'react-bootstrap/Stack';
import Button from 'react-bootstrap/Button';
// IMPORT ICONS FROM LUCIDE-REACT
import { ArrowRightLeft, FileText,SavePlus, Check, Copy, Download, Bug, Eraser  } from 'lucide-react';
// IMPORT BOOTSTRAP COMPONENTS
import { FALLBACK_LANGUAGES, FALLBACK_SOURCE_LANG, FALLBACK_TARGET_LANG } from '../util/languageFunc';
import { ACCEPTED_EXTENSION, ACCEPTED_MIME_TYPE, MAX_FILE_SIZE_MB, MAX_FILE_SIZE_BYTES, downloadName } from '../util/formUtil';

//DocTranslator function component
export default function DocTranslator(//Export default DocTranslator.js function component
    {//PROPS PASSED FROM PARENT COMPONENT (Translate.js)
        currentUser
    }
    ) {
    /* The language pair the form opens on, and the pair CLEAR FORM returns to:
    the logged-in user's saved defaults from GET /user/me, falling back to the
    constants above. */
    const defaultSourceLang = currentUser?.defaultLanguages?.defaultSourceLang || FALLBACK_SOURCE_LANG;
    const defaultTargetLang = currentUser?.defaultLanguages?.defaultTargetLang || FALLBACK_TARGET_LANG;
    // ===========STATE VARIABLES========================
    const [languages, setLanguages] = useState(FALLBACK_LANGUAGES);//
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

    //======USE REF==================
    const fileInputRef = useRef(null)//The file input is left uncontrolled
    const languagesTouched = useRef(false);//Whether either selector has been changed by hand

    //BOOLEAN VALUES
    const hasResult = Boolean(result?.translatedText);/*Only a translation the server has returned 
    can be copied or downloaded*/
    const canTranslate = Boolean(documentFile) && !loading;// Nothing to send until a file has been chosen
    const canClear = Boolean(documentFile || result || error);/* Only offer the clear action when 
    there is something to clear */

    //===========EFFECTS====================
    /* Opens the selectors on the user's saved default pair. This runs on mount
    and again whenever those defaults change */
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
    const handleFileChange = useCallback((event) => {
        const [chosenFile] = event.target.files || [];
        setResult(null);// The result on screen belongs to the previous file
        setCopied(false);
        setSaved(false);
        setSaveMessage('');
        setError('');

        // Conditional rendering to check a file was chosen (the dialog can be cancelled)
        if (!chosenFile) {
            setDocumentFile(null);
            return;
        }

        // Conditional rendering to check the file is a PDF
        const isPdf = chosenFile.type === ACCEPTED_MIME_TYPE
            || chosenFile.name.toLowerCase().endsWith(ACCEPTED_EXTENSION);
        if (!isPdf) {
            console.error(`[ERROR: TranslateDocument.js] Rejected "${chosenFile.name}": not a PDF`);// Log an error message in the console for debugging purposes
            setDocumentFile(null);
            setError('Only PDF documents can be translated. Please choose a .pdf file.');// Set the error state to display the error in the UI
            return;
        }

        // Conditional rendering to check the file is within the upload limit
        if (chosenFile.size > MAX_FILE_SIZE_BYTES) {
            console.error(`[ERROR: TranslateDocument.js] Rejected "${chosenFile.name}": ${chosenFile.size} bytes`);// Log an error message in the console for debugging purposes
            setDocumentFile(null);
            setError(`The document is too large. Please choose a PDF of ${MAX_FILE_SIZE_MB} MB or less.`);// Set the error state to display the error in the UI
            return;
        }

        setDocumentFile(chosenFile);
        console.log(`[SUCCESS: TranslateDocument.js] Selected "${chosenFile.name}" (${chosenFile.size} bytes)`);
    }, [])

    // Function to copy the translation to the clipboard with a brief confirmation state.
    const handleCopy = useCallback(async () => {
        if (!result?.translatedText) return;
        await navigator.clipboard.writeText(result.translatedText);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    },[result?.translatedText])

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

     //==============REQUESTS=====================
    /* Uploads the document and renders the translation that comes back.*/
    const handleSubmit = useCallback(async (event) => {
        event.preventDefault();//Prevent default form submission

        // Conditional rendering to check a document was chosen
        if (!documentFile) {
            console.error('[ERROR: TranslateDocument.js] No document selected');// Log an error message in the console for debugging purposes
            setError('Choose a PDF document to translate.');// Set the error state to display the error in the UI
            return;
        }

        setLoading(true);
        setError('');
        setResult(null);
        setCopied(false);
        setSaved(false);
        setSaveMessage('');
        try {
            const formData = new FormData();
            formData.append('document', documentFile);// The field name the route reads the file from
            formData.append('sourceLanguage', sourceLang);// "auto" is a valid value here
            formData.append('targetLanguage', targetLang);

            const response = await fetch(`/document/translateDoc`, {
                method: 'POST',
                mode: 'cors',
                credentials: 'include',// Send the HTTP-only auth cookie
                headers: {
                    // No Content-Type: fetch sets the multipart boundary itself
                },
                body: formData,
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data?.message || 'Failed to translate the document');

            setResult(data);
            console.log(`[SUCCESS: TranslateDocument.js] Translated "${data.fileName}" (${data.pageCount} page(s))`);
        } catch (error) {
            console.error('[ERROR: TranslateDocument.js] Document translation failed:', error.message);// Log an error message in the console for debugging purposes
            setError(error.message || 'Something went wrong while translating the document. Please try again.');// Set the error state to display the error in the UI
        } finally {
            setLoading(false);
        }
    }, [documentFile, sourceLang, targetLang])

    /* Stores the translation on screen in the Document Translations list.
    Sent from `result` rather than the selectors: they may have been changed
    since translating, and the result carries the source language the server
    resolved "auto" to, which is what the route requires. */
    const handleSave = useCallback(async () => {
        if (!result?.translatedText || saving) return;

        setSaving(true);
        setError('');
        setSaveMessage('');
        try {
            const response = await fetch(`/document/saveDoc`, {
                method: 'POST',
                mode: 'cors',
                credentials: 'include',// Send the HTTP-only auth cookie
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    fileName: result.fileName,
                    sourceText: result.sourceText,
                    translatedText: result.translatedText,
                    sourceLanguage: result.sourceLanguage,
                    targetLanguage: result.targetLanguage,
                    provider: result.provider,
                    pageCount: result.pageCount,
                    characterCount: result.characterCount,
                }),
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data?.message || 'Failed to save the document translation');

            setSaved(true);
            setSaveMessage(data.message || 'Document translation saved to your history');
            console.log('[SUCCESS: TranslateDocument.js] Saved document translation:', data.documentTranslationId);
        } catch (error) {
            console.error('[ERROR: TranslateDocument.js] Saving the document translation failed:', error.message);// Log an error message in the console for debugging purposes
            setError(error.message || 'Something went wrong while saving the document translation. Please try again.');// Set the error state to display the error in the UI
        } finally {
            setSaving(false);
        }
    }, [result, saving])

    //=======================================================
  return (
    <form id='translateDocForm' method='POST' onSubmit={handleSubmit} aria-labelledby='formHeading' aria-busy={loading}>
        <div id='formHeadingBlock'>
            <h3 id='formHeading'>TRANSLATE DOCUMENT</h3>
        </div>
        <div id='translateDocInput'>
        {/* GROUP 1: */}
            <div id='translateDocGroup1'>
            {/* STACK 1 */}
                <Stack gap={3} id='translateDocStack1'>
                    <div className="p-2" id='docLanguageSelectBlock'>
                        <div className='languageSelectDiv' id='selectSourceLangBlock'>
                            {/* SOURCE LANGUAGE SELECTER: select: value={sourceLang} 
                            option : value={language.code} */}
                            <div className='inputDiv'>
                                <label className='translateLabel' htmlFor='docSourceLang'>SOURCE LANGUAGE</label>
                                <select
                                className='input'
                                id='docSourceLang'
                                required
                                name='sourceLangauge'
                                value={sourceLang}
                                onChange={handleSourceLangChange}
                                disabled={loading}
                                // ARIA ATTRIBUTES
                                aria-label='Document Source Language'
                                aria-disabled={loading}
                                >
                                    <option value='auto'>AUTO-DETECT</option>
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
                                // ARIA ATTRIBUTES:
                                title='Swap language'
                                // aria-label='Swap language button'
                                aria-disabled={loading || sourceLang === 'auto'}
                            >
                                <ArrowRightLeft aria-hidden='true' focusable='false' />
                            </Button>
                        </div>
                        <div className='languageSelectDiv' id='targetLangSelectdiv'>
                        {/* TARGET LANGUAGE SELECTOR: value={targetLang} 
                        option: language.code*/}
                        <div className='inputDiv'>
                            <label className='translateLabel' htmlFor='docTargetLang'>TARGET LANGUAGE</label>
                            <select
                            className='input'
                            id='docTargetLang'
                            name='targetLanguage'
                            value={targetLang}
                            required
                            onChange={handleTargetLangChange}
                            disabled={loading}
                            // ARIA ATTRIBUTES:
                            aria-label='Language to translate the document into'
                            aria-disabled={loading}
                            aria-required='true'
                            >    
                                    {languages.map((language) => (
                                        <option key={language.code} value={language.code}>{language.name}</option>
                                    ))}
                                </select>
                        </div>
                        </div>
                    </div>
                    <div className="p-2" id='translateDocBlock2'>
                    {/* DOCUMENT ref={fileInputRef} */}
                        <div id='docInputDiv'>
                            <label className='translateLabel' id='documentUploadLabel' htmlFor='documentUploadInput'>UPLOAD DOCUMENT:</label>
                            <input
                                className='docInput'
                                id='documentUploadInput'
                                type='file'
                                accept='.pdf'
                                required
                                name='document'
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                disabled={loading}
                                // ARIA ATTRIBUTES:
                                aria-label='Choose the PDF document to translate'
                                aria-required='true'
                                aria-invalid={error ? 'true' : 'false'}
                                aria-describedby='documentUploadNote'
                            />
                        </div>
                        <div>
                        {/* The chosen file, so it is clear what pressing TRANSLATE will send */}
                            {documentFile && (
                                <p className='translateDocNote' aria-live='polite'>
                                    <FileText size={16} aria-hidden='true' focusable='false' /> {documentFile.name}
                                </p>
                            )}
                        </div>
                    </div>
                    <div className="p-2">
                        {/* What the route accepts, said before a file is chosen rather
                            than after one is refused */}
                            <p id='documentUploadNote' className='translateDocNote'>
                                  PDF ONLY, UP TO {MAX_FILE_SIZE_MB} MB. PRESS SAVE TO KEEP A TRANSLATION IN YOUR HISTORY.
                            </p>
                    </div>
                </Stack>
                                    {/* TRANSLATION RESULT */}
                    <div id='translationResult'>
                        <div id='translateDocResultGroup'>
                            {/* aria-live so the translation is announced once it arrives,
                            without the user having to move focus to find it */}
                            <div id='translateDocResultBlock' aria-live='polite' aria-busy={loading}>
                                {loading ? (
                                    <p className='translateDocNote'>TRANSLATING DOCUMENT…</p>
                                ) : hasResult ? (
                                    <>
                                        {/* What the server read, so a short translation can be
                                        checked against the document it came from */}
                                        <span id='translateDocResultMeta'>
                                        <p  className='translateDocNote'>{result.fileName}</p>
                                        <p  className='translateDocNote'>{result.pageCount} PAGE(S) · {result.characterCount} CHARACTERS</p>
                                        <p className='translateDocNote'>
                                            {result.detectedLanguageName && sourceLang === 'auto'
                                                ? `  DETECTED: ${result.detectedLanguageName}`
                                                : ''}
                                        </p>
                                        </span>
                                        <div id='translatedDocText' className='form-control bg-light'>
                                            <Stack direction="horizontal" gap={3} id='copyDocTextStack'>
                                                <div className="p-2" />
                                                <div className="p-2 ms-auto" />
                                                <div className="p-2">
                                                    {/* BUTTON TO COPY TRANSLATED TEXT */}
                                                    <Button
                                                        type='button'
                                                        variant='outline-secondary'
                                                        size='sm'
                                                        id='copyDocBtn'
                                                        onClick={handleCopy}
                                                        // ARIA ATTRIBUTES:
                                                        aria-label={copied ? 'Copied to clipboard' : 'Copy the translation to the clipboard'}
                                                    >
                                                        {copied ? (
                                                            <>COPIED <Check size={16} aria-hidden='true' focusable='false' /></>
                                                        ) : (
                                                            <>COPY <Copy size={16} aria-hidden='true' focusable='false' /></>
                                                        )}
                                                    </Button>
                                                </div>
                                            </Stack>
                                            {/* TRANSLATION */}
                                            {result.translatedText}
                                        </div>
                                        <Stack direction='horizontal' gap={3} id='translateDocResultBtns'>
                                            {/* type='button' so SAVE does not submit the form
                                            and re-translate the document */}
                                            <Button
                                                type='button'
                                                variant='light'
                                                size='sm'
                                                id='saveDocTranslateBtn'
                                                onClick={handleSave}
                                                disabled={saving || saved}
                                                // ARIA ATTRIBUTES:
                                                aria-label={saved ? 'Document translation saved' : 'Save the translation to your document history'}
                                                aria-disabled={saving || saved}
                                            >
                                                {saving ? 'SAVING…' : saved ? 'SAVED' : 'SAVE'} <SavePlus size={16} aria-hidden='true' focusable='false' />
                                            </Button>
                                            <Button
                                                type='button'
                                                variant='light'
                                                size='sm'
                                                id='downloadDocBtn'
                                                onClick={handleDownload}
                                                // ARIA ATTRIBUTES:
                                                aria-label='Download the translation as a text file'
                                            >
                                                DOWNLOAD (.TXT) <Download size={16} aria-hidden='true' focusable='false' />
                                            </Button>
                                        </Stack>
                                        {saveMessage && (
                                            <p className='translateDocNote' aria-live='polite'>{saveMessage}</p>
                                        )}
                                    </>
                                ) : (
                                    <p className='translateDocNote'>THE TRANSLATED DOCUMENT WILL APPEAR HERE</p>
                                )}
                            </div>
                            {error && (
                                <div id='translateDocErrorBlock' role='alert' aria-live='assertive'>
                                    <p className='translateDocErrorMsg'>
                                        <Bug size={20} aria-hidden='true' focusable='false' />{error}
                                    </p>
                                </div>
                            )}
                </div>
            </div>
            <div id='translateDocGroup2'>
               <Stack direction="horizontal" gap={3} id='translateDocStack2'>
      <div className="p-2"/>
      <div className="p-2 ms-auto">
        <Button
            variant='light'
            id='translateDocumentBtn'
            type='submit'
            disabled={!canTranslate}
            // ARIA ATTRIBUTES
             aria-label={loading ? 'TRANSLATING…' : 'Translate the uploaded document'}
            aria-disabled={!canTranslate}
        >
            {loading ? 'TRANSLATING...': 'TRANSLATE'}
        </Button>
      </div>
      <div className="vr" />
      <div className="p-2">
        <Button
        variant='danger'
        id='clearFormBtn'
        type='button'
        onClick={clearForm}
        disabled={loading || !canClear}
        // ARIA ATTRIBUTES:
        aria-label='Clear the document form'
        aria-disabled={loading || !canClear}
        >
           CLEAR <Eraser size={16} aria-hidden='true' focusable='false' />
        </Button>
      </div>
    </Stack>
            </div>
        </div>
        </div>
    </form>
  )
}
