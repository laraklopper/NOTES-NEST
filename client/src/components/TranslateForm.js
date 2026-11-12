//TranslateForm.js
// IMPORT REQUIRED MODULES AND PACKAGES
import React, { useCallback, useEffect, useRef, useState } from 'react'
// IMPORT CSS STYLESHEETS
import '../css/componentCss/Translator.css'
import '../css/componentCss/FormSetup.css'
// IMPORT BOOTSTRAP COMPONENTS
import Stack from 'react-bootstrap/Stack';
import Button from 'react-bootstrap/Button';
// IMPORT ICONS FROM LUCIDE-REACT
import { ArrowLeftRight, RotateCw, Bug, Check, Save, Copy } from 'lucide-react';
// IMPORT CUSTOM COMPONENTS
import LanguageSelector from './LanguageSelector';
const { FALLBACK_LANGUAGES, FALLBACK_SOURCE_LANG, FALLBACK_TARGET_LANG, MIN_DETECT_CHARS, DETECT_DEBOUNCE_MS, MAX_LENGTH } = require('../util/languageFunc')

//TranslateForm function component
export default function TranslateForm(//Export default TranslateForm.js function component
  {//PROPS PASSED FROM PARENT COMPONENT(Translate.js)
    currentUser
  }
) {
  /* The language pair the form opens on, and the pair CLEAR FORM returns to:
  the logged-in user's saved defaults from GET /user/me, falling back to the
  constants above while that request is in flight or when the account stored
  no preference. */
  const defaultSourceLang = currentUser?.defaultLanguages?.defaultSourceLang || FALLBACK_SOURCE_LANG;
  const defaultTargetLang = currentUser?.defaultLanguages?.defaultTargetLang || FALLBACK_TARGET_LANG;
  //============STATE VARIABLES==================
  const [languages, setLanguages] = useState(FALLBACK_LANGUAGES)
  const [sourceLang, setSourceLang] = useState(defaultSourceLang)//State to store the source language
  const [targetLang, setTargetLang] = useState(defaultTargetLang)//State to store the target language
  const [sourceText, setSourceText] = useState('')//State to store the source text
  const [translatedText, setTranslatedText] = useState('')//State to store the targetlanguage translated text
  const [loading, setLoading] = useState(false)// State variable to indicate if the form is submitting
  const [error, setError] = useState('')//Global error state
  const [copied, setCopied] = useState(false)//State to indicate if the translated text is copied
  // Result of the detect request: { language, name, confidence, isReliable }
  const [detected, setDetected] = useState(null)
  const [detecting, setDetecting] = useState(false)
  /* What the last translation resolved to, held so the save request stores
  the language pair the text was actually translated with rather than
  whatever the selectors read at the time the button is pressed. */
  const [lastTranslation, setLastTranslation] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')

  /* Whether either selector has been changed by hand. The account is fetched
  after this form first renders, so the saved defaults are applied once it
  arrives, and this flag is what stops that from overwriting a pair the user
  has already picked for themselves. */
  const languagesTouched = useRef(false)
  /* The last text detection was resolved for, and what it resolved to. Held
  so text the form has already identified — by detecting it, or by reading
  the language off a translation of it — is not sent for detection again
  when the source selector is switched back to "auto". */
  const detectedFor = useRef({ text: '', result: null })

  const remainingChars = MAX_LENGTH - sourceText.length;
  /* Only a translation the server has resolved can be saved, and only once,
  so pressing the button again does not store a duplicate. */
  const canSave = Boolean(lastTranslation) && !loading && !saved;
  /* Clears the save feedback, called wherever the result on screen stops
  matching what was last saved. */
  const resetSaveState = useCallback(() => {
    setSaved(false);
    setSaveError('');
  }, [])

  //===========EFFECTS====================
  /* Opens the selectors on the user's saved default pair. This runs on mount
  and again whenever those defaults change — when GET /user/me resolves after
  the first render, and when the preference is edited on the Settings page —
  but never once the user has chosen a pair by hand. */
  useEffect(() => {
    if (languagesTouched.current) return;
    setSourceLang(defaultSourceLang)
    setTargetLang(defaultTargetLang)
  }, [defaultSourceLang, defaultTargetLang])

  useEffect(() => {
    const controller = new AbortController();

    const fetchLangauges = async () => {
      try {
        //Send a GET request to the /api/language/translate/v2/languages endpoint (proxied to the server)
        const response = await fetch(`/api/language/translate/v2/languages`, {
          method: 'GET',//HTTP request method
          credentials: 'include',// Send the HTTP-only auth cookie
          headers: {
            'Content-Type': 'application/json',// Specify the Content-Type in the request payload as JSON
          },
          signal: controller.signal,
        });
        const fetchedLanguages = await response.json().catch(() => ([]));// Safely parse the JSON response (avoid crash if server returns non-JSON)
        if (response.ok && Array.isArray(fetchedLanguages) && fetchedLanguages.length) {
          setLanguages(fetchedLanguages);
          console.log(`[SUCCESS: TranslateForm.js] Fetched ${fetchedLanguages.length} supported languages`);
        }
      } catch (error) {
        if (error.name === 'AbortError') return;// Component unmounted
        // FALLBACK_LANGUAGES already in state; nothing else to do
        console.error('[ERROR: TranslateForm.js] Failed to fetch supported languages:', error.message);// Log the error message in the console for debugging
      }
    }
    fetchLangauges()

    return () => controller.abort();
  }, [])

  // Previews the detected source language while the user types *
  useEffect(() => {
    const trimmedText = sourceText.trim();

    // Nothing to detect: no "auto", too little text, or none at all
    if (sourceLang !== 'auto' || trimmedText.length < MIN_DETECT_CHARS) {
      setDetected(null);
      return;
    }

    /* This exact text has been identified already, so show that answer
    again rather than spending another provider call on it. */
    if (detectedFor.current.text === trimmedText) {
      setDetected(detectedFor.current.result);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setDetecting(true);
      try {
        const response = await fetch(`/api/language/translate/v2/detect`, {
          method: 'POST',
          credentials: 'include',// Send the HTTP-only auth cookie
          headers: {
            'Content-Type': 'application/json',
          },
          // Sent trimmed, so the answer is cached against the text it was given
          body: JSON.stringify({ sourceText: trimmedText }),
          signal: controller.signal,
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data?.message || 'Failed to detect language');
        detectedFor.current = { text: trimmedText, result: data };
        setDetected(data);
        console.log(`[SUCCESS: TranslateForm.js] Detected language: ${data.language}`);
      } catch (error) {
        if (error.name === 'AbortError') return;// Superseded by a newer keystroke
        /* Detection is a convenience: translating still works without
        it, so the failure is logged rather than shown as a form error. */
        console.error('[ERROR: TranslateForm.js] Language detection failed:', error.message);
        setDetected(null);
      } finally {
        setDetecting(false);
      }
    }, DETECT_DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [sourceText, sourceLang])

  //===========EVENT LISTENERS====================
  /* Handles a change in either language selector. `side` is 'source' or
  'target'; `code` is the selected language code. Records that the pair on
  screen is now the user's own choice, so the saved defaults no longer
  apply to it. */
  const handleLanguageChange = useCallback((side, code) => {
    languagesTouched.current = true;
    if (side === 'source') setSourceLang(code);
    else setTargetLang(code);
  }, [])

  // Function to  flip source/target language and text
  const handleSwap = useCallback(() => {
    if (sourceLang === 'auto') return;
    languagesTouched.current = true;
    setSourceLang(targetLang)
    setTargetLang(sourceLang)
    setSourceText(translatedText)
    setTranslatedText(sourceText)
    /* The swapped text is a starting point, not a result the server
    produced, so there is nothing to save until it is translated again. */
    setLastTranslation(null)
    resetSaveState()
  }, [sourceLang, targetLang, sourceText, translatedText, resetSaveState])

  // Function to copy the translated text to the clipboard with a brief confirmation state.
  const handleCopy = async () => {
    if (!translatedText) return;
    await navigator.clipboard.writeText(translatedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  /* Function to clearThe translate form:
  Returns the form to its opening state. */
  const clearTranslator = useCallback(() => {
    setSourceText('');
    setTranslatedText('');
    // Back to the user's saved defaults, the pair the form opened on
    languagesTouched.current = false;
    setSourceLang(defaultSourceLang);
    setTargetLang(defaultTargetLang);
    setDetected(null);
    detectedFor.current = { text: '', result: null };
    setError('');
    setCopied(false);
    /* Nothing on screen came from the server any more, so there is
    nothing left to save. */
    setLastTranslation(null);
    resetSaveState();
    console.log('[SUCCESS: TranslateForm.js] Translate form cleared');
  }, [defaultSourceLang, defaultTargetLang, resetSaveState])

  /* Only offer the clear action when there is something to clear */
  const canClear = Boolean(sourceText || translatedText || error || saveError || lastTranslation);
  //==============REQUESTS=====================
  // Submits the source text to the server and renders the result.
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();//Prevent default form submission
    if (!sourceText.trim()) return;

    setLoading(true);
    setError('');
    try {
      // Send a POST request to the `/api/language/translate/v2``endpoint
      const response = await fetch(`/api/language/translate/v2`, {
        method: 'POST',//HTTP request method
        credentials: 'include',// Send the HTTP-only auth cookie
        headers: {
          'Content-Type': 'application/json',//Specify the payload as JSON
        },
        body: JSON.stringify({//
          sourceText,
          sourceLanguage: sourceLang,// "auto" is a valid value here
          targetLanguage: targetLang,
        }),
      });
      const data = await response.json().catch(() => ({}));// Safely parse JSON (avoid crash if server returns non-JSON)
      if (!response.ok) throw new Error(data?.message || 'Failed to translate');
      setTranslatedText(data.translatedText);

      /* Keep what the server resolved, so saving stores the same
      languages the text was translated with (the detected source when
      the selector reads "auto"). */
      setLastTranslation({
        sourceText,
        translatedText: data.translatedText,
        sourceLanguage: data.sourceLanguage,
        targetLanguage: data.targetLanguage,
      });
      resetSaveState();

      /* The translation response reports the language it detected, so
      use it to correct the preview when the debounced detect request
      hadn't fired yet or disagreed with the translation. */
      if (sourceLang === 'auto' && data.detectedLanguage) {
        const detectedFromTranslation = {
          language: data.detectedLanguage,
          name: data.detectedLanguageName,
          isReliable: true,
        };
        /* Recorded as this text's answer too, so leaving the result on
        screen and returning to it costs nothing further. */
        detectedFor.current = { text: sourceText.trim(), result: detectedFromTranslation };
        setDetected(detectedFromTranslation);
      }
      console.log('[SUCCESS: TranslateForm.js] Translation received');//Log a message in the console for debugging purposes
    } catch (error) {
      console.error('[ERROR: TranslateForm.js] Translation failed:', error.message);//Log an error message in the console for debugging purposes
      setError(error.message || 'Something went wrong while translating. Please try again.');// Set the error state to display the error in the UI
    } finally {
      setLoading(false);//Set Loading state to false
    }
  }, [sourceText, sourceLang, targetLang, resetSaveState])


  /* Function to save the translation. Stores the translation currently
  on screen against the logged-in user. */
  const handleSave = useCallback(async () => {
    if (!lastTranslation) return;
    setSaving(true);
    setSaved(false);
    setSaveError('');
    try {
      //Send a POST request to the `/translation/save`
      const response = await fetch(`/translation/save`, {
        method: 'POST',//HTTP request method
        credentials: 'include',// Send the HTTP-only auth cookie
        headers: {
          'Content-Type': 'application/json',// Specify the Content-Type in the request payload as JSON
        },
        body: JSON.stringify(lastTranslation),
      });
      const data = await response.json().catch(() => ({}));// Safely parse the JSON response (avoid crash if server returns non-JSON)
      if (!response.ok) throw new Error(data?.message || 'Failed to save translation');

      setSaved(true);
      console.log(`[SUCCESS: TranslateForm.js] Translation saved to history (created: ${data.created})`);
    } catch (error) {
      console.error('[ERROR: TranslateForm.js] Saving the translation failed:', error.message);
      setSaveError(error.message || 'Something went wrong while saving. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [lastTranslation])
  //===================================
  return (
    <div id='translatorDiv' role='region'>
      <form id='translatorForm' onSubmit={handleSubmit}>
        <div id='translatorInputDetails'>
          <Stack gap={3} id='translateInputStack'>
            <div className="p-2" id='languageSelectBlock'>
              {/* SET TO DEFAULT TARGET/SOURCE LANGUAGE OR auto-detect if none */}
              <div className='languageSelectDiv' id='selectSourceLangBlock'>
                <LanguageSelector
                  id='sourceLang'
                  label={'Source Language'}
                  languages={languages}
                  value={sourceLang}
                  onChange={(code) => handleLanguageChange('source', code)}
                  allowAuto
                  disabled={loading} />
              </div>
              <div id='swapLangDiv'>
                <Button
                  variant='light'
                  size='sm'
                  id='swapLanguageBtn'
                  onClick={handleSwap}// Function to  flip source/target language and text
                  type='button'
                  title='Swap language'
                  // ARIA ATTRIBUTES:
                  // aria-label=''
                >
                  <ArrowLeftRight fontWeight={700} size={18} aria-hidden='true' focusable='false' />
                </Button>
              </div>
              {/* SET TO DEFAULT TARGET/SOURCE LANGUAGE OR auto-detect if none */}
              <div className='languageSelectDiv' id='targetLangSelectdiv'>
                <label className='translateLabel' hidden>TARGET LANGUGE</label>
                {/* SET TO DEFAULT TARGET/SOURCE LANGUAGE OR auto-detect if none */}
                <LanguageSelector
                  id='targetLang'
                  label='Target language'
                  languages={languages}
                  value={targetLang}
                  onChange={(code) => handleLanguageChange('target', code)}
                  disabled={loading}

                />
              </div>
              {/* DETECTED SOURCE LANGUAGE */}
              {sourceLang === 'auto' && (
                <div id='detectedLanguageBlock'>
                  <p id='detectedLanguageNote' aria-live='polite'>
                    {detecting
                      ? 'Detecting language…'
                      : detected?.language
                        ? `Detected: ${detected.name}${detected.isReliable ? '' : ' (low confidence)'}`
                        /* A result with no language means the server was asked and
                        came back undecided, which is worth saying. A blank note is
                        for when there was nothing to ask about yet. */
                        : detected
                          ? 'Could not identify the language'
                          : ''}
                  </p>
                </div>
              )}
            </div>
            <div className="p-2" id='translateTextBlock'>
              <div id='translationText'>
                <div id='translatedInputDiv'>
                  {/* Text to translate value={sourceText} */}
                  <div id='sourceTextBlock'>
                    <label htmlFor='sourceText' className='translateLabel visually-hidden'>Text to translate</label>
                    <textarea
                      id='sourceText'
                      className='form-control'
                      rows={8}
                      placeholder='Enter text to translate…'
                      name='sourceText'
                      value={sourceText}
                      maxLength={MAX_LENGTH}
                      disabled={loading}
                      /* Editing clears the save confirmation */
                      onChange={(e) => {
                        setSourceText(e.target.value);
                        resetSaveState();
                      }}
                      // ARIA ATTRIBUTES:
                      aria-label='Text to translate'
                      aria-required='true'
                    />
                    <div
                      id='sourceTextCounter'
                      className={`form-text text-end ${remainingChars < 100 ? 'text-danger' : ''}`}
                      aria-live='polite'
                    >
                      {sourceText.length} / {MAX_LENGTH}
                    </div>
                  </div>
                  {/* Translation result value={translatedText} */}
                  <div id='translatedTextBlock'>
                    <label htmlFor='translatedText' className='translateLabel visually-hidden'>Translation result</label>
                    <Button
                      type='button'
                      variant='outline-secondary'
                      size='sm'
                      id='copyTranslationBtn'
                      onClick={handleCopy}//Functio to copy translated text
                      disabled={!translatedText}
                      // ARIA ATTRIBUTES
                      aria-label={copied ? 'Translation copied' : 'Copy translation'}
                    >
                      {copied ? (
                        <>Copied <Check size={16} aria-hidden='true' focusable='false' /></>
                      ) : (
                        <>Copy <Copy size={16} aria-hidden='true' focusable='false' /></>
                      )}
                    </Button>
                    {/* Read-only preview: nothing is saved until SAVE HISTORY is pressed */}
                    <div
                      id='translatedText'
                      className='form-control bg-light'
                      aria-live='polite'
                    >
                      {loading ? 'Translating…' : translatedText}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div id='translateBtnBlock'>
              {/* CLEAR FORM BUTTON */}
              <Button
                variant='danger'
                id='clearFormBtn'
                onClick={clearTranslator}
                type='button'
                disabled={loading || !canClear}
                // ARIA ATTRIBUTES
                aria-label='Clear Form Button'
                aria-disabled={loading || !canClear}
              >
                <RotateCw aria-hidden='true' focusable='false' /> CLEAR FORM
              </Button>
              {/* SUBMIT (translation)FORM BUTTON */}
              <Button
                type='submit'
                variant='light'
                id='translateBtn'
                disabled={loading || !sourceText.trim()}
                // ARIA ATTRIBUTES:
                role='button'
                aria-label={loading ? 'Translating…' : 'Translate'}
                aria-disabled={loading || !sourceText.trim()}
              >
                {loading ? 'Translating…' : 'Translate'}
              </Button>
            </div>
            {/* TRANSLATE ERROR MESSAGE */}
            {error && (
              <div className='p-2' id='translateErrorBlock' role='alert' aria-live='assertive'>
                <p className='translateErrorMessage'>
                  <Bug size={20} fontWeight={900} aria-hidden='true' focusable='false' />{error}
                </p>
              </div>
            )}
          </Stack>
        </div>
      </form>
      {/* RESULT + SAVE */}
      <Stack gap={3} id='saveTranslationStack'>
        {/* Saves the result of the last translation to the user's history */}
        <div className='p-2' id='saveTranslationBlock'>
          <Button
            type='button'
            variant='light'
            id='saveTranslationBtn'
            onClick={handleSave}
            disabled={!canSave || saving}
            // ARIA ATTRIBUTES:
            aria-label={saved ? 'Translation saved to history' : 'Save translation to history'}
            aria-disabled={!canSave || saving}
          >
            {saved ? (
              <>Saved <Check size={16} aria-hidden='true' focusable='false' /></>
            ) : (
              <>{saving ? 'Saving…' : 'Save History'} <Save size={16} aria-hidden='true' focusable='false' /></>
            )}
          </Button>
          {/* SAVE STATUS MESSAGE */}
          <p id='saveTranslationNote' aria-live='polite'>
            {saved ? 'This translation is in your history.' : ''}
          </p>
        </div>
        {/* SAVE ERROR MESSAGE */}
        {saveError && (
          <div className='p-2' id='saveErrorBlock' role='alert' aria-live='assertive'>
            <p className='translateErrorMessage'>
              <Bug size={20} fontWeight={900} aria-hidden='true' focusable='false' />{saveError}
            </p>
          </div>
        )}
      </Stack>
    </div>
  )
}
