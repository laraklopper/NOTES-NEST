import React from 'react'
import '../css/componentCss/Translator.css'
import '../css/componentCss/FormSetup.css'
import Stack from 'react-bootstrap/Stack';
import Button from 'react-bootstrap/Button';
import { ArrowLeftRight, RotateCw } from 'lucide-react';

export default function TranslateForm() {

    
    // Function to  flip source/target language and text
    // Fun

  return (
    <div id='translatorDiv'>
     <form id='translatorForm' >
        <div id='translatorInputDetails'>
            <Stack gap={3} id='translateInputStack'>
      <div className="p-2" id='languageSelectBlock'>
      {/* SET TO DEFAULT TARGET/SOURCE LANGUAGE OR auto-detect if none */}
        <div className='languageSelectDiv' id='selectSourceLangBlock'>
        <label className='translateLabel' hidden>SOURCE LANGUAGE</label>
            <select
            className='input'
            >
            {/* SET TO DEFAULT TARGET/SOURCE LANGUAGE OR auto-detect if none */}
                <option>SELECT</option>
            </select>
            {/* DETECTED SOURCE LANGUAGE */}
        </div>
        <div id='swapLangDiv'>
            <Button
            variant='light'
            size='sm'
            id='swapLanguageBtn'
            // onClick={}// Function to  flip source/target language and text
            type='button'
            title='Swap language'
            // ARIA ATTRIBUTES
            >
                <ArrowLeftRight fontWeight={700} size={18} aria-hidden='true' focusable='false' />
            </Button>

        </div>
        {/* SET TO DEFAULT TARGET/SOURCE LANGUAGE OR auto-detect if none */}
        <div className='languageSelectDiv' id='targetLangSelectdiv'>
          <label className='translateLabel' hidden>TARGET LANGUGE</label>
          {/* SET TO DEFAULT TARGET/SOURCE LANGUAGE OR auto-detect if none */}
            <select className='input'>
                 {/* SET TO DEFAULT TARGET/SOURCE LANGUAGE OR auto-detect if none */}
                <option>SELECT</option>

            </select>

        </div>
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
                                        // name='sourceText'
                                        // value={sourceText}
                                        // maxLength={MAX_LENGTH}
                                        // disabled={loading}
                                        // /* Editing clears the save confirmation */
                                        // onChange={(e) => {
                                        //     setSourceText(e.target.value);
                                        //     resetSaveState();
                                        // }}
                                        // ARIA ATTRIBUTES:
                                        aria-label='Text to translate'
                                        aria-required='true'
                                    />
                                     <div
                                        id='sourceTextCounter'
                                        // className={`form-text text-end ${remainingChars < 100 ? 'text-danger' : ''}`}
                                        aria-live='polite'
                                    >
                                        {/* {sourceText.length} / {MAX_LENGTH} */}
                                    </div>
                                </div>
                                {/* Translation result value={translatedText} */}
                                <div id='translatedTextBlock'>
                                    <label htmlFor='translatedText' className='translateLabel visually-hidden'>Translation result</label>
                                    <div
                                        id='translatedText'
                                        className='formControl bg-light'
                                        aria-live='polite'
                                    >
                                        <Button
                                         type='button'
                                            variant='outline-secondary'
                                            size='sm'
                                        >
                                            COPY
                                        </Button>
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
                        // onClick={clearTranslator}
                        type='button'
                        // disabled={loading || !canClear}
                        // ARIA ATTRIBUTES
                        aria-label='Clear Form Button'
                        // aria-disabled={loading || !canClear}
                        >
                        <RotateCw/> CLEAR FORM 
                        </Button>
                        {/* SUBMIT (translation)FORM BUTTON */}
                        <Button
                            type='submit'
                            variant='light'
                            id='translateBtn'
                            // disabled={loading || !sourceText.trim()}
                            // ARIA ATTRIBUTES:
                            role='button'
                            aria-label='Translate'
                            // aria-disabled={loading || !sourceText.trim()}
                        >
                        Translate
                            {/* {loading ? 'Translating…' : 'Translate'} */}
                        </Button>
                    </div>

    </Stack>


        </div>
    
    </form>
    {/* OUTPUT/RESULT */}
{/* <div></div> */}
    </div>
   
  )
}
