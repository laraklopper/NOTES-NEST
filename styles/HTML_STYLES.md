# HTML STYLING

General styling formats, not all formats apply for all tags.

## TABLE OF CONTENTS
1. [BODY/HTML/ROOT](#1-bodyhtmlroot)
2. [HEADER/FOOTER](#2-headerfooter)
3. [SECTION](#3-section)
4. [NAVIGATION/LINKS](#4-navigationlinks)
    - [4.1. NAVIGATION BAR](#41-navigation-bar)
    - [4.2. NAVIGATION LINKS](#42-navigation-links)
    - [4.3. LINKS](#43-links)
5. [FORMS](#5-forms)
6. [LISTS](#6-lists)
    - [6.1. TABLES](#61-tables)
7. [DATA DETAILS](#7-data-details)
8. [BUTTONS](#8-buttons)
9. [ANIMATIONS](#9-animations)
10. [ERRORS](#10-errors)
11. [ACCESSIBILITY](#11-accessibility)
12. [REFERENCES](#12-references)

- *View [GLOSSARY.md](../GLOSSARY.md) for terminology*
---

## 1. BODY/HTML/ROOT
`App.css`
```css
#html, #body{
    overflow: visible;
    margin: 0px 0px 0px 0px;
    padding: 0px 0px 0px 0px;
    width: 100%;
    height: 100%;
    background-size: cover;
    background-position: center;
    background-color: #6B4F1C;
    border-color: #6B4F1C;
}
#root {
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    overflow: visible;
    background-color: #6B4F1C;
    margin: 0px 0px;
    padding: 0px;
    display: flex;
    justify-content: center;
    width: 100%;
    height: 100%;
}
```

## 2. HEADER/FOOTER
`Header.css`, `Footer.css`
```css
/* Header.css: #mainHeader | Footer.css: #pageFooter */
#mainHeader,
#pageFooter{
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    margin: 10px 0px;
    padding: 10px 0px;
    background-color: #B78830;
    gap: 10px;
}
#appHeading{
    font-family: "Roboto", sans-serif;
    font-weight: 800;
    letter-spacing: 2px;
    margin: 0px;
    padding: 0px;
    text-decoration: underline;
}
#pageHeading{
    font-family: "Roboto", sans-serif;
    font-weight: 700;
    letter-spacing: 2px;
    margin: 0px;
    padding: 0px;
    font-style: italic;
}
/* Footer copyright text */
#copyrightText{
    display: flex;
    margin: 0px;
    padding: 0px;
    font-weight: 600;
    letter-spacing: 1.5px;
    font-family: "Open Sans", sans-serif;
    text-transform: uppercase;
}
/* Footer clock text */
.clockItem{
    margin: 0px;
    padding: 0px;
    font-family: "Comic Relief", system-ui;
    font-weight: 700;
    font-size: 18px;
}
```
- The header clock row (`#mainHeaderDiv > #headerRow1`) is hidden below 768px.

## 3. SECTION
Each page uses its own section IDs, alternating two background colours.

```css
/* SECTION 1 (primary): Home.css, Notes.css, NotePad.css, LoggedOut.css
   e.g. #homeSection1, #notesSection1, #notePadSection1, #loginSection, #regisSection */
#homeSection1{
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    margin: 0px;
    padding: 0px;
    background-color: #946E26;
}
/* SECTION 2 (alternate): Home.css, e.g. #homeSection2 */
#homeSection2{
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    margin: 0px;
    padding: 0px;
    background-color: #ac8718;
}
/* SECTION 3: Admin.css */
#adminSection{
    display: flex;
    flex-direction: column;
    align-items: center;
    margin: 0px;
    padding: 0px;
    width: 100%;
    background-color: #946E26;
}
```
**Page container**: `PageSetup.css`
```css
#pageContainer{
    display: flex;
    flex-direction: column;
    align-items: center;
    margin: 0px;
    padding: 0px;
    width: 100%;
    gap: 10px;
}
```

## 4. NAVIGATION/LINKS

### 4.1. NAVIGATION BAR
`Header.css`
```css
#navbarBlock{
    display: flex;
    justify-content: flex-end;
    margin: 0px;
    padding: 0px;
}
#navigation{
    width: fit-content;
    margin: 0px;
    display: flex;
    flex-direction: column;
    border-radius: 8px;
    padding: 5px;
    background-color: #8797A8;
}
#mainNavbar,
#navbar{
    display: flex;
    margin: 0px;
    padding: 0px;
    gap: 10px;
    justify-content: center;
    align-items: center;
    list-style-type: none;
}
/* MENU BUTTON: opens/closes the links on phones (hidden from 768px up by 'd-md-none') */
#navToggleBtn{
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    height: 40px;
    margin: 0px;
    padding: 0px;
    font-family: "Roboto Mono", monospace;
    font-weight: 700;
    letter-spacing: 2px;
    color: #000;
    background-color: #E8F0F6;
    border: solid 2px #323A42;
    border-radius: 5px;
}
#navToggleBtn:hover,
#navToggleBtn[aria-expanded="true"]{
    background-color: #323A42;
    color: #E8F0F6;
}
#navToggleBtn:focus-visible{
    outline: 3px solid #E8F0F6;
    outline-offset: 2px;
}
```

### 4.2. NAVIGATION LINKS
`Header.css`
```css
.refLink{
    display: flex;
    letter-spacing: 2px;
    align-items: center;
    width: 230px;
    font-family: "Roboto Mono", monospace;
    margin: 0px;
    color: #000;
    padding: 0px;
    text-decoration: none;
    height: 40px;
    font-weight: 700;
    justify-content: center;
    border-radius: 5px;
    text-align: center;
    background-color: #E8F0F6;
    border: solid 2px #323A42;
}
.refLink:hover,
.refLink:active,
.refLink.active{
    background-color: #323A42;
    color: #E8F0F6;
    text-decoration: underline;
}
```
- `.refLink.active` highlights the link for the current page.

### 4.3. LINKS
CSS styling for external links. `PageSetup.css`
```css
.apiLink{
    color: #E8F0F6;
    font-family: "Roboto Mono", monospace;
    letter-spacing: 2px;
    margin: 0px;
    padding: 5px;
}
.apiLink:hover{
    color: #E8F0F6;
    background-color: #323A42;
}
```

## 5. FORMS
Each form has its own ID (e.g. `#loginForm`, `#registrationForm`, `#notePadForm`, `#updateNoteForm`, `#translatorForm`). They share this pattern:

`RegistrationForm.css`, `LoginForm.css`
```css
/* FORM */
#registrationForm{
    display: flex;
    flex-direction: column;
    align-items: center;
    margin: 0px;
    padding: 10px;
    width: 100%;           /* #loginForm: 450px */
    background-color: #777d83;
    border: #323A42 solid 2px;
    gap: 10px;
}
/* INPUT AREA */
#loginFormInput{
    width: 80%;
    margin: 0px;
    padding: 5px;
    display: flex;
    flex-direction: column;
    align-items: center;
    background-color: #BFBFBF;
}
/* FIELDSET GROUP */
#regisGroup1{
    display: flex;
    flex-direction: column;
    width: 100%;
    padding: 0px;
    margin: 0px;
    background-color: #999999;
    gap: 0px;
    border: #323A42 solid 2px;
    border-radius: 5px;
}
#regisGroup1 > legend{
    float: none;
    width: auto;
    font-size: 14px;
    margin: 0px;
    padding: 0px 5px;
    font-family: "Roboto Condensed", sans-serif;
    font-weight: 700;
    letter-spacing: 2px;
}
```
**Shared inputs**: `FormSetup.css`
```css
.inputDiv{
    margin: 0px;
    padding: 0px;
    display: flex;
    gap: 5px;
    align-items: baseline;
}
.inputDiv select{
    width: 200px;
    margin: 0px;
    padding: 0px;
    font-weight: 700;
    font-family: "Roboto Mono", monospace;
    height: 40px;
    border: solid 2px #323A42;
}
.input{
    display: flex;
    justify-content: center;
    width: 200px;
    border-radius: 5px;
    height: 40px;
    text-align: center;
}
.input:focus-visible{
    outline: none;
    box-shadow: 0 0 0 3px #323a4266;
}
```
**Text**: `FormSetup.css`, `LoginForm.css`
```css
#formHeadingBlock{
    display: flex;
    justify-content: center;
    margin: 0px;
    padding: 0px;
}
#formHeading{
    font-family: "Comic Relief", system-ui;
    font-weight: 700;
    font-size: 24px;
    text-decoration: underline;
    letter-spacing: 2px;
    margin: 0px;
    display: flex;
    width: 100%;
    text-align: center;
    justify-content: center;
    padding: 0px;
    text-transform: uppercase;
}
/* LABELS: .loginLabel, .regisLabel (same pattern per form) */
.loginLabel,
.regisLabel{
    font-family: "Roboto Mono", monospace;
    font-weight: 700;
    margin: 0px;
    letter-spacing: 1px;
    padding: 0px;
}
/* REQUIRED INFO */
.requiredInfoSpan{
    display: flex;
    align-items: baseline;
    margin: 0px;
    padding: 0px;
    gap: 10px;
}
.requiredInfoSpan p{
    text-transform: uppercase;
    font-size: 14px;
    font-weight: 700;
}
.reqInfo{
    margin: 0px;
    padding: 0px;
    font-family: "Open Sans", sans-serif;
}
/* FIELD ERRORS */
#loginUsernameError,
#loginPasswordError{
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 5px;
    padding: 0px;
    margin: 0px;
    text-transform: uppercase;
    font-family: "Open Sans", sans-serif;
    color: #B82C3A;
}
```

## 6. LISTS

### 6.1. TABLES
`ListTables.css`: the same rules apply to `#notebookTable`, `#documentTranslationsTable`, `#documentTrashTable`, `#usersTable`, `#tagsTable`, `#translationsTable`, `#notesListTable`, `#archiveTable`, `#deleteTranslateTable`, `#trashTable` and `#languageTable`. One table is shown here as an example.
```css
/* WRAPPER (e.g. #notesListWrapper, #usersTableWrapper ...) */
#notesListWrapper{
    width: 100%;
    margin: 0px;
    padding: 5px 0px;
    display: flex;
    justify-content: center;
    background-color: #b3b3b3;
}
.tableHeading{
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    color: #f8f9fa;
    letter-spacing: 2px;
    font-family: "Roboto Condensed", sans-serif;
    font-weight: 800;
    margin: 0px;
    padding: 0px;
}
/* TABLE */
#notesListTable{
    width: 100%;              /* #archiveTable, #trashTable: 90% */
    margin: 0px;
    padding: 0px;
    border: solid #383838 2px;
}
/* THEAD */
#notesListTable thead tr th{
    border: solid #383838 2px;
    text-align: center;
    text-transform: uppercase;
    letter-spacing: 2px;
    font-family: "Roboto Condensed", sans-serif;
    font-weight: 800;
}
#notesListTable thead tr:nth-child(even){ background: #fff; }
#notesListTable thead tr:nth-child(odd){
    background: #212529;
    font-weight: 800;
    color: #f8f9fa;
    font-family: "Roboto", sans-serif;
    letter-spacing: 2px;
    text-decoration: underline;
}
/* TBODY */
#notesListTable tbody tr td{
    border: solid #383838 2px;
    text-align: center;
    font-family: "Roboto Mono", monospace;
    font-weight: 600;
}
#notesListTable tbody tr:nth-child(even){ background: #fff; }
#notesListTable tbody tr:nth-child(odd){ background: #93A0AB; }
/* TFOOT */
#notesListTable tfoot{
    text-align: center;
    border: #000 solid 1px;
    letter-spacing: 2px;
    font-weight: 700;
    text-decoration: underline;
    font-family: "Roboto Mono", monospace;
}
#notesListTable tfoot tr:nth-child(odd){ background: #212529; color: #f8f9fa; }
#notesListTable tfoot tr:nth-child(even){ background: #383838; color: #f8f9fa; }
```

## 7. DATA DETAILS

CSS styling used for selected details panals (e.g. translations, notes) or profile. `DetailsPanals.css`

```css
/* PANAL */
#userPanal,
#translationPanal,
#notePanal{
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    margin: 0px;
    padding: 5px;
    gap: 5px;
    background-color: #949ca2;
}
/* PANAL HEADER / FOOTER */
#panalHeader,
#translationPanalHead,
#notePanalHead{
    display: flex;
    align-items: center;
    margin: 0px;
    padding: 5px 0px;
    width: 100%;
    border-bottom: solid 1.5px #404040;
}
#panalFooter{
    display: flex;
    margin: 0px;
    padding: 5px 0px;
    align-items: center;
    border-top: solid 1.5px #404040;
}
/* PANAL BODY */
#translationPanalBody,
#notePanalBody{
    display: flex;
    align-items: baseline;
    padding: 5px;
    margin: 0px;
    width: 100%;
    background-color: #b7bdc4;
}
/* TEXT */
.panalHeading{
    font-family: "Comic Relief", system-ui;
    font-weight: 700;
    text-decoration: underline;
    margin: 0px;
    padding: 0px;
}
.dataSpan{
    display: flex;
    gap: 10px;
    margin: 0px;
    padding: 0px;
}
.dataLabel{
    font-family: "Comic Relief", system-ui;
    color: #000;
    margin: 0px;
    padding: 0px;
    text-decoration: underline #8a9199 1.5px;
    letter-spacing: 2px;
    font-weight: 700;
}
.dataValue{
    font-family: "Comic Relief", system-ui;
    color: #000;
    margin: 0px;
    padding: 0px;
}
```

## 8. BUTTONS

All buttons share one pattern, and only the width changes. Each button has its own ID (e.g. `#toggleUsersBtn` in `Admin.css`, `#showProfileBtn` in `Home.css`, `#clearFormBtn` in `FormSetup.css`, `#logoutBtn` in `Footer.css`, list buttons in `ListBtns.css`).

```css
/* TOGGLE BUTTON: Admin.css */
#toggleUsersBtn{
    display: flex;
    justify-content: center;
    align-items: center;
    margin: 0px;
    padding: 0px;
    height: 40px;
    width: 180px;
    text-transform: uppercase;
    color: #000;
    font-family: "Roboto Mono", monospace;
    font-weight: 700;
    letter-spacing: 2px;
    border: solid 2px #323A42;
}
#toggleUsersBtn:hover{
    background-color: #323A42;
    color: #E8F0F6;
}
/* Pressed state for toggle buttons */
#toggleUsersBtn:active,
#toggleUsersBtn[aria-pressed='true']{
    background-color: #323A42;
    color: #E8F0F6;
    text-decoration: underline;
    border: #404040 solid 2px;
}
/* BUTTON TEXT + ICON: PageSetup.css */
.btnTextSpan{
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0px;
    padding: 0px;
    gap: 5px;
}
.btnTextSpan h6{
    font-family: "Comic Relief", system-ui;
    font-weight: 700;
    text-decoration: underline;
    letter-spacing: 2px;
    text-align: center;
    margin: 0px;
    text-transform: uppercase;
    padding: 0px;
}
.btnTextSpan svg{
    font-size: 24px;
}
```
**Common widths**
| Width | Used for |
|-------|----------|
| 100px | `.viewNoteBtn`, `#copyContentBtn` |
| 120px | Table row actions (`#deleteItemBtn`, `#restoreBtn`, `#copyBtn`, `#viewTranslationBtn` ...) |
| 150px | Panal actions (`#editNoteBtn`, `#archiveNoteBtn`, `#trashNoteBtn`, `#closePanalBtn`) |
| 180px | Toggles (`#toggleUsersBtn`, `#toggleNotesBtn`, `#toggleTagsBtn` ...), `#clearFormBtn`, `#loginBtn` |
| 200px | `#toggleArchiveBtn`, `#toggleTrashBtn`, `#toggleFilterBtn`, `#showPswdBtn`, `#addToCalenderBtn`, `#logoutBtn` |
| 240px | `#showProfileBtn`, `#toggleCalendarBtn` |
| 250px | `#toggleExportBtn` |

- Background-color for buttons based on bootstrap variant

## 9. ANIMATIONS

Styling used for animations using css, bootstrap and lucide-react. `Animations.css`

**CSS**
```css
/* ======BOOTSTRAP LAYOUT============= */
/* GRID: https://react-bootstrap.netlify.app/docs/layout/grid */
#eventRow{
    display: flex;
    width: 100%;
    margin: 0px;
    padding: 0px;
}
#eventCol {
    width: 100%;
    background-color: #C22419;
    margin: 0px;
    padding: 0px;
}
/* JSX(HTML) LAYOUT */
.eventBar{
    display: flex;
    align-items: center;
    width: 100%;
    background-color: #1e7b1e;
    border-top: 2px solid #000;
    border-bottom: 2px solid #000;
    margin: 0;
    padding: 0;
    height: 40px;
    overflow: hidden;
}
.eventBar2{
    display: flex;
    align-items: center;
    width: 100%;
    background-color: #C22419;
    border-top: 2px solid #000;
    border-bottom: 2px solid #000;
    margin: 0;
    padding: 0;
    height: 40px;
    overflow: hidden;
}
/* ---------- Shared track behavior ---------- */
/* container-type enables cqi units so the keyframes can reference track width */
.eventTrack {
    container-type: inline-size;
    position: relative;
    width: 100%;
    height: 40px;
    overflow: hidden;
    display: flex;
    align-items: center;
    margin: 0px;
    padding: 0px;
}
```
**KEY FRAMES**
```css
/* ---------- Slide left → right edge → centre ---------- */
/* Only transform is animated — compositor-only, no layout/paint cost.          */
/* cqi = 1% of the nearest container's inline size (the track width).           */
/* left: 0 is the static anchor; all movement is expressed via translateX.      */
@keyframes slideToCenter {
    0%  { transform: translate(0,                                         -50%); }
    70% { transform: translate(calc(100cqi - var(--event-size)),          -50%); }
    100%{ transform: translate(calc(50cqi  - var(--event-size) / 2),      -50%); }
}

.eventSlide {
    --event-size: 32px;
    position: absolute;
    left: 0;
    top: 50%;
    transform: translate(0, -50%);
    color: #fff;
    will-change: transform;
    animation: slideToCenter 15s ease-in-out forwards;
}

@media (prefers-reduced-motion: reduce) {
    .eventSlide {
        animation: none;
        transform: translate(calc(50cqi - var(--event-size) / 2), -50%);
    }
}
```
## 10. ERRORS
`App.css`
```css
#globalErrorBlock{
    display: flex;
    margin: 0px;
    padding: 0px;
    justify-content: center;
    width: 100%;
}
#globalErrorBlock span{
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 0px;
    padding: 0px;
}
#errorMessage{
    margin: 0px;
    padding: 0px;
    font-family: "Open Sans", sans-serif;
}
```

## 11. ACCESSIBILITY
`PageSetup.css`: hides text visually but keeps it available to screen readers.
```css
.visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
}
```

## 12. REFERENCES

- https://react-bootstrap.netlify.app/
- https://fonts.google.com/
- https://color.adobe.com/create/color-wheel
- https://www.w3schools.com/colors/colors_groups.asp
- https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA
