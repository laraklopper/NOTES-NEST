# HTML STYLING

General styling formats, not all formats apply for all tags.

## TABLE OF CONTENTS
1. [BODY/HTML/ROOT](#1-bodyhtmlroot)
2. [HEADER/FOOTER](#2-headerfooter)
3. [SECTION](#3-section)
4. [NAVIGATION/LINKS](#4-navigationlinks)
    [4.1. NAVIGATION BAR](#41-navigation-bar)
    [4.2. NAVIGATION LINKS](#42-navigation-links)
    [4.3. TABS](#43-tabs)
    [4.4. LINKS](#44-links)
5. [FORMS](#5-forms)
6. [LISTS](#6-lists)
    [6.1. TABLES](#61-tables)
7. [DATA DETAILS](#7-data-details)
8. [BUTTONS](#8-buttons)
9. [ANIMATIONS](#9-animations)
10. [ERRORS](#10-errors)
11. [REFERENCES](#11-references)

---

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
header,
footer{
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    margin: 10px 0px;
    padding: 10px 0px;
    background-color: #B78830;
    gap: 10px;
}
#appHeading {
    font-family: "Roboto", sans-serif;
    font-weight: 800;
    letter-spacing: 2px;
    margin: 0px;
    padding: 0px;
}
#pageHeading {
    font-family: "Roboto", sans-serif;
    font-weight: 700;
    letter-spacing: 2px;
    margin: 0px;
    padding: 0px;
}
```
## 3. SECTION

```css
#section1{
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    margin: 0px;
    padding: 10px;
    background-color: #946E26;
}
```
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
/* #navbar{} */
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
### 4.3. TABS
### 4.4. LINKS
## 5. FORMS
```css
/* #formPanal{} */
#form{
    display: flex;
    flex-direction: column;
    align-items: center;
    margin: 0px;
    padding: 10px;
    width: 100%;
    background-color: #777d83;
    border: #323A42 solid 2px;
    gap: 10px;
}
.label{
    font-family: "Roboto Mono", monospace;
    font-weight: 700;
    color: #000;
}
.requiredIcon{
    color: #C22419;
    font-weight: 700;
    font-size: 12px;
}
```
## 6. LISTS

### 6.1. TABLES
<!-- TABLE CSS -->

## 7. DATA DETAILS

CSS styling used for selected details panals (e.g. translations, notes) or profile.

```css
.detailsPanal{
    background-color: #9E9E9E;
}

```
## 8. BUTTONS

```css
#toggleBtn,
#submitBtn{
     display: flex;
    justify-content: center;
    align-items: center;
    margin: 0px;
    padding: 0px;
    height: 40px;
    width: 180px;
    color: #000;
    font-family: "Roboto Mono", monospace;
    font-weight: 700;
    letter-spacing: 2px;
    border: solid 2px #323A42;
}
#toggleBtn:hover,
#submitBtn:hover{
       background-color: #323A42;
    color: #E8F0F6;
}
```
- Background-color for buttons based on bootstrap variant

## 9. ANIMATIONS

Styling used for animations using css, bootstrap and lucide-react.

```css

```
## 10. ERRORS
```css

```

## 11. REFERENCES

- https://react-bootstrap.netlify.app/
- https://fonts.google.com/
- https://color.adobe.com/create/color-wheel
- https://www.w3schools.com/colors/colors_groups.asp