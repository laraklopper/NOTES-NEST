# PACKAGES

## TABLE OF CONTENTS



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