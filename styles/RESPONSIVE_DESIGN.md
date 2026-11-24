# RESPONSIVE WEB DESIGN


## TABLE OF CONTENTS
1. [OVERVIEW](#1-overview)
2. [APPLICATION USAGE](#2-application-usage)
    - [2.1. FILES](#21-files)
    - [2.2. VIEWPORT](#22-viewport)
    - [2.3. BREAKPOINTS](#23-breakpoints)
    - [2.4. ALL SCREEN SIZES](#24-all-screen-sizes)
    - [2.5. NAVIGATION](#25-navigation)
    - [2.6. LAYOUT](#26-layout)
    - [2.7. TOGGLE BUTTONS](#27-toggle-buttons)
    - [2.8. TABLES](#28-tables)
    - [2.9. FORMS](#29-forms)
    - [2.10. BUTTONS](#210-buttons)
    - [2.11. TEXT SIZES](#211-text-sizes)
    - [2.12. ANIMATIONS](#212-animations)
3. [REFERENCES](#references)

- view [GLOSSARY.md](../GLOSSARY.md)

---

## 1. OVERVIEW
Responsive web design (RWD) is building one website that adapts its layout to the screen it is viewed on (desktop, tablet or phone), instead of building separate sites for each device.

It is built on three ideas:
- **Fluid layouts**: widths are set with `%`, `fr`, `max-width` and flexbox/grid so content stretches or shrinks with the screen, instead of fixed pixel widths that overflow.
- **Flexible media**: images, videos and form fields never grow wider than their container (`max-width: 100%`).
- **Media queries**: `@media` rules apply extra CSS only when the screen is within a size range (a *breakpoint*), e.g. stacking columns or hiding decorative content on phones.

The viewport `<meta>` tag tells mobile browsers to use the device width instead of zooming out on a desktop-sized page. Without it, media queries do not work as expected on phones.

## 2. APPLICATION USAGE

The app is designed desktop-first: the component and page stylesheets hold the desktop layout, and two responsive stylesheets override them on smaller screens with `max-width` media queries.

### 2.1. FILES
| File | Purpose | Imported in |
|------|---------|-------------|
| `client/src/css/pagesCss/Responsive.css` | Layout, navigation, tables, buttons, text, animations | `App.js` (imported **last**) |
| `client/src/css/componentCss/ResponsiveForms.css` | Every `<form>` in the app | `Home.js`, `Login.js`, `Register.js`, `NotePad.js`, `Notes.js`, `Translate.js` |
| `client/src/css/componentCss/Header.css` | Hides the header clock row on phones | `Header.js` |

**How the overrides win:**
- `Responsive.css` is imported last in `App.js`, so its rules load after the page/component stylesheets.
- Every selector is prefixed with `#root` (e.g. `#root #navigation`), giving it higher specificity than the component ID rules (`#navigation`).
- `!important` is only used where Bootstrap utilities or inline styles must be beaten.

### 2.2. VIEWPORT
`client/public/index.html`
```html
<meta name="viewport" content="width=device-width, initial-scale=1" />
```

### 2.3. BREAKPOINTS
Breakpoints match Bootstrap 5, so the CSS agrees with Bootstrap's grid and utility classes (e.g. `d-md-none`).

| Device | Media query | Bootstrap |
|--------|-------------|-----------|
| Tablets only | `(min-width: 768px) and (max-width: 991.98px)` | `md` only |
| Tablets and below | `(max-width: 991.98px)` | below `lg` |
| Phones | `(max-width: 767.98px)` | below `md` |
| Small phones | `(max-width: 479.98px)` | — |

- `.98px` avoids a 1px overlap with Bootstrap's `min-width` breakpoints (e.g. `768px`).
- Rules cascade down: a phone also gets every "tablets and below" rule.

### 2.4. ALL SCREEN SIZES
Applied without a media query. Stops fixed-width content from overflowing narrow screens.

`Responsive.css`
```css
/* Media never grows wider than its container */
#root img,
#root video{
    max-width: 100%;
}
/* Fixed-width buttons and links shrink instead of overflowing on narrow screens */
#root .btn,
#root .refLink{
    max-width: 100%;
}
/* Long words/URLs wrap instead of pushing the page sideways */
#root p,
#root h1,
#root h2,
#root h3,
#root h4,
#root h5,
#root h6,
#root td,
#root th,
#root label{
    overflow-wrap: anywhere;
}
```
`ResponsiveForms.css`
```css
/* Form fields never grow wider than their container */
#root textarea,
#root input,
#root select{
    max-width: 100%;
}
```

### 2.5. NAVIGATION
| Screen | Behaviour |
|--------|-----------|
| Desktop | Links in a vertical column (`Header.css`) |
| Tablet (768–991px) | Links in one wrapping horizontal row |
| Phone (< 768px) | Logged in: links hidden behind a **MENU** button. Links show as a 2 × 2 grid |
| Small phone (< 480px) | Open menu links in a single column |

The MENU button (`#navToggleBtn`) is hidden from 768px up with Bootstrap's `d-md-none`. `MainHeader.js` adds the `navOpen` class to `#navigation` when the menu is open:
```jsx
<nav id='navigation' className={menuOpen ? 'navOpen' : ''} aria-label='Main navigation'>
```

`Responsive.css`
```css
/* TABLETS ONLY (768px - 991px) */
@media (min-width: 768px) and (max-width: 991.98px) {
    #root #navbarBlock,
    #root #navigation{
        width: 100%;
    }
    #root #navbar,
    #root #mainNavbar{
        flex-direction: row;
        flex-wrap: wrap;
        justify-content: center;
        width: 100%;
    }
    #root .linkItem{
        flex: 1 1 140px;
        max-width: 200px;
    }
    #root .refLink{
        width: 100%;
        font-size: 14px;
        letter-spacing: 1px;
    }
}
/* PHONES (below 768px) */
@media (max-width: 767.98px) {
    #root #navbarBlock,
    #root #navigation{
        width: 100%;
    }
    #root #navigation{
        align-items: stretch;
        gap: 8px;
    }
    /* Logged in: links stay hidden until the MENU button opens them */
    #root #navigation:not(.navOpen) #navbar{
        display: none;
    }
    /* Open menu / logged-out links: 2 x 2 grid */
    #root #navbar,
    #root #mainNavbar{
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 8px;
        width: 100%;
    }
    #root .linkItem{
        width: 100%;
    }
    #root .refLink{
        width: 100%;
        font-size: 14px;
        letter-spacing: 1px;
    }
}
/* SMALL PHONES (below 480px) */
@media (max-width: 479.98px) {
    /* Open menu links in a single column (logged-out LOGIN/REGISTRATION stay side by side) */
    #root #navbar{
        grid-template-columns: 1fr;
    }
}
```
`Header.css`: MENU button styling
```css
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

### 2.6. LAYOUT
On phones, the desktop centring columns, Bootstrap row margins and the decorative clocks are removed so content uses the full width.

`Responsive.css`
```css
@media (max-width: 767.98px) {
    /* Empty spacer columns (used to centre content on desktop) take no room on phones */
    #root .row > .col:empty{
        display: none;
    }
    /* Bootstrap rows have negative margins; stop them causing sideways scrolling */
    #root .row{
        margin-left: 0px;
        margin-right: 0px;
    }
    #routesContainer{
        padding-left: 5px;
        padding-right: 5px;
    }
    /* Horizontal stacks wrap onto extra lines instead of overflowing */
    #root .hstack{
        flex-wrap: wrap;
        justify-content: center;
    }
    #root .hstack > .ms-auto:empty{
        display: none;
    }
    /* Hide the footer clock (decorative) */
    #root #footerRow1{
        display: none;
    }
    /* HOME: stack the label above its description */
    #root #welcomeBlock{
        width: 100%;
    }
    #root .listSpan{
        grid-template-columns: 1fr;
        gap: 2px;
    }
}
```
`Header.css`: header clock
```css
/* Scoped to #mainHeaderDiv (logged-out layout) because #headerRow1 in the
   logged-in layout (#headerDiv) holds the page heading, which must stay visible. */
@media (max-width: 767.98px) {
    #mainHeaderDiv > #headerRow1{
        display: none;
    }
}
```
**Translator and note text boxes** (tablets and below)
```css
@media (max-width: 991.98px) {
    /* Translator: stack the source and translated text boxes */
    #root #translatedInputDiv{
        flex-wrap: wrap;
        justify-content: center;
    }
    #root #sourceTextBlock,
    #root #translatedTextBlock{
        width: 100%;
    }
    /* Note text areas fill their form */
    #root #noteTextInput,
    #root #editNoteTextInput{
        width: 100%;
    }
}
@media (max-width: 767.98px) {
    #root #noteTextInput{
        height: 200px;
    }
    #root #sourceText,
    #root #translatedText{
        height: 160px;
    }
}
```

### 2.7. TOGGLE BUTTONS
A toggle is a caption (`.btnTextSpan`, e.g. "OPEN USER NOTES" + icon) followed by its button, wrapped in a div. Several toggles sit in a vertical Bootstrap Stack (`.vstack`). On smaller screens each group becomes a grid: 2 per row when there is room, 1 per row on small phones.

`:has()` selects the parent based on its children, so no extra class names are needed in the JSX.

`Responsive.css`
```css
@media (max-width: 991.98px) {
    /* Toggle groups become a grid: 2 per row when there is room, 1 per row when not */
    #root .vstack:has(> div > .btnTextSpan){
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
        gap: 8px !important;
        align-items: stretch;
        padding: 6px;
    }
    /* Each toggle: caption on top, button underneath, buttons line up across a row */
    #root div:has(> .btnTextSpan + .btn){
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: space-between;
        gap: 6px;
        width: 100%;
        min-width: 0;
        height: 100%;
        margin: 0px;
        padding: 6px 4px !important;
    }
    /* Captions wrap and stay centred; the icon never gets squashed */
    #root .btnTextSpan{
        flex-wrap: wrap;
        text-align: center;
    }
    #root .btnTextSpan svg{
        flex-shrink: 0;
    }
    /* Toggle buttons: flexible width, taller tap target, text may wrap */
    #root .btnTextSpan ~ .btn{
        width: 100%;
        max-width: 280px;
        min-height: 44px;
        height: auto;
        padding: 4px 8px;
        white-space: normal;
        letter-spacing: 1px;
        line-height: 1.2;
    }
    /* Keyboard focus is clearly visible */
    #root .btnTextSpan ~ .btn:focus-visible{
        outline: 3px solid #323A42;
        outline-offset: 2px;
    }
}
@media (max-width: 479.98px) {
    /* One toggle per row, button fills the width for easy tapping */
    #root .vstack:has(> div > .btnTextSpan){
        grid-template-columns: 1fr;
    }
    #root .btnTextSpan ~ .btn{
        width: 100%;
        max-width: 100%;
    }
}
```

### 2.8. TABLES
| Screen | Behaviour |
|--------|-----------|
| Tablet (< 992px) | Wide tables scroll sideways inside their wrapper. Smaller text and padding |
| Phone (< 768px) | Each row becomes a **card**: one cell per line, with the column name in front of the value |
| Small phone (< 480px) | Column name sits **above** the value. Table buttons stack full width |

The calendar is excluded with `:not(.calendarTable)` so it keeps its grid.

**JSX requirements** (set in the list components):
- Every body cell carries `data-label='COLUMN NAME'`, shown in front of the value with `::before { content: attr(data-label); }`.
- Button cells have `className='tableBtnCell'`.
```jsx
<td data-label='TITLE'>{note.title}</td>
<td className='tableBtnCell'>{/* buttons */}</td>
```

`Responsive.css`
```css
/* TABLETS (below 992px) */
@media (max-width: 991.98px) {
    /* Wide tables scroll sideways inside their wrapper instead of being clipped */
    #root #tagsTableWrapper,
    #root #notesListWrapper,
    #root #notebookTableWrapper,
    #root #usersTableWrapper,
    #root #archiveTableWrapper,
    #root #trashTableWrapper,
    #root #languageTableWrapper,
    #root #deletedTranslateWrapper,
    #root #documentTrashWrapper,
    #root #docTranslationsWrapper,
    #root #translationsTableWrapper{
        justify-content: flex-start;
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
    }
    /* Tighter text so more columns fit */
    #root table:not(.calendarTable){
        font-size: 14px;
    }
    #root table:not(.calendarTable) th,
    #root table:not(.calendarTable) td{
        letter-spacing: 1px;
        padding: 4px;
    }
}
/* PHONES (below 768px): each row becomes a card */
@media (max-width: 767.98px) {
    #root table:not(.calendarTable),
    #root table:not(.calendarTable) thead,
    #root table:not(.calendarTable) tbody,
    #root table:not(.calendarTable) tfoot,
    #root table:not(.calendarTable) tr,
    #root table:not(.calendarTable) th,
    #root table:not(.calendarTable) td{
        display: block;
        width: 100% !important;/* Beats the inline widths set on some cells */
    }
    #root table:not(.calendarTable){
        border: none;
    }
    /* Keep the table title row, hide the column-name row (labels are on each cell instead) */
    #root table:not(.calendarTable) thead tr:nth-child(n+2){
        display: none;
    }
    #root table:not(.calendarTable) thead th{
        border-radius: 6px 6px 0px 0px;
    }
    /* One card per row */
    #root table:not(.calendarTable) tbody tr{
        margin: 0px 0px 10px 0px;
        border: solid 2px #383838;
        border-radius: 6px;
        overflow: hidden;
    }
    #root table:not(.calendarTable) tbody td[data-label]{
        position: relative;
        min-height: 34px;
        margin: 0px !important;
        padding: 6px 8px 6px calc(40% + 12px) !important;
        border: none;
        border-bottom: solid 1px #383838;
        text-align: left;
    }
    /* Column name shown in front of the value */
    #root table:not(.calendarTable) tbody td[data-label]::before{
        content: attr(data-label);
        position: absolute;
        top: 6px;
        left: 8px;
        width: 40%;
        font-family: "Roboto Condensed", sans-serif;
        font-weight: 800;
        letter-spacing: 1px;
        text-decoration: underline;
        overflow-wrap: anywhere;
    }
    /* Status / colour cells that hold their own stacked content */
    #root table:not(.calendarTable) tbody td[data-label] > *{
        max-width: 100%;
    }
    /* Button cell spans the card with the buttons side by side */
    #root table:not(.calendarTable) tbody td.tableBtnCell{
        padding: 8px !important;
        border: none;
    }
    /* Loading / empty-message rows */
    #root table:not(.calendarTable) tbody td[colspan]{
        text-align: center;
        border: none;
    }
    #root table:not(.calendarTable) tfoot{
        border-radius: 0px 0px 6px 6px;
        overflow: hidden;
    }
    #root table:not(.calendarTable) tfoot td{
        letter-spacing: 1px;
        padding: 6px;
    }
}
/* SMALL PHONES (below 480px) */
@media (max-width: 479.98px) {
    /* Labels above values to give long text the full width */
    #root table:not(.calendarTable) tbody td[data-label]{
        padding: 26px 8px 6px 8px !important;
    }
    #root table:not(.calendarTable) tbody td[data-label]::before{
        width: calc(100% - 16px);
    }
    /* Table buttons stack full width */
    #root .tableBtnCell .btn{
        flex-basis: 100%;
        max-width: 100%;
    }
}
```

### 2.9. FORMS
`ResponsiveForms.css` applies to every `<form>` in the app.

| Screen | Behaviour |
|--------|-----------|
| Tablet (< 992px) | Forms use the full width; inner wrappers 95%; side-by-side fields wrap |
| Phone (< 768px) | One field per line, label above its input, inputs fill the row, buttons up to 320px wide |

```css
/* TABLETS (below 992px) */
@media (max-width: 991.98px) {
    /* Forms use more of the narrower screen (most are 80-90% wide on desktop) */
    #root form{
        width: 100%;
        max-width: 100%;
    }
    #root form fieldset{
        min-width: 0;
    }
    #root #loginFormInput,
    #root #editPasswordInput,
    #root #editProfileInput,
    #root #editNoteInput,
    #root #noteBookInput,
    #root #tagInput,
    #root #notesFormStack4{
        width: 95%;
    }
    /* Side-by-side fields wrap onto a new line when they run out of room */
    #root form .hstack{
        flex-wrap: wrap;
        justify-content: center;
    }
    #root form .hstack > .ms-auto:empty{
        display: none;
    }
    /* Long label + input pairs wrap rather than overflow */
    #root form .inputDiv{
        flex-wrap: wrap;
    }
}

/* PHONES (below 768px) */
@media (max-width: 767.98px) {
    /* Forms and their inner wrappers use the full screen width */
    #root form,
    #root #loginFormInput,
    #root #editPasswordInput,
    #root #editProfileInput,
    #root #editNoteInput,
    #root #noteBookInput,
    #root #tagInput,
    #root #notesFormStack4,
    #root #translateDocInput{
        width: 100%;
        max-width: 100%;
    }
    #root #noteTextInput{
        height: 200px;
        font-size: 14px;
    }
    #root form{
        padding: 8px;
    }
    #root form fieldset{
        width: 100%;
        min-width: 0;/* Fieldsets refuse to shrink below their content without this */
        padding: 4px 6px 8px 6px;
    }
    #root form legend{
        letter-spacing: 1px;
    }
    /* Field rows: every field takes its own full-width line */
    #root form .hstack,
    #root form .vstack{
        flex-direction: column;
        align-items: stretch;
        gap: 8px !important;
    }
    #root form .hstack > *,
    #root form .vstack > *{
        width: 100%;
        margin-left: 0px !important;/* Cancels Bootstrap's ms-auto spacing */
        padding-left: 0px;
        padding-right: 0px;
    }
    /* Label above its input */
    #root form .inputDiv,
    #root form .noteInputDiv,
    #root form .languageSelectDiv{
        flex-direction: column;
        flex-wrap: wrap;
        align-items: stretch;
        width: 100%;
    }
    /* Inputs, selects and text areas fill the row */
    #root form .input,
    #root form .inputDiv select,
    #root form .noteInputDiv select,
    #root form .editNoteInput,
    #root form .editUserInput,
    #root form .docInput,
    #root form .languageSelect,
    #root form select,
    #root form textarea,
    #root form input[type='text'],
    #root form input[type='email'],
    #root form input[type='password'],
    #root form input[type='tel'],
    #root form input[type='date'],
    #root form input[type='search'],
    #root form input[type='number'],
    #root form input[type='file']{
        width: 100%;
        max-width: 100%;
        font-size: 16px;/* 16px+ stops iPhones zooming in when a field is focused */
    }
    /* Checkboxes and radios keep their natural size next to their label */
    #root form input[type='checkbox'],
    #root form input[type='radio']{
        width: auto;
        flex-shrink: 0;
    }
    #root form #checkBoxInputDiv,
    #root form #adminConsentCheckboxDiv{
        flex-wrap: wrap;
        align-items: center;
    }
    /* Password show/hide row: input and button share the line, button wraps below if needed */
    #root form #pswdInputDiv{
        flex-wrap: wrap;
    }
    /* Translator language row keeps the swap button between the two selects */
    #root form #languageSelectBlock,
    #root form #docLanguageSelectBlock{
        flex-wrap: wrap;
        justify-content: center;
        gap: 6px;
    }
    #root form #swapLanguageBtn{
        width: 40px;
        flex: 0 0 40px;
        align-self: center;
    }
    /* Form buttons: comfortable width, centred */
    #root form .btn{
        max-width: 100%;
    }
    #root form button[type='submit'],
    #root form #clearFormBtn,
    #root form #showPswdBtn,
    #root form #showCurrentPswdBtn{
        width: 100%;
        max-width: 320px;
        align-self: center;
    }
    /* Required-field hints wrap instead of running off screen */
    #root form .requiredInfoSpan,
    #root form .reqInfoSpan,
    #root form #reqInfoSpan{
        flex-wrap: wrap;
        justify-content: center;
        text-align: center;
    }
}
```

### 2.10. BUTTONS
Desktop buttons have fixed widths and heights (see [HTML_STYLES.md](HTML_STYLES.md#8-buttons)). On smaller screens they shrink, grow taller and let their text wrap rather than being cut off. Tap targets are at least 40–44px high.

`Responsive.css`
```css
/* TABLETS (below 992px) */
@media (max-width: 991.98px) {
    /* Table button groups sit side by side and wrap */
    #root #tagTableBtns,
    #root #notebooksListBtns{
        flex-direction: row;
        flex-wrap: wrap;
        justify-content: center;
    }
    #root .btn{
        letter-spacing: 1px;
    }
}
/* PHONES (below 768px) */
@media (max-width: 767.98px) {
    /* Let button text wrap onto two lines rather than being cut off */
    #root .btn{
        height: auto;
        min-height: 40px;
        white-space: normal;
        padding-top: 4px;
        padding-bottom: 4px;
    }
    /* Button groups inside table cards sit side by side and wrap */
    #root #tableBtnDiv,
    #root #tagTableBtns,
    #root #notebooksListBtns,
    #root #usersListBtns,
    #root .archiveTableBtns,
    #root .trashTableBtns,
    #root .translationBtnDiv,
    #root .archiveBtnDiv{
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        justify-content: center;
        gap: 6px;
        width: 100%;
    }
    #root .tableBtnCell .btn{
        flex: 1 1 110px;
        max-width: 180px;
    }
    /* Note panel / translator button rows wrap */
    #root #notePadBtnBlock,
    #root #translateBtnBlock,
    #root #regisFormBtnGroup{
        flex-wrap: wrap;
        justify-content: center;
        gap: 6px;
    }
    /* Pagination controls wrap */
    #root #paginationBlock2{
        flex-wrap: wrap;
    }
}
/* SMALL PHONES (below 480px) */
@media (max-width: 479.98px) {
    #root .btn{
        font-size: 12px;
    }
    #root .btnTextSpan h6{
        font-size: 12px;
        letter-spacing: 1px;
    }
}
```

### 2.11. TEXT SIZES
| Element | Desktop | Phone (< 768px) | Small phone (< 480px) |
|---------|---------|-----------------|-----------------------|
| `#appHeading` | Bootstrap heading size | 30px | 20px |
| `#pageHeading` | Bootstrap heading size | 22px (centred) | 18px |
| `.appDescriptionHeading` | 28px | 22px | 22px |
| `.appDescriptionSubHeading` | 24px | 18px | 18px |
| `.refLink` | 16px | 14px | 14px |
| `.btn`, `.btnTextSpan h6` | 16px | 16px | 12px |
| Form inputs | — | 16px (stops iPhone zoom) | 16px |

`Responsive.css`
```css
@media (max-width: 767.98px) {
    #root #appHeading{
        font-size: 30px;
    }
    #root #pageHeading{
        font-size: 22px;
        text-align: center;
    }
    #root .appDescriptionHeading{
        font-size: 22px;
    }
    #root .appDescriptionSubHeading{
        font-size: 18px;
    }
}
@media (max-width: 479.98px) {
    #root #appHeading{
        font-size: 20px;
    }
    #root #pageHeading{
        font-size: 18px;
    }
}
```

### 2.12. ANIMATIONS
On tablets and phones all animations and transitions are switched off to save battery and avoid distraction. Loading spinners are left spinning so the app does not look frozen. This block is kept **last** in `Responsive.css` so it overrides everything above it.

Desktop users who prefer reduced motion are handled separately in `Animations.css` with `@media (prefers-reduced-motion: reduce)` (see [HTML_STYLES.md](HTML_STYLES.md#9-animations)).

`Responsive.css`
```css
@media (max-width: 991.98px) {
    html{
        scroll-behavior: auto !important;/* No smooth scrolling */
    }
    #root *:not(.spinner-border):not(.spinner-grow),
    #root *::before,
    #root *::after{
        animation: none !important;
        transition: none !important;
    }
    /* Event bar row is removed entirely on every page (Home, Login, NotePad, Notes, Translate) */
    #root #eventRow{
        display: none !important;
    }
}
```

## REFERENCES
- https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/CSS_layout/Responsive_Design
- https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_media_queries/Using_media_queries
- https://developer.mozilla.org/en-US/docs/Web/HTML/Viewport_meta_tag
- https://developer.mozilla.org/en-US/docs/Web/CSS/:has
- https://www.w3schools.com/css/css_rwd_intro.asp
- https://getbootstrap.com/docs/5.3/layout/breakpoints/
- https://react-bootstrap.netlify.app/docs/layout/grid
- https://react-bootstrap.netlify.app/docs/layout/stack
