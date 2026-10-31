# HTML STYLING

General styling formats, not all formats apply for all tags.

## TABLE OF CONTENTS

## 1. BODY/HTML/ROOT
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

```css
header{
    background-color: #E5AA3C;
}
```
## 3. SECTION


## 4. NAVIGATION/LINKS

### 4.1. NAVIGATION BAR

```css
#mainNavbar{
    margin: 0px;
    padding: 0px;
    display: flex;
    gap: 10px;
    list-style-type: none;
}
```
### 4.2. NAVIGATION LINKS
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
.refLink:hover{
    background-color: #323A42;
    color: #E8F0F6;
    text-decoration: underline;
}
.refLink:active{
     background-color: #323A42;
    color: #E8F0F6;
    text-decoration: underline;
}
.refLink.active{
    background-color: #323A42;
    color: #E8F0F6;
    text-decoration: underline;
}
```
### 4.3. LINKS
## 5. FORMS

## 6. LISTS

## 7. BUTTONS

## 8. ANIMATIONS

## 9. ERRORS

## 10. REFERENCES