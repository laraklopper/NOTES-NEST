# SECURITY

## TABLE OF CONTENTS

- *View [GLOSSARY.md](/GLOSSARY.md) for terminology*

---

## 1. OVERVIEW

The application implements an **in-depth** security strategy using:

- **Third-party packages**: Industry-standard libraries for authentication, hashing, and rate limiting
- **Custom middleware**: Application-specific validation and authorization logic
- **Security utilities**: Utility functions for secure configuration management
- **Protected routes**: protected front end routes for `RBAC`

#### **SECURITY GOALS**

- Protect user credentials *password hashing*. (passwords are only stored as plaintext during development)
- Authenticate requests securely (`JWT`)
- Restrict access based on roles (RBAC: admin vs user)
- Reduce common web vulnerabilities (security headers, helmet, cookies,  CORS rules)
- Keep secrets out of source control (dotenv)
- Enforce strong passwords at registration and password updates
- Limit API calls using express-rate-limit
- Support secure, time-limited password-reset links via email (hashed token + expiry)

## MIDDLEWARE

Custom middleware is provided for password hashing, RBAC, JWT authentication and rate limiting to 
limit API calls.

### 3.4. PROTECTED FRONT ROUTES
Client-side `RBAC` is enforced by two wrapper components that gate access to a route's content based on login and admin status. Each wrapper checks `currentUser` (set on login) before rendering its `children`; if the check fails, the user is redirected to `/` instead of seeing the protected page.

#### [ProtecteProtectedUserRoute.js](../client/src/protectedRoutes/ProtectedUserRoute.js)

Protects routes that require a user to be logged in, regardless of their role.  Registered users have access to all pages except the Users.js page.


```js
/*ProtectedUserRoute.js:protects routes that require a user 
to be logged in, regardless of their role.*/
// IMPORT REQUIRED MODULES AND PACKAGES
import React from 'react'
//IMPORT REACT-ROUTER-DOM COMPENTS
import {Navigate} from 'react-router-dom'

//ProtectedUserRoute Function Component
export default function ProtectedUserRoute(//Export default ProtectedUserRoute.js Function Component
    {//PROPS PASSED FROM PARENT COMPONENT(App.js)
        currentUser,
        children
    }) {
        /*If no user is logged in, redirect 
        to the Login page*/
        if (!currentUser) {
            return <Navigate to='/'/>
        }
        /*If a user is logged in, render 
        the protected content*/
  return children
}
```
#### [ProtectedAdminRoute.js](../client/src/protectedRoutes/ProtectedAdminRoute.js)

This component protects routes that should only be accessible by users who are logged in AND have administrator privileges. Users with administrator privileges have access to all pages.


```js
/*ProtectedAdminRoute.js: protects routes that should only be accessible by 
 users who are logged in and have administrator privileges.*/
 // IMPORT REQUIRED MODULES AND PACKAGES
import React from 'react'
//IMPORT REACT-ROUTER-DOM COMPENENTS
import { Navigate } from 'react-router-dom'

//ProtectedAdminRoute Function component
export default function ProtectedAdminRoute(//Export default ProtectedAdminRoute.js Function Component
    {//PROPS PASSED FROM PARENT COMPONENT(App.js)
        currentUser, children
    }) {
        /*If there is no logged-in user OR the user is 
        not an admin, redirect them to the home page*/
      if (!currentUser || currentUser.role !== 'admin') {
        return <Navigate to='/'/>
    }
    /*If the user exists and is an admin, 
    render the protected content (child component)*/
  return children
}

```