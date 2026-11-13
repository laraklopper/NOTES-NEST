// LanguageSelector.js - Language dropdown used for both source and target selection.
import React from "react";

//LanguageSelector function component
export default function LanguageSelector(//Export default LanguageSelector.js component
  {//PROPS PASSED FROM PARENT COMPONENT(TranslateForm.js)
  id,
  label,
  languages,
  value,
  onChange,
  allowAuto = false,//Pass `allowAuto` for the source selector so "Auto-detect" appears as an option 
  disabled = false,
}) {

  //==============JSX RENDERING==============================
  return (
    <div className="languageSelector">
    {/* SET TO DEFAULT TARGET/SOURCE LANGUAGE OR auto-detect if none */}
      <label htmlFor={id} className="form-label visually-hidden">{label}</label>
      <select
        id={id}
        className="languageSelect"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        aria-label={label}
      >
        {allowAuto && <option value="auto">Auto-detect</option>}
        {languages.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.name}
          </option>
        ))}
      </select>
    </div>
  );
}