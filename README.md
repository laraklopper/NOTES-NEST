# NOTE-NEST
<!-- *NOTE-MAKER-APPLICATION* -->

## CONTENTS
1. [OVERVIEW](#1-overview)
    - [1.1. TECHNOLOGY STACK](#11-technology-stack)
    - [1.2. TARGET USERS](#12-target-users)
    - [1.3. FEATURES](#13-features)
2. [HOW TO USE THE APPLICATION](#2-how-to-use-the-application)
    - [2.1. REGISTRATION AND LOGIN](#21-registration-and-login)
    - [2.2. PAGES](#22-pages)
    - [2.3. USER ROLES](#23-user-roles)
3. [HOW TO RUN THE APPLICATION](#3-how-to-run-the-application)
    - [3.1. PREREQUISITES](#31-prerequisites)
    - [3.2. ENVIRONMENT VARIABLES](#32-environment-variables)
    - [3.3. TERMINAL (`CLI`)](#33-terminal-cli)
4. [SECURITY](#4-security)
5. [API ROUTES](#5-api-routes)
    - [5.1. ENDPOINTS](#51-endpoints)
    - [5.2. THIRD PARTY API'S](#52-third-party-apis)
6. [PROJECT STRUCTURE](#6-project-structure)
7. [REFERENCES](#7-references)

- *View [GLOSSARY.md](GLOSSARY.md) for terminology*
<!-- - **NOTE** This application is not deployed. -->
---

## 1. OVERVIEW

Note-Nest is a full-stack notes application written using the `MERN` stack. Users can create, organise, filter and pin personal notes, group them into notebooks, label them with tags and translate notes and other text. Notes and translations can be exported to CSV or Excel (.xlsx) from export forms on their list pages. Users can keep a history of saved translations, and set default source, target and note languages on their profile.

### 1.1. TECHNOLOGY STACK

MERN stack is a powerful combination of technologies that allows developers to build full-stack web applications efficiently.
MERN Stack works by connecting the frontend, backend, and database to create a complete web application. Each technology plays a specific role in handling user interactions, processing data, and storing information.

| *TECHNOLOGY* | *PURPOSE* |
|---|----|
|**`MongoDB`**| Non-relational (document) database, accessed through the `Mongoose` ODM |
|**`Express.js`**| Web framework built on Node.js that simplifies backend development and API creation |
|**`React.js`**| Front-end library for building user interfaces |
|**`Node.js`**| JavaScript runtime environment |

**Supporting packages**

| *SIDE* | *PACKAGES* |
|---|---|
| Server | `mongoose`, `jsonwebtoken`, `bcryptjs`, `cookie-parser`, `cors`, `helmet`, `express-rate-limit`, `sanitize-html`, `csv-stringify`, `xlsx`, `dotenv`, `nodemon` |
| Client | `react-router-dom`, `react-bootstrap`, `bootstrap`, `lucide-react` |

- *See [DOCS/PACKAGES.md](DOCS/PACKAGES.md) and [STYLES/STYLING_PACKAGES.md](STYLES/STYLING_PACKAGES.md) for more detail.*

### 1.2. TARGET USERS

The target users for this application include:

- Students capturing lecture and study notes.
- Developers keeping snippets, checklists and reference material.
- Multilingual users and language learners who write notes in one language and need them in another.
- Anyone wanting a lightweight, self-hosted alternative to commercial note apps.

### 1.3. FEATURES

- **Notes** – create, edit, pin, search and filter notes (by language, notebook and tag), with pagination.
- **Notebooks** – group notes into named, colour-coded notebooks. Deleting a notebook moves its notes to "No notebook".
- **Tags** – label notes with tags. Tags that don't exist yet are created when a note is saved.
- **Archive** – hide notes from the main list without deleting them, and restore them later.
- **Trash** – deleted notes are soft-deleted and can be restored. Notes left in the trash are purged automatically after **30 days**.
- **Translation** – translate free text or notes, detect the language of text, and keep a history of saved translations.
- **Export** – download notes or translations as `.csv` or `.xlsx`, using the same filters as the list.
- **Profile** – edit profile details, change password and set default languages.
- **Admin** – eligible users can upgrade to admin to view and remove non-admin accounts.

## 2. HOW TO USE THE APPLICATION

### 2.1. REGISTRATION AND LOGIN

To use the application, users are required to register (sign up) and log in.

Registration collects:

- a username (3–30 characters, stored in lowercase),
- full name (first name and last name),
- contact details (email address and a South African phone number, e.g. `082 123 4567` or `+27 82 123 4567`),
- date of birth (users must be **at least 13 years old**),
- default source, target and note languages (optional; these default to `auto`, `fr` and `en`),
- a password (at least 8 characters, including one special character),
- consent for admin users to see the user's details (required).

After registering, the user is returned to the login page to sign in with their username and password.

### 2.2. PAGES

| *PAGE* | *PATH* | *ACCESS* | *DESCRIPTION* |
|---|---|---|---|
| Login | `/` | Logged out | Sign in with username and password |
| Register | `/reg` | Logged out | Create a new account |
| Home | `/` | User | Landing page after login |
| NotePad | `/notepad` | User | Write and edit notes |
| Notes | `/notes` | User | List, filter, pin, archive, trash and export notes; manage notebooks and tags |
| Translate | `/translate` | User | Translate text, detect languages, view and export saved translations |
| Users | `/users` | Admin | View and remove non-admin user accounts |

Any unknown path redirects to `/`.

### 2.3. USER ROLES

Accounts have two roles:

- **User** – manages only their own notes, notebooks, tags and translations.
- **Admin** – can also view all users and remove non-admin accounts (and all of their data). Admin accounts cannot be removed, so an admin cannot remove themselves.

A user can upgrade to admin from their profile if they are **21 or older** and their account is at least **3 months old** (1 day outside production). Admins can give up admin status at any time.

The project is scoped as a portfolio piece that demonstrates `JWT` authentication with role-based access, `RESTful API` design, secure integration with a third-party API, data export and a responsive React front end.

## 3. HOW TO RUN THE APPLICATION

A `proxy` (`http://localhost:3001`) is set in the front-end `package.json` so the React development server forwards API requests to the back end. The back end uses `nodemon` so the server restarts automatically when files change. The client and server folders must be run separately, each in its own terminal.

### 3.1. PREREQUISITES

- [Node.js](https://nodejs.org/) (v18 or later; the server uses the built-in `fetch`) and NPM
- A MongoDB database, either local or hosted on [MongoDB Atlas](https://www.mongodb.com/atlas)
- A [Langbly](https://langbly.com/) API key for the translation features (the rest of the app works without one)

### 3.2. ENVIRONMENT VARIABLES

Create a `.env` file in the `server` folder. It is listed in `.gitignore` and is never pushed to GitHub.

```env
# Database (required)
DATABASE_URL=mongodb+srv://<username>:<password>@<cluster-url>/
DATABASE_NAME=<database-name>

# Server
PORT=3001
NODE_ENV=development

# JWT
JWT_SECRET_KEY=
JWT_EXPIRATION=12h
JWT_ALGORITHM=HS256

# Langbly translation API
LANGBLY_API_KEY=<your-api-key>
LANGBLY_BASE_URL=https://api.langbly.com
```

| *VARIABLE* | *REQUIRED* | *DEFAULT* | *NOTES* |
|---|---|---|---|
| `DATABASE_URL` | Yes | – | MongoDB connection string. The server exits if it is missing. |
| `DATABASE_NAME` | Yes | – | Name of the database to use |
| `PORT` | No | `3001` | Port the server listens on |
| `NODE_ENV` | No | `development` | Set to `production` to hash passwords, use secure cookies and apply the 3-month admin rule |
| `JWT_SECRET_KEY` | Production only | auto-generated | In development a secure key is generated and saved to `.env` if missing. In production the server will not start without one. |
| `JWT_EXPIRATION` | No | `12h` | How long a login lasts |
| `JWT_ALGORITHM` | No | `HS256` | Signing algorithm |
| `LANGBLY_API_KEY` | For translation | – | Translation routes return `502` if it is missing |
| `LANGBLY_BASE_URL` | No | `https://api.langbly.com` | Langbly API base URL |

### 3.3. TERMINAL (`CLI`)

NPM (Node Package Manager) is the default package manager for Node.js.

**Install dependencies** *(first time only)*:
```bash
 cd server
 npm install
 cd ../client
 npm install
```

**Server (Express Back-End)** *(`runs on port 3001 by default`)*:
```bash
 cd server
 npm start
```

**Client (React Front-End)** *(`runs on port 3000 by default`)*:
```bash
 cd client
 npm start
```

Open [http://localhost:3000](http://localhost:3000) in the browser. The server only starts listening once it has connected to MongoDB.

**Other client scripts**

| *COMMAND* | *DESCRIPTION* |
|---|---|
| `npm test` | Run the React test runner |
| `npm run build` | Build an optimised production bundle into `client/build` |

## 4. SECURITY

The application implements a defense-in-depth security strategy using:

- **Password hashing** with `bcryptjs` (10 salt rounds).
    - Passwords are only stored as plaintext while `NODE_ENV` is `development`. Set `NODE_ENV=production` for any real deployment.
- **JWT authentication** – on login the server signs a token (`{ id, isAdmin }`) and sends it in an **HTTP-only, `SameSite=strict` cookie** named `token`, so client-side scripts can never read it. The cookie is `Secure` (HTTPS only) outside development.
    - Every route except `/auth/login` and `/auth/register` requires a valid token cookie.
- **Role-based access control (`RBAC`)** – admin-only API routes are guarded by `checkAdmin` middleware, and admin-only front-end routes by `ProtectedAdminRoute`.
- **Security headers** with `helmet` to guard against common web attacks (XSS, clickjacking, MIME sniffing, etc.), plus `CORS` rules.
- **Strong passwords** enforced at registration and on password updates. A new password must differ from the current one.
- **Rate limiting** with `express-rate-limit`:

    | *ENDPOINT* | *LIMIT PER IP* |
    |---|---|
    | `POST /auth/login` | 10 per 15 minutes |
    | `POST /auth/register` | 20 per hour |
    | `GET /export` | 60 per 15 minutes |
    | `POST /api/language/translate/v2` | 100 per 15 minutes |
    | `POST /api/language/translate/v2/detect` | 60 per 15 minutes |

- **Input validation** – Mongoose schema validation, rejection of non-string values (to block Mongo query-operator injection), `ObjectId` checks, and explicit field lists so a client cannot set fields such as `admin`.
- **HTML sanitising** – note content is cleaned with `sanitize-html` before it is saved.
- **No sensitive data in responses** – API responses never include the password field. Login failures return the same message for an unknown username and a wrong password, so usernames cannot be discovered.
- **Secret configuration** – environment variables are kept in the `.env` file (loaded with `dotenv`), and the Langbly API key is only used server-side.

- *See [DOCS/SECURITY.md](DOCS/SECURITY.md) for more detail.*

## 5. API ROUTES

| **HTTP Verb** | **CRUD Operation** | **Description** |
|--------|-------|------|
| POST | CREATE | Used to submit data about a specific entity to the server |
| GET | READ | Used to fetch information from the database |
| PUT | UPDATE | Full replacement update of a resource on the database |
| PATCH | UPDATE | Partial update of a resource on the database |
| DELETE | DELETE | Deletes a specific resource |

- The application only uses `PATCH` requests for updates, because no endpoint needs a `PUT` request to fully replace a resource in the database.
- All routes except `/auth/login` and `/auth/register` require the JWT `token` cookie set at login.
- API responses never include the password field.

### 5.1. ENDPOINTS

**Authentication – `/auth`**

| *VERB* | *ROUTE* | *DESCRIPTION* |
|---|---|---|
| POST | `/auth/login` | Log in and receive the token cookie |
| POST | `/auth/register` | Register a new user |
| POST | `/auth/logout` | Clear the token cookie |
| PATCH | `/auth/setAdmin` | Upgrade the logged-in user to admin (if eligible) |
| PATCH | `/auth/clearAdmin` | Remove admin status from the logged-in user |

**Users – `/user`**

| *VERB* | *ROUTE* | *DESCRIPTION* |
|---|---|---|
| GET | `/user/me` | Get the logged-in user's profile |
| GET | `/user/fetchUsers` | List all users *(admin)* |
| GET | `/user/fetchUser/:id` | Get one user's details *(admin)* |
| PATCH | `/user/editProfile` | Update the logged-in user's profile |
| PATCH | `/user/editPassword` | Change the logged-in user's password |
| DELETE | `/user/deleteUser/:id` | Remove a non-admin user and all their data *(admin)* |

**Notes – `/notes`**

| *VERB* | *ROUTE* | *DESCRIPTION* |
|---|---|---|
| GET | `/notes/fetchNotes` | List active notes (filters, search and pagination, max 50 per page) |
| GET | `/notes/trash` | List trashed notes |
| GET | `/notes/:id` | Get a single note |
| POST | `/notes/addNote` | Create a note |
| PATCH | `/notes/:id` | Update title, content, language, notebook, tags or pin |
| PATCH | `/notes/:id/restore` | Restore a note from the trash |
| DELETE | `/notes/delete/:id` | Move a note to the trash (soft delete) |
| DELETE | `/notes/:id/permanent` | Permanently delete a note and its translations |

**Archive – `/archive`**

| *VERB* | *ROUTE* | *DESCRIPTION* |
|---|---|---|
| GET | `/archive/fetchNotes` | List archived notes |
| PATCH | `/archive/:id` | Archive an active note |
| PATCH | `/archive/:id/restore` | Restore an archived note to the main list |
| DELETE | `/archive/:id` | Move an archived note to the trash |

**Notebooks – `/notebooks`**

| *VERB* | *ROUTE* | *DESCRIPTION* |
|---|---|---|
| GET | `/notebooks` | List notebooks with note counts |
| POST | `/notebooks` | Create a notebook |
| PATCH | `/notebooks/:id` | Rename or recolour a notebook |
| DELETE | `/notebooks/:id` | Delete a notebook (its notes move to "No notebook") |

**Tags – `/tag`**

| *VERB* | *ROUTE* | *DESCRIPTION* |
|---|---|---|
| GET | `/tag/fetchTags` | List tags with usage counts |
| POST | `/tag/addTag` | Create a tag |
| DELETE | `/tag/:id` | Delete a tag and remove it from notes |

**Translations – `/translation`**

| *VERB* | *ROUTE* | *DESCRIPTION* |
|---|---|---|
| GET | `/translation/fetch` | List saved translations (query: `note`, `sourceLanguage`, `targetLanguage`, `page`, `limit`) |
| POST | `/translation/save` | Save a translation to the user's history |
| DELETE | `/translation/delete/:id` | Delete a saved translation |

**Export – `/export`**

| *VERB* | *ROUTE* | *DESCRIPTION* |
|---|---|---|
| GET | `/export?type=notes\|translations&format=csv\|xlsx` | Download notes or translations (max 10 000 rows). Optional filters – notes: `language`, `notebook`, `tag`; translations: `sourceLanguage`, `targetLanguage` |

- *See [DOCS/API_ENDPOINT_PLAN.md](DOCS/API_ENDPOINT_PLAN.md) and [DOCS/API_REQUESTS_FORMS.md](DOCS/API_REQUESTS_FORMS.md) for request and response details.*

### 5.2. THIRD PARTY API'S

The application uses the **[Langbly](https://langbly.com/)** translation API through server-side proxy routes. The front end calls the Express server, and the server forwards each request to the Langbly endpoint with the same path, adding the API key from `.env`. This keeps the API key away from the browser.

| *VERB* | *ROUTE* | *DESCRIPTION* |
|---|---|---|
| GET | `/api/language/translate/v2/languages` | List supported languages for the dropdowns (cached for 24 hours) |
| POST | `/api/language/translate/v2/detect` | Detect the language of a text |
| POST | `/api/language/translate/v2` | Translate text (without saving it) |

- Text is limited to **10 000 characters** per request (Langbly free-tier limit).
- Requests to Langbly time out after 15 seconds.
- Langbly errors are mapped to `400` (invalid text or language), `429` (quota or rate limit reached) or `502` (service unavailable or not configured). A rejected API key is returned as `502` rather than `401`, so the user is not logged out.

---

## 6. PROJECT STRUCTURE

```
NOTES-NEST/
├── client/                   # React front end
│   ├── public/
│   └── src/
│       ├── components/       # Forms, lists, panels, header, footer
│       ├── css/              # Component and page stylesheets
│       ├── pages/            # Home, Login, Register, NotePad, Notes, Translate, Users
│       ├── protectedRoutes/  # ProtectedUserRoute, ProtectedAdminRoute
│       ├── util/             # Date, language, note and user helpers
│       └── App.js            # Routes and current-user state
├── server/                   # Express back end
│   ├── config/               # MongoDB connection, JWT secret setup
│   ├── middleware/           # JWT, admin, password and rate-limit middleware
│   ├── models/               # User, Note, Notebook, Tag, Translation schemas
│   ├── routes/               # API route modules
│   ├── util/                 # Shared validation rules and helpers
│   └── app.js                # Server entry point
├── DOCS/                     # Project documentation
├── STYLES/                   # Styling documentation
├── GLOSSARY.md
└── README.md
```

## 7. REFERENCES

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
