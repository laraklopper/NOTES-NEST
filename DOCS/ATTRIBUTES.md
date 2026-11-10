# REACT JSX ATTRIBUTES

In React, values are passed to elements using **JSX attributes**. Most built-in attributes use `camelCase`, such as `className`, `tabIndex`, and `onClick`. 
The `aria-*` and `data-*` attributes keep their hyphens.

Custom elements have two methods of passing data into them:

**Attributes**: Which are displayed in markup and can only be set to string values
**Properties**: Which are not displayed in markup and can be set to arbitrary JavaScript values
## TABLE OF CONTENTS
1. [GENERAL ATTRIBUTES](#1-general-attributes)
2. [FORM ATTRIBUTES](#2-form-attributes)
3. [LINK AND IMAGE ATTRIBUTES](#3-link-and-image-attributes)
4. [ACCESSIBILTY ATTRIBUTES](#4-accessibilty-attributes)
5. [EVENT AND REACT SCPECIFIC ATTRIBUTES](#5-event-and-react-scpecific-attributes)
6. [REACT-EXAMPLE](#6-react-example)
7. [REFERENCES](#7-references)

## 1. GENERAL ATTRIBUTES

| Attribute | Purpose | Example |
|---|---|---|
| `id` | Gives an element a unique identifier on the page | `id="email"` |
| `className` | Applies CSS classes | `className="form-control"` |
| `style` | Applies inline styles using a JavaScript object | `style={{ marginTop: 16 }}` |
| `title` | Supplies advisory text that browsers often show on hover | `title="Download report"` |
| `hidden` | Hides an element | `hidden={!isVisible}` |
| `tabIndex` | Controls whether an element can receive keyboard focus | `tabIndex={0}` |
| `role` | Defines the element’s accessibility role when needed | `role="status"` |
| `data-*` | Stores custom data on an element | `data-user-id={user.id}` |

## 2. FORM ATTRIBUTES

| Attribute | Purpose | Example |
|---|---|---|
| `htmlFor` | Connects a `<label>` to a control’s `id` | `htmlFor="email"` |
| `type` | Sets the kind of input or the behavior of a button | `type="email"` |
| `name` | Names a field for form submission | `name="email"` |
| `value` | Sets the current value of a controlled field | `value={email}` |
| `defaultValue` | Sets the initial value of an uncontrolled field | `defaultValue="Cape Town"` |
| `checked` | Sets the current state of a controlled checkbox or radio button | `checked={isSubscribed}` |
| `defaultChecked` | Sets the initial state of an uncontrolled checkbox or radio button | `defaultChecked={true}` |
| `placeholder` | Shows a short hint in an empty input | `placeholder="you@example.com"` |
| `required` | Requires a value before native form submission | `required` |
| `disabled` | Disables a form control | `disabled={isSubmitting}` |
| `readOnly` | Prevents editing in a supported field | `readOnly` |
| `autoComplete` | Gives the browser an autofill hint | `autoComplete="email"` |
| `minLength`, `maxLength` | Set length limits for text input | `minLength={8}` |
| `min`, `max`, `step` | Set bounds or increments for number and date inputs | `min={0} step={0.01}` |
| `multiple` | Allows multiple selections or files where supported | `<input type="file" multiple />` |

## 3. LINK AND IMAGE ATTRIBUTES

| Attribute | Purpose | Example |
|---|---|---|
| `href` | Sets a link’s destination | `href="/clients"` |
| `target` | Controls where a link opens | `target="_blank"` |
| `rel` | Describes the relationship to the linked page | `rel="noopener"` |
| `src` | Sets the location of an image or other resource | `src="/logo.svg"` |
| `alt` | Provides a text alternative for an image. Use `alt=""` for decorative images. | `alt="Company logo"` |
| `width`, `height` | Set an image’s dimensions | `width={120} height={60}` |
| `loading` | Controls eager or lazy image loading | `loading="lazy"` |

## 4. ACCESSIBILTY ATTRIBUTES

`ARIA` attributes enable modifying an element's states and properties as defined in the accessibility tree.

| Attribute | Purpose | Example |
|---|---|---|
| `aria-label` | Gives a control an accessible name when it has no visible label | `aria-label="Close dialog"` |
| `aria-labelledby` | Uses another element’s text as the accessible name | `aria-labelledby="dialog-title"` |
| `aria-describedby` | Associates supporting text or an error message with a control | `aria-describedby="email-error"` |
| `aria-invalid` | Indicates that a field’s current value is invalid | `aria-invalid={Boolean(emailError)}` |
| `aria-expanded` | Indicates whether a controlled section is open | `aria-expanded={isOpen}` |
| `aria-pressed` | Indicates whether a toggle button is pressed | `aria-pressed={isMuted}` |
| `aria-current` | Identifies the current page or item in a set | `aria-current="page"` |
| `aria-live` | Lets assistive technology announce dynamic updates | `aria-live="polite"` |
| `aria-hidden` | Excludes an element from the accessibility tree | `aria-hidden="true"` |

- [WEB-ACCESSIBILITY](./WEB_ACCESSIBILITY.md)

## 5. EVENT AND REACT SCPECIFIC ATTRIBUTES

| Attribute | Purpose | Example |
|---|---|---|
| `onClick` | Runs a function when an element is clicked | `onClick={handleClick}` |
| `onChange` | Handles changes to a form field | `onChange={(event) => setEmail(event.target.value)}` |
| `onSubmit` | Handles form submission | `onSubmit={handleSubmit}` |
| `onFocus`, `onBlur` | Handle a control gaining or losing focus | `onBlur={validateEmail}` |
| `onKeyDown` | Handles a key press | `onKeyDown={handleKeyDown}` |
| `key` | Gives React a stable identity for each item in a list | `<ClientRow key={client._id} />` |
| `ref` | Provides access to a DOM element, for example to focus an input | `<input ref={emailRef} />` |

## 6. REACT-EXAMPLE

Several attributes work together in a **controlled input**. React state supplies the `value`, and `onChange` updates it. The label’s `htmlFor` matches the input’s `id`.

```jsx
<label htmlFor="email">Email address</label>
<input
  id="email"
  name="email"
  type="email"
  className="form-control"
  autoComplete="email"
  value={email}
  onChange={(event) => setEmail(event.target.value)}
  required
/>
```
## 7. REFERENCES

- [ATTRIBUTES mdn](https://developer.mozilla.org/en-US/docs/Glossary/Attribute) 
- [REACT COMPONENTS](https://react.dev/reference/react-dom/components)
- [ARIA states and properties (attributes) mdn](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes)