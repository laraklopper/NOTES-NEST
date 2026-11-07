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
    font-weight: 700;
}
.requiredIcon{
    color: #C22419;
    font-weight: 700;
    font-size: 12px;
}
```
## 6. LISTS

## 7. DATA DETAILS
```css
.detailsPanal{
    background-color: #9E9E9E;
}
#524F19
#F5EC4C
#CCC53F
#A39E33
#767224
 
#941B13
#8C1A12
#C22419
#470D09
#70150F
#B39800
#E0BF00
#AB9100
#665700
#8F7900

#066072
#044350
#9E9E9E
#506B1B
#8EBD2F
#8dbdca
#338F27;
#5F7F20
#739926
#BFBFBF
#591616
#c0c0c0
#404040
#787878
#383838
```
## 7. BUTTONS
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

## 8. ANIMATIONS

## 9. ERRORS

## 10. REFERENCES