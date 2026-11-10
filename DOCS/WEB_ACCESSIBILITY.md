# WEB ACCESSIBILITY



## TABLE OF CONTENTS
1. [OVERVIEW](#1-overview)
2. []()
3. [COMMON ARIA USAGE EMAMPLES](#3-common-aria-usage-examples)
4. [ASSISTIVE TECHNOLOGIES (AT)](#4-assistive-technologies-at)
5. [CONCLUSION](#5-conclusion)
6. [REFERENCES](#6-references)

## 1. OVERVIEW

<!-- INTRODUCTION -->
`Accessibility` is the practice of making your websites usable by as many people as possible. The domain of web accessibility defines how to design and developing websites, applications and make web content usable for people with disabilities so that they can use them effectively. 

The two main standards bodies driving web accessibility are **Web Accessibility Initiative (`WAI`)** and its technical specification **Accessible Rich Internet Applications (`ARIA`)**. Together, WAI-ARIA gives developers a standardised vocabulary of HTML attributes that bridge the gap between what is displayed on screen and what assistive technologies (such as screen readers) communicate to users.

Extensions and apps that simplify text, add text-to-speech, or customise typography (e.g. **Immersive Reader**, **Retext**, dyslexia-friendly font tools) benefit from clean semantic HTML and consistent, predictable page structure.
Web accessibility means and applications so that people with disabilities can use them effectively. 

### 1.1. WHY IT MATTERS?

There are several disabilities that affect web use include visual impairments (blindness, low vision, colour blindness), motor impairments, hearing impairments, and cognitive or neurological conditions.

**Web accessibility:**

- Gives more people equal access to information and services
- Improves usability and the overall user experience
- Supports legal and organisational accessibility requirements
- Often improves search-engine optimisation through meaningful structure and text alternatives
- Makes products easier to use on mobile devices and under temporary or situational constraints
- Reduces the cost of retrofitting accessibility after a product has been built

Accessibility should be considered throughout research, design, development, content creation, testing, and maintenance.

---


### 1.2. HISTORY

| Year | Milestone |
|------|-----------|
| 1997 | W3C launches the **Web Accessibility Initiative (WAI)** in response to growing concern that the web was becoming inaccessible as HTML grew more complex. |
| 1999 | **WCAG 1.0** (Web Content Accessibility Guidelines) published — the first formal accessibility standard for web content. |
| 2008 | **WCAG 2.0** released, technology-neutral and principles-based (Perceivable, Operable, Understandable, Robust — **POUR**). **WAI-ARIA 1.0** work begins. |
| 2014 | **WAI-ARIA 1.0** officially published as a W3C Recommendation. |
| 2018 | **WCAG 2.1** released, adding criteria for mobile, low vision, and cognitive disabilities. **WAI-ARIA 1.1** published. |
| 2021 | **WAI-ARIA 1.2** published, refining roles and adding new widget patterns. |
| 2023 | **WCAG 2.2** released with additional success criteria around focus visibility and accessible authentication. |

---



 **The POUR Principles**

WCAG is organised around four principles:

| Principle | Meaning in a MERN application | Examples |
| --- | --- | --- |
| **Perceivable** | Users can obtain the information presented by React. | Alternative text, captions, contrast, responsive layouts |
| **Operable** | Users can operate every feature. | Keyboard support, visible focus, usable dialogs and menus |
| **Understandable** | Content and behaviour are clear and predictable. | Labels, consistent navigation, useful validation messages |
| **Robust** | The interface works with browsers and assistive technologies. | Semantic HTML, valid ARIA, reliable state updates |



### 2. WEB ACCESSIBILITT INITIATIVE(WAI)

The **Web Accessibility Initiative (`WAI`)** is an effort by the **World Wide Web Consortium (`W3C`)** to develop standards and guidelines to help everyone building the web ensure and improve accessibility for people with various challenges. The **WAI** is a program run by the **World Wide Web Consortium (W3C)**. `WAI's` mission is to develop strategies, guidelines, and resources that make the web accessible to people with disabilities.

WAI works with browser vendors, assistive technology developers, and the broader web community to ensure these standards are practical and widely adopted.

**`WAI`** produces several foundational accessibility standards, the most well-known being:

- **WCAG** – *Web Content Accessibility Guidelines*
- **ATAG** – *Authoring Tool Accessibility Guidelines*
- **UAAG** – *User Agent Accessibility Guidelines*
- **WAI-ARIA** – *Accessible Rich Internet Applications*



### 2.1. WHAT IS ARIA?

**ARIA** stands for **Accessible Rich Internet Applications**. Its full name is **WAI-ARIA**, and it is a technical specification published by W3C that defines a set of HTML attributes developers can add to elements to improve accessibility — particularly for dynamic, JavaScript-driven content.

ARIA works by exposing additional semantics to the **Accessibility Tree** — a parallel structure browsers build alongside the DOM that assistive technologies query. ARIA does not change visual appearance or behaviour; it only affects what is communicated to assistive technologies.

- **Rule of thumb:** Use native HTML elements first. Only reach for ARIA when no native element provides the semantics you need.

Rules for `ARIA` in React:

1. Prefer a native HTML element first. Use `HTML` elements according to their purpose.
2. Write `ARIA` attributes with their standard hyphenated names, such as `aria-label`.
3. Keep `ARIA` values synchronised with React state.
4. Do not add roles that conflict with native semantics. Semantic elements automatically expose useful names, roles, states, and keyboard behaviour.
5. Remember that `ARIA` does not automatically add keyboard behaviour.
6. Give repeated landmarks unique labels when users need to distinguish them.

### 2.2. WHAT IS WCAG?

Web Content Accessibility Guidelines (WCAG) 2 is developed through the W3C process in cooperation with individuals and organizations around the world, with a goal of providing a single shared standard for web content accessibility that meets the needs of individuals, organizations, and governments internationally.

The WCAG documents explain how to make web content more accessible to people with disabilities. Web “content” generally refers to the information in a web page or web application, including:

natural information such as text, images, and sounds
code or markup that defines structure, presentation, etc.
WCAG applies to dynamic content, multimedia, web on mobile, and AI web interfaces. WCAG can also be applied to non-web information and communications technologies (ICT) such as native apps, software, and documents

### 2.3. WHAT IS ATAG?

Authoring tools are software and services that “authors” (web developers, designers, writers, etc.) use to produce web content (static web pages, dynamic web applications, etc.).

ATAG has two main parts:

- Part A is about making the authoring tool itself accessible.
- Part B is about the authoring tool helping authors produce accessible content.

### 2.4. WHAT IS UAAG?

The User Agent Accessibility Guidelines (UAAG) documents explain how to make user agents accessible to people with disabilities. 



## 3. COMMON ARIA USAGE EXAMPLES

### 2.1 USAGE IN MERN STACK

A **MERN** stack application **(MongoDB, Express, React, Node.js)** renders the UI almost entirely through JavaScript in the browser. In a **MERN** Stack, web accessibility is not limited to styling React components. It affects the entire system:

| **MERN COMPONENT** | **USAGE**|
|----|-----|
|**MongoDB** | Stores content and accessibility-related metadata.|
| **Express** and **Node.js** | Return clear, predictable data and errors.|
|**React**| Renders semantic interfaces, manages focus, and announces dynamic changes.|
|**CSS**| Provides readable, responsive, and clearly focused interfaces.|
|**Testing and team processes** |Prevent accessibility regressions. |

**Key areas where ARIA applies in a React frontend:**

| Concern | Approach |
|---------|----------|
| Single-Page Navigation | Use `aria-live` regions or announce route changes so screen readers know the page has changed. |
| Loading / Async States | Add `aria-busy="true"` to containers while data is fetching and `aria-live="polite"` to announce when content loads. |
| Modal Dialogs | Set `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, and trap keyboard focus inside the modal. |
| Custom Form Controls | Label every input with `aria-label` or `aria-labelledby`; communicate validation errors via `aria-describedby` and `aria-invalid`. |
| Dynamic Tables / Lists | Use semantic `<table>` / `<ul>` elements where possible; apply `aria-sort` on sortable column headers. |
| Icon-only Buttons | Add `aria-label` to convey purpose when there is no visible text label. |
### 2.3. KEY ARIA ROLES

Roles define what an element *is*. They map to native HTML elements where possible.

| Role | HTML Equivalent | Use When |
|------|----------------|----------|
| `banner` | `<header>` | Top-level site header. |
| `navigation` | `<nav>` | A set of navigation links. |
| `main` | `<main>` | The primary page content. |
| `complementary` | `<aside>` | Supporting content (sidebar). |
| `contentinfo` | `<footer>` | Bottom-of-page information (copyright, links). |
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
| `progressbar` | — | An operation in progress. |

### 2.3. COMMON ARIA ATTRIBUTES

Attributes describe the *state* or *properties* of an element.

| Attribute | Type | Purpose |
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
<!-- ACCESIBILIY TOOLS -->
Assistive technologies are software or hardware tools that supports people with disabilities that allow them to interact with digital content which would otherwise be difficult.


### 4.1. SCREEN READERS
These are pieces of software that read out webpage content or content from other apps installed on someone's operating system. Screen readers enable people to use computers without having to see any visual content.
Convert on-screen text and ARIA semantics into synthesised speech or Braille output

### 4.2. LARGE TEXT AND BRAILLE KEYBOARD DISPLAYS

large text keyboards designed for use by visually impaired or older users, and braille keyboards designed to be usable by blind and severely visually impaired people.

Refreshable Braille devices connect to a computer and render text as tactile Braille dots in real time, often alongside a screen reader.

### 4.3. SWITCH CONTROLS
Switch controls provide a mechanism for interacting with devices for users with very limited mobility or cognitive impairment.

A switch control setup usually involves two parts:

A physical switch or button for activating options on the device. You can also assign switch functionality to regular device buttons (such as volume controls) or keys on a keyboard.
A device mode or third-party software add-on that makes the device compatible with the switch or button control. For example, Switch Access on Android is a mode whereby the different options in various situations (for example, apps on the home screen) are cycled through and then the one you want can be selected with a button or switch when reached.

Tools such as **ZoomText** and the built-in magnifiers on Windows, macOS, and iOS enlarge portions of the screen. Responsive layouts and sufficient colour contrast support these users.


### 4.4. SCREEN MANIFICATION

Screen magnifiers provide partially-sighted users with a magnified view of their device's display to enable them to understand and interact with device content more easily, as well as providing other features such as color adjustment to help with color blindness, and adjusting the size of mouse pointers and text cursors to make them easier to see.

Extensions and apps that simplify text, add text-to-speech, or customise typography (e.g. **Immersive Reader**, **Retext**, dyslexia-friendly font tools) benefit from clean semantic HTML and consistent, predictable page structure.

### 4.5 Accessibility APIs
Web browsers make use of special accessibility APIs (provided by the underlying operating system) that expose information useful for assistive technologies (ATs) — ATs mostly tend to make use of semantic information, so this information doesn't include things like styling information, or JavaScript.

Different operating systems have different accessibility APIs available:

|OPERATING SYSTEM| ACCESSIBILITY APIS |
|-------|------------|
|Windows: |MSAA/IAccessible, UIAExpress, IAccessible2 |
| macOS: | NSAccessibility|
|Linux: | AT-SPI |
|Android:| Accessibility framework |
|iOS:| UIAccessibility|
---

## 4. CONCLUSION

Accessibility in a MERN application is a full-stack quality concern. React creates most of the user interface, but Express must return understandable information and MongoDB must preserve the content needed to create accessible experiences.

---

## 5. REFERENCES

- https://www.w3.org/WAI/fundamentals/accessibility-intro/
- https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Accessibility/What_is_accessibility#accessibility_apis
- https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA
- https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Accessibility/Tooling#accessibility_tools
- https://www.w3.org/WAI/standards-guidelines/atag/
- https://www.w3.org/WAI/standards-guidelines/uaag/
- https://www.w3.org/WAI/standards-guidelines/wcag/