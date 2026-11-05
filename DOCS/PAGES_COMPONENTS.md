# CLIENT PAGES AND COMPONENTS

## 1. PAGES

| ROUTE| PURPOSE | ACCESS |
| ----| --------------------------------| ----------|
| * | Fallback 404 page for unknown routes (both states) | Public |
### LOGGED OUT

**`loggedIn state === false`**

ROUTE||FILE|  PURPOSE | ACCESS |
|-------|-------|--------|-----|
|  `/` | [Login.js](../client/src/pages/Login.js) | Landing page; Form for user login | **PRIVATE** |
| `/reg` | [Registration.js](../client/src/pages/Register.js)| Registration Form(sign up) form | **PRIVATE** |

### LOGGED IN

**`loggedIn state === true`**

| ROUTE| FILE| PURPOSE | ACCESS |
|-------|-------|--------|-----|
| `/`| [Home.js](../client/src/pages/Home.js)| Landing page if LoggedIn, Application Description, user profile and editProfile & editPassword forms | Private |
| `/notePad`| NotePad.js | | PRIVATE |
| `/notes`| Notes.js|
| |Translate.js |
| Trash.js |
| Users.js| 
## COMPONENTS

| COMPONENT FILE | DESCRIPTION| PAGE/COMPONENT | loggedIn State *`(App.js)`* |
| ------------|-------------|---------------|--------------|
| MainHeader.js | Header for Login and registration Pages | Login.js, Registion.js | *loggedIn === false*|
| [LoginForm.js](../client/src/components/LoginForm.js) | Form for user login | Login.js |*loggedIn === false* |
| RegistrationForm.js | Form for user registration | Form for user registration | |*loggedIn === false* |


### FORM COMPONENTS

|COMPONENT NAME | PURPOSE | FILE | ENDPOINT(IF APPLICABLE) | METHOD(IF APPLICABLE)|
|----------|----------|-------|
| [LoginForm.js](../client/src/components/LoginForm.js) | Form for user login | |`/login`| **POST**| 
|RegistrationForm.js | Form for user registration || |*loggedIn === false* |