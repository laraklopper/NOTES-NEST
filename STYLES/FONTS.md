# FONTS

## GOOGLE FONTS

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Comic+Relief:wght@400;700&family=Open+Sans:ital,wght@0,300..800;1,300..800&family=Roboto+Mono:ital,wght@0,100..700;1,100..700&family=Roboto:ital,wght@0,100..900;1,100..900&display=swap" rel="stylesheet">
```

### Roboto Mono: CSS class for a variable style

```css
/*
// <weight>: Use a value from 100 to 700
// <uniquifier>: Use a unique and descriptive class name
*/
.roboto-mono-<uniquifier> {
  font-family: "Roboto Mono", monospace;
  font-optical-sizing: auto;
  font-weight: <weight>;
  font-style: normal;
}

```

### Comic Relief: CSS classes

```css
.comic-relief-regular {
  font-family: "Comic Relief", system-ui;
  font-weight: 400;
  font-style: normal;
}

.comic-relief-bold {
  font-family: "Comic Relief", system-ui;
  font-weight: 700;
  font-style: normal;
}

```

### Roboto: CSS class for a variable style

```css
/*/ <weight>: Use a value from 100 to 900
// <uniquifier>: Use a unique and descriptive class name*/

.roboto-<uniquifier> {
  font-family: "Roboto", sans-serif;
  font-optical-sizing: auto;
  font-weight: <weight>;
  font-style: normal;
  font-variation-settings:
    "wdth" 100;
}

```

### Open Sans: CSS class for a variable style
```css
/* <weight>: Use a value from 300 to 800
 <uniquifier>: Use a unique and descriptive class name*/

 
.open-sans-<uniquifier> {
  font-family: "Open Sans", sans-serif;
  font-optical-sizing: auto;
  font-weight: <weight>;
  font-style: normal;
  font-variation-settings:
    "wdth" 100;
}

```