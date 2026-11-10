# PACKAGES

## TABLE OF CONTENTS
1. [NODE PACKAGE MANAGER](#1-node-package-manager)
    - [1.1. NPM COMMANDS](#11-npm-commands)
    - [1.2. package.json](#12-packagejson)
2. [APPLICATION PACKAGES](#2-application-packages)
    - [2.1 SERVER-SIDE(BACK-END)](#21-server-sideback-end)
    - [2.2 CLIENT-SIDE(FRONT-END)](#22-client-sidefront-end)
3. [REFERENCES](#3-references)


- *View [GLOSSARY.md](../GLOSSARY.md) for terminology*

## 1. NODE PACKAGE MANAGER

NPM (Node Package Manager) is the default package manager for Node.js. It is used to install, manage, and share JavaScript packages. Each layer of this application (client and server) has its own `package.json` file that lists its dependencies, and each must be installed separately by running `npm install` inside that folder.

The NPM version used in the application:

### 1.1. NPM COMMANDS


| **COMMAND** | **PURPOSE** |
|---|---|
| `npm init` | Initialises a new Node.js project and creates a package.json file interactively, which stores metadata and dependencies for the project. |
| `npm install` | Installs all the dependencies listed in the package.json file for your project. This command reads the package.json and installs the necessary packages in a folder called node_modules. |
| `npm install <package_name>` | Installs a specific package as a project dependency. For example, `npm install express` installs the Express framework. |
| `npm install <package_name> --save-dev` | Installs a package as a development dependency. Development dependencies are used during the development process but are not required in the production environment. The `--save-dev` flag saves the package in the devDependencies section of the package.json file. |
| `npm uninstall <package_name>` | Uninstalls a package from the project. |
| `npm update` | Updates all the packages in your project to their latest versions, respecting the version range specified in package.json. |
| `npm update <package_name>` | Updates a specific package to its latest version. |
| `npm outdated` | Checks for outdated packages in your project. |
| `npm run <script_name>` | Executes a script defined in the scripts section of the package.json file. Common scripts include start, test, and build. |
| `npm publish` | Publishes your package to the npm registry, making it available for others to install and use. |
| `npm search <package_name>` | Searches the npm registry for packages matching the given name. |
| `npm info <package_name>` | Displays detailed information about a package. |
| `npm test` | Tests a package. |
| `npm stop` | Stops a package. |
| `node -v` | Check if Node.js & npm are installed correctly (e.g. v20.11.0). |
| `npm -v` | Check the version of npm. |

The NPM version used in the application: `11.10.1`

### 1.2. package.json

`package.json` is a JSON file that sits at the root of each project layer (`client/package.json` and `server/package.json`). It describes the project to `npm` and records every dependency the project needs so that anyone cloning the repo can run `npm install` and get an identical set of packages, rather than installing them one by one from memory.

**KEY FIELDS**
| _FIELD_ | _PURPOSE_ |
|---------|-----------|
| `name` / `version` | Identifies the package and its current release |
| `private` | Prevents the package from being accidentally published to the npm registry (set on `client`) |
| `main` | The file treated as the package's entry point (`index.js` on the server) |
| `type` | Declares the module system used by the server (`commonjs`, i.e. `require`/`module.exports`) |
| `proxy` | Forwards unmatched client requests to the API during development (`http://localhost:3001`), avoiding CORS issues |
| `scripts` | Named shortcuts for common commands, e.g. `npm start`, `npm test`, `npm run build` |
| `dependencies` | Packages required for the application to run in production |
| `devDependencies` | Packages only needed during development (e.g. testing/build tooling), not shipped to production. Neither layer declares this field — the server keeps `nodemon` and the client keeps its testing libraries under `dependencies` |
| `eslintConfig` | Linting rules used by the client (extends Create React App's defaults) |
| `browserslist` | Target browsers used by build tools to determine JS/CSS compatibility output |

Each dependency is listed as `"<package-name>": "<version-range>"`. The `^` prefix (e.g. `^19.2.7`) means npm may install any compatible minor/patch update, while the exact installed versions (and those of all transitive/nested dependencies) are locked in the accompanying `package-lock.json` file so installs stay reproducible across machines. The version numbers listed below are the minimums those ranges are written against.

**SCRIPTS**
| _LAYER_ | _COMMAND_ | _RUNS_ |
|---|---|---|
| server | `npm start` | `nodemon app.js` — starts the API on port 3001 and restarts it on file changes |
| client | `npm start` | `react-scripts start` — starts the development server on port 3000 |
| client | `npm run build` | `react-scripts build` — produces the optimised production bundle |
| client | `npm test` | `react-scripts test` — runs the test suite in watch mode |

## 2. APPLICATION PACKAGES
### 2.1 SERVER-SIDE(BACK-END)

| _PACKAGE_ | _CLI / TERMINAL_ | _PURPOSE_ | _VERSION_ |
|-----------|-----------------|-----------|-----------|

### 2.2 CLIENT-SIDE(FRONT-END)

| _PACKAGE_ | _CLI / TERMINAL_ | _PURPOSE_ | _VERSION_ |
|-----------|-----------------|-----------|-----------|
| @testing-library/dom | `npm install @testing-library/dom` | DOM querying utilities for testing | 10.4.1 |
| @testing-library/jest-dom | `npm install @testing-library/jest-dom` | Custom Jest matchers for DOM assertions, registered in `setupTests.js` | |
| @testing-library/react | `npm install @testing-library/react` | React component testing utilities | 16.3.2 |
| @testing-library/user-event | `npm install @testing-library/user-event` | Simulates real user interactions in tests | 13.5.0 |
|react | `npm create-react-app@latest`| Core React library for building UIs ||
|react-bootstrap|`npm install react-bootstrap bootstrap` | CSS framework for responsive UI components |  |
| react-router-dom | `npm install react-router-dom@latest` | DOM bindings for React Router (`BrowserRouter`, `Link`, `NavLink`, `useNavigate`) | |
| lucide-react | `npm install lucide-react` | SVG icon library for React | |

## 3. REFERENCES

- https://nodejs.org/learn/getting-started/an-introduction-to-the-npm-package-manager
- https://www.geeksforgeeks.org/node-js/important-npm-commands/
- https://expressjs.com/
- https://expressjs.com/en/resources/middleware/
- https://expressjs.com/en/resources/middleware/cors/#installation
- https://mongoosejs.com/docs/index.html
- https://www.npmjs.com/package/dotenv
- https://www.npmjs.com/package/bcrypt
- https://expressjs.com/en/resources/middleware/cors/#installation
- https://www.npmjs.com/package/cookie-parser
- https://www.npmjs.com/package/helmet
- https://www.npmjs.com/package/express-rate-limit
- https://www.npmjs.com/package/jsonwebtoken
- https://www.npmjs.com/package/nodemon
- https://csv.js.org/stringify/
- https://www.npmjs.com/package/xlsx
- https://developer.mozilla.org/en-US/docs/Web/API/Window/fetch
- https://react.dev/learn/creating-a-react-app
- https://react-bootstrap.netlify.app/docs/getting-started/introduction
- https://getbootstrap.com/docs/5.3/getting-started/introduction/
- https://lucide.dev/guide/packages/lucide-react
- https://www.npmjs.com/package/react-router-dom
- https://testing-library.com/docs/react-testing-library/intro/
- https://www.npmjs.com/package/web-vitals