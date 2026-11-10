# WEB ACCESSIBILITY IN MERN STACK

## TABLE OF CONTENTS
1. [OVERVIEW](#1-overview)
    - [1.1. WHY IT MATTERS?](#11-why-it-matters)
    - [1.2. HISTORY](#12-history)
2. [WEB ACCESSIBILITT INITIATIVE(WAI) AND STANDARDS](#2-web-accessibility-initiativewai-and-standards)
    - [2.1. WHAT IS ARIA?](#21-what-is-aria)
    - [2.2. WHAT IS WCAG?](#22-what-is-wcag)
        - [2.2.1. **The POUR Principles**](#221-the-pour-principles)
    - [2.3. WHAT IS ATAG?](#23-what-is-atag)
    - [2.4. WHAT IS UAAG?](#24-what-is-uaag)
3. [COMMON ARIA PATTERNS IN REACT ](#3-common-aria-patterns-in-react)
    - [3.1. USAGE ACROSS MERN STACK](#31-usage-accross-mern-stack)
    - [3.2. CHOOSING A PATTERN](#32-choosing-a-pattern)
    - [3.3. KEY ARIA ROLES](#33-key-aria-roles)
    - [3.4. COMMON ARIA ATTRIBUTES](#34-common-aria-attributes)
4. [ASSISTIVE TECHNOLOGIES (AT)](#4-assistive-technologies-at)
    - [4.1. ACCESSIBILIY API](#41-accessibiliy-api)
5. [CONCLUSION](#5-conclusion)
6. [REFERENCES](#6-references)

- *View [GLOSSARY.md](../GLOSSARY.md) for terminology*

----

## 1. OVERVIEW

<!-- INTRODUCTION -->
`Accessibility` is the practice of making your websites usable by as many people as possible. The domain of web accessibility defines how to design and developing websites, applications and make web content usable for people with disabilities so that they can use them effectively. In a MERN application, React presents the interface, while Express, Node.js and MongoDB help supply the information the interface needs.

Extensions and apps that simplify text, add text-to-speech, or customise typography (e.g. **Immersive Reader**, **Retext**, dyslexia-friendly font tools) benefit from clean semantic HTML and consistent, predictable page structure.
Web accessibility means and applications so that people with disabilities can use them effectively. 

The **Web Accessibility Initiative (`WAI`)** is the W3C programme that produces the main web accessibility standards. One of those standards is **Accessible Rich Internet Applications (`ARIA`)**, a technical specification. Together, **WAI-ARIA** gives developers a standardised vocabulary of HTML attributes that bridges the gap between what is displayed on screen and what assistive technologies (such as screen readers) communicate to users.

### 1.1. WHY IT MATTERS?

People may use the web with visual, hearing, motor, cognitive or neurological disabilities. They may navigate with a keyboard, use a screen reader, enlarge text, or rely on captions to follow a video. The same design choices can help someone using a phone in bright sunlight, working in a noisy environment, or recovering from an injury.

**Web accessibility:**
 
- Gives more people equal access to information and services
- Improves usability and the overall user experience
- Supports legal and organisational accessibility requirements
- Often improves search-engine optimisation through meaningful structure and text alternatives
- Makes products easier to use on mobile devices and under temporary or situational constraints (e.g. a broken arm, bright sunlight, a noisy environment)
- Reduces the cost of retrofitting accessibility after a product has been built
Accessibility should be considered throughout research, design, development, content creation, testing, and maintenance.


---

### 1.2. HISTORY
| Year | Milestone |
| --- | --- |
| 1997 | The World Wide Web Consortium (W3C) launches its [Web Accessibility Initiative (WAI)](https://www.w3.org/press-releases/1997/wai-launch/). |
| 1999 | W3C publishes [WCAG 1.0](https://www.w3.org/TR/WCAG10/). |
| 2008 | W3C publishes [WCAG 2.0](https://www.w3.org/standards/history/WCAG20/), organised around four principles known as POUR. |
| 2014 | [WAI-ARIA 1.0](https://www.w3.org/standards/history/wai-aria/) becomes a W3C Recommendation. |
| 2017 | [WAI-ARIA 1.1](https://www.w3.org/standards/history/wai-aria-1.1/) becomes a W3C Recommendation. |
| 2018 | W3C publishes [WCAG 2.1](https://www.w3.org/standards/history/WCAG21/), adding criteria that address needs including mobile use, low vision and cognitive accessibility. |
| 2023 | [WAI-ARIA 1.2](https://www.w3.org/standards/history/wai-aria-1.2/) becomes a W3C Recommendation. W3C first publishes [WCAG 2.2](https://www.w3.org/WAI/standards-guidelines/wcag/), adding criteria for areas such as focus obscured by other content, target size and accessible authentication. |

---



### 2. WEB ACCESSIBILITY INITIATIVE(WAI) AND STANDARDS

The **Web Accessibility Initiative (`WAI`)** is an initiative by the **World Wide Web Consortium (`W3C`)** to develop standards and guidelines to help everyone building the web ensure and improve accessibility for people with various challenges. The **WAI** is a program run by the **World Wide Web Consortium (W3C)**. 

<!-- `WAI's` mission is to develop strategies, guidelines, and resources that make the web accessible to people with disabilities. -->

WAI works with browser vendors, assistive technology developers, and the broader web community to ensure these standards are practical and widely adopted.

**`WAI`** produces several foundational accessibility standards, the most well-known being:

- **WCAG** – *Web Content Accessibility Guidelines*
- **ATAG** – *Authoring Tool Accessibility Guidelines*
- **UAAG** – *User Agent Accessibility Guidelines*
- **WAI-ARIA** – *Accessible Rich Internet Applications*



### 2.1. WHAT IS ARIA?

**Accessible Rich Internet Applications (`ARIA`)**. Its full name is **WAI-ARIA**, and it is a technical specification published by W3C that defines a set of HTML attributes developers can add to elements to improve accessibility — particularly for dynamic, JavaScript-driven content.

`ARIA` works by exposing additional semantics to the **Accessibility Tree** — a parallel structure build by browsers alongside the `DOM` that assistive technologies query.
Assistive technologies use the exposed information to identify an element's name, role and state.
`ARIA` does not change visual appearance or behaviour; it only affects what is communicated to assistive technologies.

Start with semantic HTML.  A native `<button>` already exposes the button role and supports activation with Enter and Space. Only reach for ARIA when no native element provides the semantics you need. *Use `ARIA` where the interface needs additional information, such as a disclosure's expanded state*. For custom controls, implement keyboard interaction, focus management and visual states alongside the ARIA attributes.

In `JSX`, ARIA attributes keep their HTML spellings, such as `aria-expanded` and `aria-labelledby`. Derive their values from the same React state that controls what users see. Give repeated landmarks distinct names when they serve different purposes, such as “Main navigation” and “Account navigation”.

### 2.2. WHAT IS WCAG?

**Web Content Accessibility Guidelines (WCAG) 2** is developed through the W3C process in cooperation with individuals and organisations around the world, with the goal of providing a single shared standard for web content accessibility that meets the needs of individuals, organisations, and governments internationally.
 
The WCAG documents explain how to make web content more accessible to people with disabilities. Web "content" generally refers to the information in a web page or web application, including:
 
- **Natural information** such as text, images, and sounds
- **Code or markup** that defines structure, presentation, etc.
WCAG applies to dynamic content, multimedia, mobile web, and AI web interfaces. It can also be applied to non-web information and communications technologies (ICT) such as native apps, software, and documents.
 
**Conformance levels**
 
| Level | Meaning |
|-------|---------|
| **A** | Minimum level — the most basic barriers are removed. |
| **AA** | The level most laws and organisational policies target. |
| **AAA** | The highest level — not always achievable for all content. |
 
### 2.2.1. **The POUR Principles**
 
WCAG is organised around four principles:
 
| Principle | Meaning in a MERN Application | Examples |
|-----------|-------------------------------|----------|
| **Perceivable** | Users can obtain the information presented by React. | Alternative text, captions, contrast, responsive layouts |
| **Operable** | Users can operate every feature. | Keyboard support, visible focus, usable dialogs and menus |
| **Understandable** | Content and behaviour are clear and predictable. | Labels, consistent navigation, useful validation messages |
| **Robust** | The interface works with browsers and assistive technologies. | Semantic HTML, valid ARIA, reliable state updates |


### 2.3. WHAT IS ATAG?

`ATAG` covers tools *(software and services)* that *“authors”* (web developers, designers, writers, etc.) use to produce web content (static web pages, dynamic web applications, etc.). use to create web content, 

such as a content management system or rich-text editor.
Authoring tools are software and services that 

`ATAG` has two main parts:

- **Part A** covers the accessibility of the authoring tool itself. An editor's toolbar, for example, should work with a keyboard.
- **Part B** covers how the tool helps authors create accessible content. An image uploader, for example, can prompt authors to describe informative images and offer a way to mark decorative images.

### 2.4. WHAT IS UAAG?

**`UAAG`** covers software that presents web content, such as browsers and media players. It addresses features such as keyboard operation and user control over how content is displayed.


## 3. COMMON ARIA PATTERNS IN REACT 

### 3.1. USAGE ACCROSS MERN STACK

A **MERN** stack application **(MongoDB, Express, React, Node.js)** renders the UI almost entirely through JavaScript in the browser. In a **MERN** Stack, web accessibility is not limited to styling React components. It affects the entire system:

| Layer | Accessibility responsibility |
| --- | --- |
| **MongoDB** | Store content and metadata such as image descriptions, captions and language when the application needs them. |
| **Express and Node.js** | Return predictable responses and field-specific validation errors that React can display next to the relevant inputs. |
| **React** | Render semantic HTML, provide accessible names, manage focus and communicate relevant dynamic changes. |
| **CSS** | Keep focus visible and support readable text, adequate contrast, zoom and responsive layouts. |
| **Testing** | Use keyboard and screen reader checks on complete workflows, alongside automated checks. |


### 3.2. CHOOSING A PATTERN

| Scenario | Implementation |
| --- | --- |
| **Single-page navigation** | Update the document title for each route. After a user navigates to a new page, consider moving focus to its heading or using a route announcement. Keep focus in place when the user is simply filtering a list. |
| **Loading and results** | Use `aria-busy` on a region while it updates. Keep a separate, mounted `role="status"` element for useful messages such as “12 clients found”. |
| **Modal dialog** | Use a labelled native `<dialog>` opened with `showModal()`, or an accessible dialog component. Check initial focus, Tab and Shift+Tab behaviour, Escape dismissal and focus restoration. A custom modal needs these behaviours in addition to `role="dialog"` and `aria-modal="true"`. |
| **Form validation** | Associate visible labels with controls using `htmlFor` and `id`. Set `aria-invalid` when a field has an error and use `aria-describedby` to associate its error text with the control. |
| **Sortable tables** | Use a native table with a button inside each sortable column header. Set `aria-sort` on the header cell for the currently sorted column and update it when the sort changes. |
| **Icon-only buttons** | Give the button a descriptive name such as `aria-label="Close dialog"`. Hide a decorative icon from assistive technologies with `aria-hidden="true"`. |
**Key areas where ARIA applies in a React frontend:**

### 3.3. KEY ARIA ROLES

Roles are defined and described by their characteristics and defines wha an element *is*. 

Characteristics define the structural function of a role, such as what a role is, concepts behind it, and what instances the role can or must contain. They map to native `HTML` elements where possible. 
<!-- Prefer the native element when it supplies the role and interaction the design needs. -->

| Role | HTML Equivalent | Use When |
|------|----------------|----------|
| `banner` | `<header>` | Top-level site header.  (Page-level) |
| `navigation` | `<nav>` | A set of navigation links. |
| `main` | `<main>` | The primary page content. |
| `complementary` | `<aside>` | Supporting content (sidebar). |
| `contentinfo` | `<footer>` | Bottom-of-page information (copyright, links). (Page-level)|
| `form` | `<form>` | A landmark form region (needs an accessible name). |
| `search` | `<search>` | A search landmark. |
| `dialog` | — | A modal or non-modal dialog window. |
| `alertdialog` | — | A dialog that requires immediate user response. |
| `alert` | — | An important, auto-announced message. |
| `status` | — | A polite live region (e.g. "Saved successfully"). |
| `button` | `<button>` | An interactive control that triggers an action. |
| `checkbox` | `<input type="checkbox">` | A binary on/off control. |
| `listbox` | `<select>` | A list of selectable options. |
| `tab` / `tablist` / `tabpanel` | — | Tab widget components. |
| `grid` | `<table>` (interactive) | An interactive grid or spreadsheet. |
| `progressbar` | — | An operation in progress. *A labelled `<progress>` element for progress on a task.* |

### 3.4. COMMON ARIA ATTRIBUTES

Attributes describe the *state* or *properties* of an element.

| Attribute | Type | What it communicates |
|-----------|------|---------|
| `aria-label` | Property | Provides an accessible name when no visible label exists. |
| `aria-labelledby` | Property | Points to another element whose text labels this element. |
|`aria-controls`|Property| Identifies the element (or elements) whose contents or presence are controlled by the current element.|
| `aria-describedby` | Property | Points to an element that provides additional description. |
| `aria-hidden="true"` | Property | Removes an element from the accessibility tree (decorative icons, etc.). |
| `aria-live` | Property | Marks a region as live: `"polite"` waits for idle, `"assertive"` interrupts immediately. |
| `aria-atomic` | Property | Whether the entire live region or only the changed node is announced. |
| `aria-expanded` | State | Whether a disclosure widget (accordion, menu) is open (`true`) or closed (`false`). |
| `aria-haspopup` | Property | Indicates that an element opens a popup (menu, listbox, dialog, etc.). |
| `aria-controls` | Property | References the element(s) controlled by this element. |
| `aria-selected` | State | Whether an option, tab, or grid cell is selected. |
| `aria-checked` | State | Whether a checkbox or radio is checked (`true`, `false`, `mixed`). |
| `aria-disabled` | State | Whether an element is functionally disabled (still focusable, unlike `disabled`). |
| `aria-invalid` | State | Whether a form field's value is invalid; pair with `aria-describedby` for error messages. |
| `aria-required` | Property | Indicates that a form field must be filled before submission. |
| `aria-busy` | State | Indicates a live region is being updated; set `"true"` during loading, then `"false"`. |
| `aria-current` | State | Marks the current item in a set: `"page"`, `"step"`, `"location"`, etc. |
| `aria-modal` | Property | Tells AT that a dialog is modal and content outside it is inert. |
| `aria-sort` | Property | Indicates sort direction on a column header: `"ascending"`, `"descending"`, `"none"`. |

---

## 4. ASSISTIVE TECHNOLOGIES (AT)

Assistive technologies are software or hardware tools that supports people with disabilities that allow them to interact with digital content which would otherwise be difficult.

| Technology | How people use it | What helps in a web app |
| --- | --- | --- |
| **Screen readers** | NVDA, JAWS, VoiceOver and TalkBack present text and interface semantics through speech or a connected braille display. | Use descriptive headings, names for controls and meaningful status updates. |
| **Refreshable braille displays and adapted keyboards** | A braille display presents text through tactile pins. Adapted keyboards may offer large-print keys or alternative input layouts. | Use clear labels and make controls usable through standard keyboard interaction. |
| **Switch controls** | Users can scan available choices and select one using an external switch or a configured device control. | Keep focus order logical and make interactive controls reachable and operable without pointer gestures. |
| **Screen magnifiers** | Tools such as ZoomText and built-in magnifiers enlarge parts of the display. | Support zoom and reflow, preserve visible focus and keep related labels and controls close together. |
| **Reading and text-to-speech tools** | Reading modes and tools such as Immersive Reader can simplify presentation, customise typography or read text aloud. | Use semantic headings, paragraphs, lists and a meaningful reading order. |

### 4.1 ACCESSIBILIY API

Web browsers make use of special accessibility APIs. ATs mostly tend to make use of semantic information, so this information doesn't include things like styling information, or JavaScript.

*AT*s mostly tend to make use of semantic information, so this information doesn't include things like styling information, or JavaScript.

The APIs in use depend on the operating system, browser and assistive technology.

| Platform | Examples |
| --- | --- |
| **Windows** | Microsoft Active Accessibility (MSAA), UI Automation (UIA), IAccessible2 |
| **macOS** | NSAccessibility |
| **Linux** | AT-SPI |
| **Android** | Android accessibility framework |
| **iOS** | UIAccessibility |
---

## 5. CONCLUSION

Accessibility in aN application is a full-stack quality concern. In `MERN STACK` depends on how data, `API` responses and the React interface work together. React creates most of the user interface, but Express must return understandable information and MongoDB must preserve the content needed to create accessible experiences.

 A client form illustrates the connection. Express returns a field-specific error, React renders it beside a labelled input, and a keyboard or screen reader user can find the field, understand the error and correct it.



---
## 6. REFERENCES

- [W3C WAI introduction to web accessibility](https://www.w3.org/WAI/fundamentals/accessibility-intro/)
- [W3C WCAG overview](https://www.w3.org/WAI/standards-guidelines/wcag/)
- [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- [W3C WCAG2ICT guidance](https://www.w3.org/TR/wcag2ict-22/)
- [W3C THE ROLES MODEL5](https://www.w3.org/TR/wai-aria-1.2/#roles)
- [W3C WAI-ARIA 1.2 specification](https://www.w3.org/TR/wai-aria-1.2/)
- [W3C ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/)
- [W3C ATAG overview](https://www.w3.org/WAI/standards-guidelines/atag/)
- [W3C UAAG overview](https://www.w3.org/WAI/standards-guidelines/uaag/)
- [MDN introduction to accessibility and accessibility APIs](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Accessibility/What_is_accessibility#accessibility_apis)
- [MDN accessibility tooling](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Accessibility/Tooling#accessibility_tools)
- [React DOM component props](https://react.dev/reference/react-dom/components/common)
