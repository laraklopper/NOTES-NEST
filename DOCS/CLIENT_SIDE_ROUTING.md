# CLIENT SIDE ROUTING

## TABLE OF CONTENTS

1. [Library](#1-library)
   - 1.1. [Installation](#11-installation)
   - 1.2. [Router Setup](#12-router-setup)
2. [Route Structure](#2-route-structure)
   - 2.1. [Logged-Out Routes](#21-logged-out-routes)
   - 2.2. [Logged-In Routes](#22-logged-in-routes)
   - 2.3. [Always-Accessible Routes](#23-always-accessible-routes)
3. [Protected Routes](#3-protected-routes)
   - 3.1. [ProtectedUserRoute](#31-protecteduserroute)
   - 3.2. [ProtectedAdminRoute](#32-protectedadminroute)
4. [Application Navigation Components](#4-application-navigation-components)
   - 4.1. [BrowserRouter](#41-browserrouter)
   - 4.2. [Routes](#42-routes)
   - 4.3. [Route](#43-route)
   - 4.4. [Link](#44-link)
   - 4.5. [NavLink](#45-navlink)
   - 4.6. [useParams](#46-useparams)
   - 4.7. [useNavigate](#47-usenavigate)
5. [Authentication Flow](#5-authentication-flow)
6. [Key Files](#6-key-files)
7. [References](#7-references)

- *View [GLOSSARY.md](/GLOSSARY.md) for terminology*
---

## 1. LIBRARY

**react-router-dom** v7.16.0 is used for all client-side routing.

React Router DOM helps React apps navigate between pages without reloading. It makes switching pages easy and organizes the app with clear routes.

### 1.1. INSTALLATION

```bash
npm install react-router-dom
```

### 1.2. ROUTER SETUP

The app is wrapped with `<BrowserRouter>` in [client/src/index.js](../client/src/index.js), which enables HTML5 history-based routing throughout the component tree.

```js
// client/src/index.js
import { BrowserRouter } from 'react-router-dom'

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)
```

All route definitions live in [client/src/App.js](../client/src/App.js).

---

## 2. ROUTE STRUCTURE

Routes are conditionally rendered based on the `loggedIn` state stored in `App.js`. Two additional routes are always accessible regardless of login state.

### 2.1. Logged-Out Routes

Rendered when `loggedIn === false`:

| Path | Component | Description |
|------|-----------|-------------|
| `/` | `<Login>` | Landing page / login form |
| `/reg` | `<Registration>` | New user registration |

### 2.2. Logged-In Routes

Rendered when `loggedIn === true`. All routes are wrapped with either `<ProtectedUserRoute>` or `<ProtectedAdminRoute>`:

| Path | Component | Guard | Description |
|------|-----------|-------|-------------|
| `/` | `<Home>` | `ProtectedUserRoute` | Main dashboard |
| `/portfolio` | `<Portfolio>` | `ProtectedUserRoute` | Portfolio management |
| `/watchList` | `<WatchList>` | `ProtectedUserRoute` | Stock watch list |
| `/accounts` | `<Accounts>` | `ProtectedUserRoute` | Account management |
| `/transactions` | `<Transactions>` | `ProtectedUserRoute` | Transaction history |
| `/budget` | `<Budget>` | `ProtectedUserRoute` | Budget tracking |
| `/users` | `<Users>` | `ProtectedAdminRoute` | Admin user management |

### 2.3. Always-Accessible Routes

These routes are rendered outside the `loggedIn` conditional and are accessible regardless of authentication state:

| Path | Component | Description |
|------|-----------|-------------|
| `/forgotPassword` | `<ForgotPassword>` | Request a password reset email |
| `/resetPassword/:token` | `<ResetPassword>` | Set a new password via reset token |
| `*` | 404 Not Found | Catch-all for invalid paths |

---

## 3. PROTECTED ROUTES

Two route guard components live in [client/src/protectedRoutes/](../client/src/protectedRoutes/).

### 3.1. ProtectedUserRoute

The component Wraps every standard logged-in route. The route redirects unauthenticated users to `/` (the login page).
[`client/src/protectedRoutes/ProtectedUserRoute.js`](/client/src/protectedRoutes/ProtectedUserRoute.js)
```js
/*ProtectedUserRoute.js: This component protects routes that require a user
to be logged in, regardless of their role.*/
import React from 'react'// Import the React module to use React functionalities
//IMPORT REACT-ROUTER-DOM COMPENTS
import {Navigate} from 'react-router-dom'

//ProtectedUserRoute Function Component
export default function ProtectedUserRoute(//Export default ProtectedUserRoute.js Function Component
  {//PROPS PASSED FROM PARENT COMPONENT(App.js)
    currentUser, 
    children
  }) {
   // If no user is logged in,
    // redirect to the home page.
   if (!currentUser) {
        return <Navigate to='/' />
    }
    // If a user is logged in,
    // render the protected content.
  return children
}

```

**Usage in App.js:**
```jsx
<Route path='/portfolio' element={
  <ProtectedUserRoute currentUser={currentUser}>
    <Portfolio />
  </ProtectedUserRoute>
} />
```

### 3.2. ProtectedAdminRoute

Checks that the current user exists **and** has `admin: true`. Redirects to `/` if either condition fails. Used for the `/users` route.


[`client/src/protectedRoutes/ProtectedAdminRoute.js`](/client/src/protectedRoutes/ProtectedAdminRoute.js)

```js
/*ProtectedAdminRoute.js: This component protects routes that should only be accessible by users who are logged in AND have administrator privileges.*/
// IMPORT REQUIRED MODULES AND PACKAGES
import React from 'react'// Import the React module to use React functionalities
//IMPORT REACT-ROUTER-DOM COMPENTS
import {Navigate} from 'react-router-dom'

//ProtectedAdminRoute
export default function ProtectedAdminRoute(//Export default ProtectedUserRoute.js Function Component
  {//PROPS PASSED FROM PARENT COMPONENT(App.js)
    currentUser, children}) {
  // If there is no logged-in user OR the user is not an admin,
    // redirect them to the home page.
    if(!currentUser || !currentUser.admin){
        return <Navigate to='/'/>

    }

    // If the user exists and is an admin,
    // render the protected content (child component).
  return children
}
```

**Usage in App.js:**
```jsx
<Route path='/users' element={
  <ProtectedAdminRoute currentUser={currentUser}>
    <Users currentUser={currentUser} logout={logout} />
  </ProtectedAdminRoute>
} />
```

---

## 4. APPLICATION NAVIGATION COMPONENTS

These components are imported from `react-router-dom` and are used throughout the app to define routes, render links, and handle navigation programmatically.

| COMPONENT | DESCRIPTIONS|
|-----------|-------------|
| *BrowserRouter* |wraps the entire app to enable routing |
| *Routes* | container that holds all `<Route>` definitions |
| *Route* | maps a URL path to a component |
| *Link* | renders a navigable anchor tag without a page reload |
| *NavLink* | Same purpose as the `Link` component but adds an `active` class when its route is current |
| *useParams* | Hook to read dynamic URL parameters from the current route |
| *useNavigate* | Hook to navigate programmatically in response to events |

### 4.1. BrowserRouter

`BrowserRouter` uses the HTML5 History API to keep the UI in sync with the URL. It is applied once at the root of the app in [client/src/index.js](../client/src/index.js) so all child components can access routing features.

```js
// client/src/index.js
import { BrowserRouter } from 'react-router-dom'

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)
```

### 4.2. Routes

`Routes` is a wrapper that holds all `<Route>` elements. It looks through its children and renders the first `<Route>` whose `path` matches the current URL. Used in [client/src/App.js](../client/src/App.js) to wrap the entire route tree.

```jsx
// client/src/App.js
import { Route, Routes } from 'react-router-dom'

<Routes>
  <Route path='/' element={<Login />} />
  <Route path='/reg' element={<Registration />} />
  {/* ...more routes */}
  <Route path='*' element={<h2 id='pageNotFound'>404: Page Not Found</h2>} />
</Routes>
```

### 4.3. Route

`Route` maps a URL path to the component that should render when that path is active. The `path` prop accepts static segments (`/budget`) and dynamic segments with a colon prefix (`/resetPassword/:token`). The `element` prop receives the JSX to render.

```jsx
// Static path
<Route path='/budget' element={
  <ProtectedUserRoute currentUser={currentUser}>
    <Budget currentUser={currentUser} logout={logout} />
  </ProtectedUserRoute>
} />

// Dynamic path — :token is a URL parameter read with useParams()
<Route path='/resetPassword/:token' element={<ResetPassword />} />
```

### 4.4. Link

`Link` renders an `<a>` tag that navigates to the given path without a full page reload. Used in [client/src/pages/ForgotPassword.js](../client/src/pages/ForgotPassword.js) and [client/src/pages/ResetPassword.js](../client/src/pages/ResetPassword.js) for simple back-to-login anchors.

```jsx
import { Link } from 'react-router-dom'

// ForgotPassword.js / ResetPassword.js
<Link to='/'>BACK TO LOGIN</Link>
```

### 4.5. NavLink

`NavLink` works like `Link` but automatically applies an `active` CSS class to the element when its route matches the current URL. Used in [client/src/components/NavigationBar.js](../client/src/components/NavigationBar.js) and [client/src/components/MainHeader.js](../client/src/components/MainHeader.js).

The `end` prop on the dashboard and login links prevents them from matching every route that starts with `/`.

**Logged-in navigation** — `NavigationBar.js` renders `null` if `currentUser` is absent, and conditionally shows the `/users` link for admins:

```jsx
<NavLink className='refLink' to='/' end>DASHBOARD</NavLink>
<NavLink className='refLink' to='/portfolio'>PORTFOLIO</NavLink>
<NavLink className='refLink' to='/watchList'>WATCHLIST</NavLink>
<NavLink className='refLink' to='/accounts'>ACCOUNTS</NavLink>
<NavLink className='refLink' to='/transactions'>TRANSACTIONS</NavLink>
<NavLink className='refLink' to='/budget'>BUDGET</NavLink>
{currentUser.admin && (
  <NavLink to='/users' className='refLink'>USERS</NavLink>
)}
```

**Logged-out navigation** — `MainHeader.js`:

```jsx
<NavLink to='/' className='refLink' end>LOGIN</NavLink>
<NavLink to='/reg' className='refLink'>REGISTRATION</NavLink>
```

### 4.6. useParams

`useParams` is a hook that returns an object of key/value pairs from dynamic segments in the current URL. Used in [client/src/pages/ResetPassword.js](../client/src/pages/ResetPassword.js) to extract the `:token` parameter from the `/resetPassword/:token` route.

```js
// client/src/pages/ResetPassword.js
import { useParams } from 'react-router-dom'

export default function ResetPassword() {
  const { token } = useParams() // reads :token from /resetPassword/:token
  // token is then sent to the backend to validate the reset request
}
```

### 4.7. useNavigate

`useNavigate` returns a function used to navigate programmatically — for example, after a form submission or on logout. Used in [client/src/App.js](../client/src/App.js) and [client/src/pages/Registration.js](../client/src/pages/Registration.js).

| File | Trigger | Destination |
|------|---------|-------------|
| `App.js` | User logs out | `/` (login page) |
| `Registration.js` | Successful registration | `/` (login page) |

```js
// client/src/App.js
import { useNavigate } from 'react-router-dom'

const navigate = useNavigate()

function logout() {
  localStorage.removeItem('token')
  localStorage.removeItem('username')
  localStorage.removeItem('loggedIn')
  setLoggedIn(false)
  navigate('/')
}
```

---

## 5. AUTHENTICATION FLOW

1. **Login** — User submits credentials on `/`. On success, `setLoggedIn(true)` is called in `App.js` and the token and username are stored in `localStorage`.
2. **Route switch** — The conditional route tree re-renders, replacing the logged-out routes with the full set of protected routes.
3. **Access control** — Every protected route checks `currentUser` via `ProtectedUserRoute`. The `/users` admin route also requires `currentUser.admin === true` via `ProtectedAdminRoute`. If either condition fails, the user is redirected to `/`.
4. **Logout** — The `logout()` callback in `App.js` clears `localStorage`, resets state, and calls `navigate('/')`, dropping the user back to the login page as `loggedIn` resets to `false`.
5. **Password reset** — `/forgotPassword` accepts an email and sends a reset link. `/resetPassword/:token` validates the token from the URL and allows the user to set a new password. Both pages are always accessible and have no auth requirement.

---

## 6. KEY FILES

| File | Role |
|------|------|
| [client/src/index.js](../client/src/index.js) | Wraps `<App>` with `<BrowserRouter>` |
| [client/src/App.js](../client/src/App.js) | All route definitions and auth-state logic |
| [client/src/protectedRoutes/ProtectedUserRoute.js](../client/src/protectedRoutes/ProtectedUserRoute.js) | Auth guard for all standard logged-in routes |
| [client/src/protectedRoutes/ProtectedAdminRoute.js](../client/src/protectedRoutes/ProtectedAdminRoute.js) | Auth guard for admin-only routes (`/users`) |
| [client/src/components/NavigationBar.js](../client/src/components/NavigationBar.js) | `NavLink` navigation for logged-in users (conditionally shows admin link) |
| [client/src/components/MainHeader.js](../client/src/components/MainHeader.js) | `NavLink` navigation for logged-out users |
| [client/src/components/Header.js](../client/src/components/Header.js) | Static page header (heading display only — no nav links) |
| [client/src/pages/Registration.js](../client/src/pages/Registration.js) | Registration form — navigates to `/` on success |
| [client/src/pages/ForgotPassword.js](../client/src/pages/ForgotPassword.js) | Public page — requests a password reset email |
| [client/src/pages/ResetPassword.js](../client/src/pages/ResetPassword.js) | Public page — sets a new password via reset token |
| [client/src/pages/Users.js](../client/src/pages/Users.js) | Admin-only user management page |

---

## 7. REFERENCES

- https://www.npmjs.com/package/react-router-dom
- https://github.com/remix-run/react-router-examples/blob/main/basic/src/main.tsx
- https://reactrouter.com/en/main
- https://www.geeksforgeeks.org/reactjs/what-is-react-router-dom/
- https://www.geeksforgeeks.org/reactjs/how-to-implement-client-side-routing-in-react/
- https://www.geeksforgeeks.org/reactjs/reactjs-usenavigate-hook/
- https://www.geeksforgeeks.org/reactjs/reactjs-useparams-hook/
- https://www.geeksforgeeks.org/reactjs/link-and-navlink-components-in-react-router-dom/
- https://medium.com/@mdburkee/describe-how-you-would-implement-client-side-routing-in-a-modern-front-end-framework-cb19645ae141