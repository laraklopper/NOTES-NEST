# CLIENT SIDE ROUTING

## TABLE OF CONTENTS

1. [Library](#1-library)
   - 1.1. [Installation](#11-installation)
   - 1.2. [Router Setup](#12-router-setup)
2. [Route Structure](#2-route-structure)
   - 2.1. [Logged-Out Routes](#21-logged-out-routes)
   - 2.2. [Logged-In Routes](#22-logged-in-routes)
   - 2.3. [Fallback Route](#23-fallback-route)
3. [Protected Routes](#3-protected-routes)
   - 3.1. [ProtectedUserRoute](#31-protecteduserroute)
4. [Application Navigation Components](#4-application-navigation-components)
   - 4.1. [BrowserRouter](#41-browserrouter)
   - 4.2. [Routes](#42-routes)
   - 4.3. [Route](#43-route)
   - 4.4. [Navigate](#44-navigate)
   - 4.5. [NavLink](#45-navlink)
   - 4.6. [Link](#46-link)
   - 4.7. [useNavigate](#47-usenavigate)
   - 4.8. [useLocation](#48-uselocation)
5. [Route State](#5-route-state)
6. [Authentication Flow](#6-authentication-flow)
7. [Key Files](#7-key-files)
8. [References](#8-references)

- *View [GLOSSARY.md](/GLOSSARY.md) for terminology*
---

## 1. LIBRARY

**react-router-dom** v7 (`^7.18.5` in [client/package.json](../client/package.json)) is used for all client-side routing.

React Router DOM helps React apps navigate between pages without reloading. It makes switching pages easy and organizes the app with clear routes.

### 1.1. INSTALLATION

```bash
cd client
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

Routes are conditionally rendered based on the `loggedIn` state in `App.js`. The same path (`/`) shows the **Login** page when logged out and the **Home** page when logged in.

```jsx
<Routes>
  {loggedIn ? (
    <>{/* PROTECTED ROUTES (logged in) */}</>
  ) : (
    <>{/* PUBLIC ROUTES (logged out) */}</>
  )}
</Routes>
```

### 2.1. Logged-Out Routes

Rendered when `loggedIn === false`:

| Path | Component | Description |
|------|-----------|-------------|
| `/` | `<Login>` | Landing page / login form |
| `/reg` | `<Register>` | New user registration |
| `*` | `<Navigate to='/' replace/>` | Any other path redirects to Login |

### 2.2. Logged-In Routes

Rendered when `loggedIn === true`. Every route is wrapped with `<ProtectedUserRoute>`:

| Path | Component | Guard | Description |
|------|-----------|-------|-------------|
| `/` | `<Home>` | `ProtectedUserRoute` | Dashboard: profile, calendar and (admins only) users list |
| `/notepad` | `<NotePad>` | `ProtectedUserRoute` | Write new notes |
| `/notes` | `<Notes>` | `ProtectedUserRoute` | Notes, notebooks, tags, archive and trash |
| `/translate` | `<Translate>` | `ProtectedUserRoute` | Text and document translation |
| `*` | `<Navigate to='/' replace/>` | — | Any other path redirects to Home |

- There is no separate admin route. The users list is shown inside `Home` and only toggled on when `currentUser.admin` is `true` (`toggleUsersList` in `Home.js`).

### 2.3. Fallback Route

Both route sets end with a catch-all `*` route that redirects to `/` instead of showing a 404 page. `replace` swaps the invalid URL out of the browser history, so the Back button does not return to it.

```jsx
{/* FALL BACK ROUTE */}
<Route path='*' element={<Navigate to='/' replace/>}/>
```
The older 404 heading is kept commented out in `App.js`:
```jsx
{/* <Route path='*' element={<h2 id='pageNotFound'>404: Page Not Found</h2>}/> */}
```

---

## 3. PROTECTED ROUTES

Two route guard components live in [client/src/protectedRoutes/](../client/src/protectedRoutes/).

### 3.1. ProtectedUserRoute

Wraps every logged-in route. If there is no `currentUser`, it redirects to `/` (the login page).

[`client/src/protectedRoutes/ProtectedUserRoute.js`](../client/src/protectedRoutes/ProtectedUserRoute.js)
```js
//ProtectedUserRoute.js
import React from 'react'
import { Navigate } from 'react-router-dom'

//ProtectedUserRoute Function Component
export default function ProtectedUserRoute(//Export default ProtectedUserRoute.js Function Component
    {//PROPS PASSED FROM PARENT COMPONENT(App.js)
        children, 
        currentUser
    }
) {
     // If no user is logged in,
  // redirect to the login(landing) page.
    if (!currentUser) {
        return <Navigate to={'/'}/>
    }
        // If a user is logged in,
  // render the protected content.
    return children
}
```

**Usage in App.js:**
```jsx
<Route path='/notes' element={
  <ProtectedUserRoute currentUser={currentUser}>
    <Notes currentUser={currentUser} loggedIn={loggedIn} logout={logout} setError={setError}/>
  </ProtectedUserRoute>
}/>
```


**Usage (if an admin route is added):**
```jsx
// App.js
// import ProtectedAdminRoute from './protectedRoutes/ProtectedAdminRoute';

<Route path='/admin' element={
  <ProtectedAdminRoute currentUser={currentUser}>
    <AdminPage currentUser={currentUser} logout={logout}/>
  </ProtectedAdminRoute>
}/>
```

---

## 4. APPLICATION NAVIGATION COMPONENTS

These components and hooks are imported from `react-router-dom` and are used throughout the app to define routes, render links, and handle navigation programmatically.

| COMPONENT / HOOK | DESCRIPTION | USED IN |
|------------------|-------------|---------|
| *BrowserRouter* | Wraps the entire app to enable routing | `index.js` |
| *Routes* | Container that holds all `<Route>` definitions | `App.js` |
| *Route* | Maps a URL path to a component | `App.js` |
| *Navigate* | Component that redirects as soon as it renders | `App.js`, `ProtectedUserRoute.js`, `ProtectedAdminRoute.js` |
| *NavLink* | Link that adds an `active` class when its route is current | `MainHeader.js` |
| *Link* | Renders an anchor tag that navigates without a page reload | `NotePanal.js` |
| *useNavigate* | Hook to navigate programmatically in response to events | `App.js`, `Login.js`, `Register.js`, `Home.js`, `Notes.js` |
| *useLocation* | Hook to read the current URL and route state | `MainHeader.js`, `Notes.js` |

### 4.1. BrowserRouter

`BrowserRouter` uses the HTML5 History API to keep the UI in sync with the URL. It is applied once at the root of the app in [client/src/index.js](../client/src/index.js) so all child components can access routing features (see [1.2](#12-router-setup)).

### 4.2. Routes

`Routes` is a wrapper that holds all `<Route>` elements. It looks through its children and renders the `<Route>` whose `path` best matches the current URL. Used in [client/src/App.js](../client/src/App.js) to wrap the entire route tree.

```jsx
// client/src/App.js
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';

<Routes>
  <Route path='/' element={<Login /* ...props */ />}/>
  <Route path='/reg' element={<Register loggedIn={loggedIn} setError={setError}/>}/>
  <Route path='*' element={<Navigate to='/' replace/>}/>
</Routes>
```

### 4.3. Route

`Route` maps a URL path to the component that should render when that path is active. The `path` prop holds the URL, and the `element` prop receives the JSX to render. All paths in this app are static (no `:params`).

```jsx
<Route path='/translate' element={
  <ProtectedUserRoute currentUser={currentUser}>
    <Translate currentUser={currentUser} logout={logout} loggedIn={loggedIn}/>
  </ProtectedUserRoute>
}/>
```

### 4.4. Navigate

`Navigate` redirects to another path the moment it renders. It is used for the fallback routes and inside the route guards.

```jsx
// App.js: unknown paths go back to '/', replacing the bad URL in history
<Route path='*' element={<Navigate to='/' replace/>}/>

// ProtectedUserRoute.js: no user, back to the login page
if (!currentUser) {
    return <Navigate to={'/'}/>
}
```

### 4.5. NavLink

`NavLink` works like `Link` but automatically applies an `active` CSS class when its route matches the current URL. All header navigation is in [client/src/components/MainHeader.js](../client/src/components/MainHeader.js), which shows a different set of links depending on `loggedIn`. The `.refLink.active` style highlights the current page (see [HTML_STYLES.md](../styles/HTML_STYLES.md#42-navigation-links)).

`NavLink to='/'` is only active on `/` itself, not on every path starting with `/`, so it does not need the `end` prop.

**Logged-in navigation**: only rendered when `currentUser` exists:
```jsx
<ul id='navbar'>
  {currentUser && (
    <>
      <li className='linkItem'>
        <NavLink to='/' className='refLink'>HOME</NavLink>
      </li>
      <li className='linkItem'>
        <NavLink to='/notepad' className='refLink'>NOTE PAD</NavLink>
      </li>
      <li className='linkItem'>
        <NavLink to='/notes' className='refLink'>NOTES</NavLink>
      </li>
      <li className='linkItem'>
        <NavLink to='/translate' className='refLink'>TRANSLATE</NavLink>
      </li>
    </>
  )}
</ul>
```

**Logged-out navigation**:
```jsx
<ul id='mainNavbar'>
  <li className='linkItem'>
    <NavLink to='/' className='refLink'>LOGIN</NavLink>
  </li>
  <li className='linkItem'>
    <NavLink to='/reg' className='refLink'>REGISTRATION</NavLink>
  </li>
</ul>
```

### 4.6. Link

`Link` renders an `<a>` tag that navigates to the given path without a full page reload. Used in [client/src/components/NotePanal.js](../client/src/components/NotePanal.js) to send the selected note to the Translate page. The `state` prop passes data along with the navigation without putting it in the URL (see [5](#5-route-state)).

```jsx
// NotePanal.js
import { Link } from 'react-router-dom';

<Link className='refLink' to='/translate' state={{ noteId: note._id }}>TRANSLATE</Link>
```

### 4.7. useNavigate

`useNavigate` returns a function used to navigate programmatically, for example after a form submission or on logout.

| File | Trigger | Destination |
|------|---------|-------------|
| `App.js` | User logs out (`logout()`) | `/` (login page) |
| `Login.js` | Successful login | `/` (Home page, now logged in) |
| `Register.js` | Successful registration | `/` (login page) |
| `Home.js` | Note picked on the calendar (`openNote()`) | `/notes` with `state: { noteId }` |
| `Notes.js` | Linked note opened | Same path with `state: null` (clears the route state) |

```js
// client/src/App.js
import { useNavigate } from 'react-router-dom';

const navigate = useNavigate();

const logout = useCallback(async () => {
  try {
    await fetch('/auth/logout', { method: 'POST' });// Server clears the JWT cookie
  } catch (error) {
    console.error('Error logging out:', error);// Still log out locally
  }
  clearSession();
  navigate('/');// The login page lives at '/' when logged out
}, [clearSession, navigate]);
```

### 4.8. useLocation

`useLocation` returns the current location object (`pathname`, `state`, ...).

**MainHeader.js**: closes the phone navigation menu whenever the page changes:
```js
const [menuOpen, setMenuOpen] = useState(false);
const location = useLocation();
// Close the menu after a link is followed
useEffect(() => {
  setMenuOpen(false);
}, [location.pathname]);
```

**Notes.js**: reads the note id passed in route state (see [5](#5-route-state)):
```js
const location = useLocation()
const linkedNoteId = location.state?.noteId
```

---

## 5. ROUTE STATE

Route state passes data to the next page without adding it to the URL. It is set with `navigate(path, { state })` or `<Link state={...}>`, and read with `useLocation().state`.

**Calendar → Notes** (open a note picked on the calendar):

1. `Home.js` sends the note id:
    ```js
    const openNote = useCallback((noteId) => {
      navigate('/notes', { state: { noteId } })
    }, [navigate])
    ```
2. `Notes.js` reads it, fetches the note (`GET /notes/:id`) and selects it so the details panal opens. The state is then cleared with `replace`, so a refresh or going Back does not reopen the note:
    ```js
    const location = useLocation()
    const navigate = useNavigate()
    const linkedNoteId = location.state?.noteId

    useEffect(() => {
      if (!linkedNoteId) return
      let ignore = false
      const openLinkedNote = async () => {
        try {
          const response = await fetch(`/notes/${linkedNoteId}`, { method: 'GET' });
          const data = await response.json().catch(() => ({}));
          if (ignore) return
          if (!response.ok) {
            throw new Error(data.message || 'Failed to fetch note');
          }
          setLinkedNote(data.note)
          setSelectedId(data.note._id)
        } catch (error) {
          if (ignore) return
          console.error('Error opening note:', error);
          setError?.('That note could not be opened. It may have been archived or deleted.')
        } finally {
          if (!ignore) navigate(location.pathname, { replace: true, state: null })
        }
      }
      openLinkedNote()
      return () => { ignore = true }
    }, [linkedNoteId, navigate, location.pathname, setError])
    ```

**Note panal → Translate**: `NotePanal.js` passes `state={{ noteId: note._id }}` to `/translate`.

> **Not read yet.** No component under `/translate` (`Translate.js`, `TranslateForm.js`, `DocTranslator.js`) calls `useLocation`, so the note id is currently ignored and the link only opens the Translate page.

---

## 6. AUTHENTICATION FLOW

1. **Login**: the user submits credentials on `/`. `POST /auth/login` sets an HTTP-only JWT cookie. `Login.js` saves `{ userId, fullName, admin }` to `localStorage` as `currentUser`, calls `setCurrentUser()` and `setLoggedIn(true)`, then `navigate('/')`.
2. **Route switch**: `loggedIn` is now `true`, so `App.js` re-renders `<Routes>` with the protected route set, and `/` now shows `Home`.
3. **Access control**: every protected route checks `currentUser` via `ProtectedUserRoute` and redirects to `/` if it is missing. Admin-only content inside Home checks `currentUser.admin`.
4. **Session restore**: on page refresh, `App.js` reads `currentUser` from `localStorage` and shows the logged-in pages straight away. It then calls `GET /user/me` to check the cookie is still valid. If it is not, `clearSession()` logs the user out locally.
5. **Logout**: `logout()` in `App.js` calls `POST /auth/logout` (the server clears the cookie), then `clearSession()` removes `currentUser` from `localStorage` and resets state, and `navigate('/')` returns to the login page.

---

## 7. KEY FILES

| File | Role |
|------|------|
| [client/src/index.js](../client/src/index.js) | Wraps `<App>` with `<BrowserRouter>` |
| [client/src/App.js](../client/src/App.js) | All route definitions, fallback routes, session restore and `logout()` |
| [client/src/protectedRoutes/ProtectedUserRoute.js](../client/src/protectedRoutes/ProtectedUserRoute.js) | Auth guard for all logged-in routes |
| [client/src/protectedRoutes/ProtectedAdminRoute.js](../client/src/protectedRoutes/ProtectedAdminRoute.js) | Admin auth guard (not currently used) |
| [client/src/components/MainHeader.js](../client/src/components/MainHeader.js) | `NavLink` navigation for logged-in and logged-out users, phone MENU button |
| [client/src/components/NotePanal.js](../client/src/components/NotePanal.js) | `Link` to `/translate` with the note id in route state |
| [client/src/pages/Login.js](../client/src/pages/Login.js) | Login form, navigates to `/` on success |
| [client/src/pages/Register.js](../client/src/pages/Register.js) | Registration form, navigates to `/` on success |
| [client/src/pages/Home.js](../client/src/pages/Home.js) | Dashboard, navigates to `/notes` with a note id from the calendar |
| [client/src/pages/Notes.js](../client/src/pages/Notes.js) | Reads the note id from route state and opens that note |
| [client/src/pages/NotePad.js](../client/src/pages/NotePad.js) | Note pad page (`/notepad`) |
| [client/src/pages/Translate.js](../client/src/pages/Translate.js) | Translate page (`/translate`) |

---

## 8. REFERENCES

- https://www.npmjs.com/package/react-router-dom
- https://reactrouter.com/home
- https://reactrouter.com/start/declarative/routing
- https://reactrouter.com/start/declarative/navigating
- https://reactrouter.com/api/hooks/useLocation
- https://www.geeksforgeeks.org/reactjs/what-is-react-router-dom/
- https://www.geeksforgeeks.org/reactjs/how-to-implement-client-side-routing-in-react/
- https://www.geeksforgeeks.org/reactjs/reactjs-usenavigate-hook/
- https://www.geeksforgeeks.org/reactjs/link-and-navlink-components-in-react-router-dom/
- https://medium.com/@mdburkee/describe-how-you-would-implement-client-side-routing-in-a-modern-front-end-framework-cb19645ae141
