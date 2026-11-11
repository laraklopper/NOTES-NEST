# NOTE-NEST
<!-- *NOTE-MAKER-APPLICATION* -->

## CONTENTS
1. [OVERVIEW](#1-overview)
    - [1.1. TECHNOLOGY STACK](#11-technology-stack)
    - [1.2. TARGET USERS](#12-target-users)
2. [HOW TO USE THE APPLICATION](#2-how-to-use-the-application)
3. [HOW TO RUN THE APPLICATION](#3-how-to-run-the-application)
    - [3.1. TERMINAL (`CLI`)](#31-terminal-cli)
4. [SECURITY](#4-security)
5. [API ROUTES](#5-api-routes)
    - [5.1. THIRD PARTY API'S](#51-third-party-apis)
6. [REFERENCES](#6-references)

- *View [GLOSSARY.md](GLOSSARY.md) for terminology*
<!-- - **NOTE** This application is not deployed. -->
---

## 1. OVERVIEW 

Note-Nest is a full-stack notes application written using `MERN` stack. Users can create, organise, filter and pin personal notes, group them into notebooks, label them with tags and translate notes and other text. Notes and translations can be exported to CSV or Excel (.xlsx) from export forms on their list pages. Users can keep a history of saved translations, and set default source, target and note languages on their profile. 

### 1.1. TECHNOLOGY STACK

MERN stack is a powerful combination of technologies that allows developers to build full-stack web applications efficiently.
MERN Stack works by connecting the frontend, backend, and database to create a complete web application. Each technology plays a specific role in handling user interactions, processing data, and storing information.

| *TECHNOLOGY* | *PURPOSE* | *DESCRIPTION* |
|---|----|----|
|**`MongoDB`**| database | Non-Relational Database| 
|**`Express.js`**| Web framework built on NodeJS that simplifies backend development and API creation. |
|**`React.js`**| Front-end library for building User Interfaces |
|**`Node.js`**|  JavaScript runtime environment |

### 1.2. TARGET USERS

The target users for this application include:

- Students capturing lecture and study notes.
- Developers keeping snippets, checklists and reference material.
- Multilingual users and language learners who write notes in one language and need them in another.
- Anyone wanting a lightweight, self-hosted alternative to commercial note apps.


## 2. HOW TO USE THE APPLICATION

To use the application, users are required to register (sign up) and login.

Registration collects a username, full name (firstName and LastName), contact details (email address and phone number), default language settings for  date of birth, password. Registration is, however, controlled by age restrictions.

Accounts have two roles. Regular users manage only their own data. Eligible users (21 or older, with an account at least 3 months old; 1 day during development) can upgrade to admin, which lets them view and remove non-admin user accounts.

The project is scoped as a portfolio piece that demonstrates `JWT` authentication with role-based access, `RESTful API` design, secure integration with a third-party API, data export and a responsive React front end.

## 3. HOW TO RUN THE APPLICATION

A `proxy server` is included in the front-end `package.json` to allow the front and back-end to run together. The application uses `nodemon` third-party middleware in the backend to allow the application to run in the command line interface (`CLI`) or terminal using `npm start`. The client and server folders must, however, be run separately.

The MongoDB connection `URI` is constructed using the username, password, cluster URL, and database name, which are stored as environment variables and configured using the `dotenv` middleware.

### 3.1. TERMINAL (`CLI`)

NPM (Node Package Manager) is the default package manager for Node.js.  

**Server(Express Back-End)** *(`runs on port 3001 by default`)*:
```bash
 cd server
 npm start
```

**Client(React Front-End)** *(`runs on port 3000 by default`)*:
```bash
 cd client
 npm start
```
## 4. SECURITY

The application implements a defense-in-depth security strategy using:

- Protect user credentials - (*password hashing* using `bcrypt` middleware)
    - (passwords are only stored as plaintext during development)
- Authenticate requests securely (JWT);
    - All routes that require authentication expect a `Bearer <token>` value in the `Authorization` header except in the login and registration `/auth` routes.
- Protected frontend routes that restrict access based on admin status using `RBAC`;
- Reduce common web vulnerabilities (helmet security headers, CORS rules)
- secure HTTP response headers to guard against common web attacks (XSS, clickjacking, MIME sniffing, etc.) using Helmet middleware.
- Enforce strong passwords at registration and password updates
- Limit repeated requests to API endpoints using `express-rate-limit` middleware 
- Utility functions and environmental variables for secure configuration
     - Enviromental variables are kept secret in the .env file and are never pushed to *github* using(`dotenv`).

## 5. API ROUTES

 **HTTP Verb** | **CRUD Operation** | **Description** |
|--------|-------|------|
| POST | CREATE | Used to submit data about a specific entity to the server |
| GET | READ | Used to fetch information from the database |
| PUT | UPDATE | Full replacement update of a resource on the database |
| PATCH | UPDATE | Partial update of a resource on the database |
| DELETE | DELETE | Deletes a specific resource |

- The application, however uses `PATCH` requests because there are no endpoints requiring a `PUT` request for the full replacement update of a resource in the database.


- All routes that require authentication expect a `Bearer <token>` value in the Authorization header except the  `/auth` login and registration routes
- API responses never include the password field to protec.

### 5.1. THIRD PARTY API'S

<!-- EXPLAIN USAGE -->
The application also integrates an external APIs via server-side proxy routes to keep API keys off the client:
<!-- Each route forwards to the Langbly endpoint with the same path, so the API key never reaches the browser. -->


---

## 6. REFERENCES

- https://www.geeksforgeeks.org/reactjs/reactjs-introduction/
- https://www.geeksforgeeks.org/mern/understand-mern-stack/
- https://medium.com/@ravinduprabashwarajayathilaka/introduction-to-mern-stack-199f82902ede
- https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Methods/PATCH
- https://nodejs.org/learn/getting-started/an-introduction-to-the-npm-package-manager
- https://www.geeksforgeeks.org/dbms/blob-full-form/
- https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS
- https://mongoosejs.com/docs/guide.html
- https://jwt.io/introduction
- https://helmetjs.github.io/
- https://www.geeksforgeeks.org/node-js/reading-environment-variables-from-node-js/
- https://www.npmjs.com/package/express-rate-limit
- https://react-bootstrap.netlify.app/
- https://fonts.google.com/
- https://color.adobe.com/create/color-wheel
- https://www.w3schools.com/colors/colors_groups.asp
- https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes