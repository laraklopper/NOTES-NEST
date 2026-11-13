# SECURITY

## TABLE OF CONTENTS

- *View [GLOSSARY.md](../GLOSSARY.md) for terminology*

1. [Overview](#1-overview)
2. [Security Packages](#2-security-packages)
3. [Configuration and Secrets](#3-configuration-and-secrets)
4. [Authentication (JWT)](#4-authentication-jwt)
5. [Password Security](#5-password-security)
6. [Authorization (RBAC)](#6-authorization-rbac)
7. [Rate Limiting](#7-rate-limiting)
8. [Input Validation and Injection Protection](#8-input-validation-and-injection-protection)
9. [Data Ownership](#9-data-ownership)
10. [Cross-Site Scripting (XSS) Protection](#10-cross-site-scripting-xss-protection)
11. [HTTP Security Headers and CORS](#11-http-security-headers-and-cors)
12. [Privacy and Consent](#12-privacy-and-consent)


---

## 1. OVERVIEW

The application uses **defence in depth**: several layers of security, so that if one layer fails another still protects the user's data. The layers are:

- **Third-party packages**: Industry-standard libraries for authentication, hashing, rate limiting, HTML sanitization and security headers
- **Custom middleware**: Application-specific validation and authorization logic
- **Security utilities**: Functions for secure configuration management (e.g. generating the JWT secret)
- **Schema validation**: Mongoose schema rules that apply no matter how a request reaches the server
- **Protected routes**: Front-end routes that enforce `RBAC` in the client

#### **SECURITY GOALS**

- Protect user credentials with *password hashing* (passwords are only stored as plaintext during development)
- Authenticate requests securely with a `JWT` stored in an HTTP-only cookie
- Restrict access based on roles (RBAC: admin vs user)
- Make sure users can only see and change their own data
- Reduce common web vulnerabilities (security headers, secure cookies, HTML sanitization, query-injection checks)
- Keep secrets out of source control (`dotenv`)
- Enforce strong passwords at registration and password updates
- Limit repeated API calls using `express-rate-limit`

---

## 2. SECURITY PACKAGES

| Package | Used for |
|---|---|
| [`bcryptjs`](https://www.npmjs.com/package/bcryptjs) | Hashing and comparing passwords |
| [`jsonwebtoken`](https://www.npmjs.com/package/jsonwebtoken) | Signing and verifying JWTs |
| [`cookie-parser`](https://www.npmjs.com/package/cookie-parser) | Reading the JWT cookie into `req.cookies` |
| [`helmet`](https://www.npmjs.com/package/helmet) | Setting secure HTTP response headers |
| [`cors`](https://www.npmjs.com/package/cors) | Cross-Origin Resource Sharing rules |
| [`express-rate-limit`](https://www.npmjs.com/package/express-rate-limit) | Limiting repeated requests per IP |
| [`sanitize-html`](https://www.npmjs.com/package/sanitize-html) | Removing dangerous HTML from note content |
| [`dotenv`](https://www.npmjs.com/package/dotenv) | Loading secrets from a `.env` file |
| `crypto` (Node.js built-in) | Generating a secure random JWT secret |

---

## 3. CONFIGURATION AND SECRETS

All secrets are loaded from a `.env` file with `dotenv`. The `.env` file is listed in `.gitignore`, so it is never committed to source control.

| Variable | Purpose |
|---|---|
| `JWT_SECRET_KEY` | Secret used to sign and verify JWTs |
| `JWT_EXPIRATION` | How long a token is valid (default `12h`) |
| `JWT_ALGORITHM` | Signing algorithm (default `HS256`) |
| `DATABASE_URL` / `DATABASE_NAME` | MongoDB connection details |
| `LANGBLY_API_KEY` / `LANGBLY_BASE_URL` | Translation API credentials (kept on the server, never sent to the client) |
| `NODE_ENV` | `development` or `production`; controls password hashing and secure cookies |

### [ensureJwtSecret.js](../server/config/ensureJwtSecret.js)

Runs first in [app.js](../server/app.js), before anything else loads, so the server can never start without a JWT secret.

- If `JWT_SECRET_KEY` already exists, it is reused.
- **In production**, a missing key is a fatal error and the server stops (`process.exit(1)`), so it never runs with a weak or guessable secret.
- **In development**, a cryptographically secure 512-bit key is generated with `crypto.randomBytes(64)` and saved to `.env` with file permissions `0600` (readable only by the file owner).

---

## 4. AUTHENTICATION (JWT)

Authentication is handled in [securityMiddleware.js](../server/middleware/securityMiddleware.js).

### Signing the token — `setTokenCookie`

On login (and when admin status changes), the server signs a JWT with the payload `{ id, isAdmin }` and sends it to the browser as a cookie named `token`.

The cookie uses these settings:

| Setting | Value | Why |
|---|---|---|
| `httpOnly` | `true` | Client-side JavaScript cannot read the token, so an XSS attack cannot steal it |
| `secure` | `true` outside development | The cookie is only sent over HTTPS |
| `sameSite` | `'strict'` | The cookie is not sent on cross-site requests, which protects against CSRF |
| `expires` | Same as the token's `exp` | The cookie and token expire together |

Because the token lives only in the HTTP-only cookie, the client never stores it. `localStorage` only holds a copy of the non-sensitive user details (`currentUser`) used to draw the UI.

### Verifying the token — `checkJwtToken`

Every protected route runs `checkJwtToken` first. It:

1. Reads the token from `req.cookies.token`
2. Verifies the signature and expiry with `jwt.verify`
3. Attaches the decoded payload to `req.user`, so routes use `req.user.id` (never an ID sent by the client)
4. Responds with **401 Unauthorized** if the token is missing, invalid or expired

### Logging out

`POST /auth/logout` clears the cookie with `res.clearCookie('token', cookieOptions)`, using the same settings the cookie was created with so the browser removes it.

---

## 5. PASSWORD SECURITY

Password handling is in [passwordMiddleware.js](../server/middleware/passwordMiddleware.js).

### Password strength — `checkPassword`

Used on registration and password changes. Passwords must:

- Be at least **8 characters** long
- Contain at least **one special character** (`!@#$%^&*(),.?":{}|<>`)

The user schema also enforces a minimum length of 8 and a maximum of 1024 characters.

### Password hashing — `hashPassword`

- Passwords are hashed with **bcrypt** using **10 salt rounds** before they are saved.
- During development (`NODE_ENV` unset or `development`) hashing is skipped and passwords are stored as plaintext to make testing easier. **Always set `NODE_ENV=production` when deploying.**
- The `password` field is marked `select: false` in the schema, so it is never returned by a query unless a route asks for it explicitly (only login and password change do).

### Login

- Passwords are compared with `bcrypt.compare`.
- An unknown username and a wrong password return the **same** `401 Invalid credentials` message, so attackers cannot discover which usernames exist (user enumeration).

### Changing a password — `checkPasswordChange`

`PATCH /user/editPassword` requires:

- A valid JWT
- The **current** password, which is checked before the change is allowed
- A new password that is **different** from the current one and passes `checkPassword`

---

## 6. AUTHORIZATION (RBAC)

There are two roles: **user** and **admin**.

### 6.1. SERVER-SIDE — `checkAdmin`

[adminMiddleware.js](../server/middleware/adminMiddleware.js) protects admin-only routes (`/user/fetchUsers`, `/user/fetchUser/:id`, `/user/deleteUser/:id`). It runs after `checkJwtToken` and:

- Loads the user from the database using the ID in the token, rather than trusting the `isAdmin` claim in the token, so a revoked admin loses access immediately
- Returns **401** if the user no longer exists
- Returns **403 Forbidden** if the user is not an admin

### 6.2. BECOMING AN ADMIN

Users cannot make themselves an admin at registration: the `/auth/register` route builds the new user from named fields only, so sending `{ admin: true }` in the request body has no effect.

A user can upgrade to admin through `PATCH /auth/setAdmin` only if they:

- Are at least **21 years old** (`ADMIN_MIN_AGE`)
- Have had their account for a minimum time (`ADMIN_MIN_ACCOUNT_AGE_MS`: 1 day in development)

After the role changes, a new token is issued so the admin claim is up to date.

### 6.3. ADMIN SAFEGUARDS

- Admin accounts **cannot be deleted** through `/user/deleteUser/:id`, which also stops an admin from deleting themselves.
- When a user is deleted, all of their notes, notebooks, tags and translations are deleted with them, so no orphaned personal data is left behind.

### 6.4. PROTECTED FRONT-END ROUTES

Client-side `RBAC` is enforced by two wrapper components that gate access to a route's content based on login and admin status. Each wrapper checks `currentUser` (set on login) before rendering its `children`; if the check fails, the user is redirected to `/` instead of seeing the protected page.

> **Note:** Front-end route protection only controls what the user *sees*. The real protection is on the server (`checkJwtToken` and `checkAdmin`), because client-side code can be changed by the user.

#### [ProtectedUserRoute.js](../client/src/protectedRoutes/ProtectedUserRoute.js)

Protects routes that require a user to be logged in, regardless of their role. Registered users have access to all pages except the Users.js page.

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
//ProtectedAdminRoute.js
import React from 'react'
import { Navigate } from 'react-router-dom'

//ProtectedAdminRoute Function Component
export default function ProtectedAdminRoute(//Export default ProtectedAdminRoute.js Function Component
    {//PROPS PASSED FROM PARENT COMPONENT(App.js)
        currentUser,
        children
    }
) {
    /* If there is no logged-in user OR the user is not an admin,
  redirect to the login(landing) page.*/
  if (!currentUser || !currentUser.admin) {
    return <Navigate to='/'/>
  }
  /*If the user is loggedIn and Admin render the protected routes */
  return children
}
```

The server sends the admin status as `isAdmin`. The client saves it on `currentUser` as `admin` when the user logs in or their role changes.

---

## 7. RATE LIMITING

[rateLimitMiddleware.js](../server/middleware/rateLimitMiddleware.js) uses `express-rate-limit` to slow down brute-force attacks, spam and abuse of the paid translation API. When a limit is reached the server responds with **429 Too Many Requests**, and standard `RateLimit` headers tell the client how long to wait.

| Limiter | Applied to | Limit (per IP) |
|---|---|---|
| `loginLimiter` | `POST /auth/login` | 10 requests / 15 minutes |
| `registerLimiter` | `POST /auth/register` | 20 requests / 1 hour |
| `translateLimiter` | `POST /api/language/translate/v2` | 100 requests / 15 minutes |
| `detectLimiter` | `POST /api/language/translate/v2/detect` | 60 requests / 15 minutes |
| `exportLimiter` | `GET /export` | 60 requests / 15 minutes |

The file also defines `authLimiter`, `generalRateLimiter` and `passwordUpdateRateLimiter`, which are available but not currently applied to any route (see [Known Limitations](#13-known-limitations)).

---

## 8. INPUT VALIDATION AND INJECTION PROTECTION

### NoSQL injection

MongoDB queries can be manipulated if a client sends an object such as `{ "$gt": "" }` instead of a string. The routes prevent this by:

- Checking that values like `username`, `password`, `currentPassword` and `newPassword` are **strings** before they are used in a query
- Checking every `:id` route parameter with `mongoose.Types.ObjectId.isValid()` and returning **400** if it is not a valid ID
- Dropping any non-string values when updating a profile

### Mass assignment

Routes never pass `req.body` straight into the database:

- Registration builds the user from a fixed list of named fields.
- Profile updates only allow the fields listed in `EDITABLE_PROFILE_FIELDS` ([userUtil.js](../server/util/userUtil.js)). `password`, `dateOfBirth`, `admin` and `adminDataConsent` cannot be changed this way.

### Schema validation

The Mongoose schemas validate data even if a request bypasses the front-end forms:

- Email and South African phone number formats are checked with regular expressions
- Users must be at least **13 years old**
- Language codes must be in the list of supported languages
- Maximum lengths are set on usernames, names, note titles, tag names, notebook names and translation text
- Usernames and contact numbers must be unique

---

## 9. DATA OWNERSHIP

Every note, notebook, tag and translation stores the ID of the user who owns it. Every query includes the logged-in user's ID from the token, for example:

```js
Note.findOneAndUpdate({ _id: id, user: userId, deletedAt: null }, ...)
```

This means a user cannot read, edit or delete another user's data, even if they guess its ID. A request for someone else's item behaves as if the item does not exist.

When a note is linked to a notebook or a translation is linked to a note, the server also checks that the user owns that notebook or note.

---

## 10. CROSS-SITE SCRIPTING (XSS) PROTECTION

Notes are written in a textarea, converted to HTML (`<p>` / `<br>`) and stored as HTML, which is shown with `dangerouslySetInnerHTML` in [NotePanal.js](../client/src/components/NotePanal.js). To make this safe, [noteSchema.js](../server/models/noteSchema.js) cleans the HTML with `sanitize-html` **every time a note is saved or updated**, before it reaches the database (blocking *stored* XSS):

- Only an allow-list of formatting tags is kept (`p`, `strong`, `em`, `ul`, `li`, `a`, `code`, etc.). Tags such as `<script>`, `<iframe>` and `<style>` are removed.
- Only link attributes (`href`, `target`, `rel`) are allowed. Event handlers like `onclick` are removed.
- Links may only use `http`, `https` or `mailto`, which blocks `javascript:` links.

A plain-text copy of each note is also created with all tags removed, and this is the version sent to the translation API.

The HTTP-only JWT cookie adds a second layer: even if a script did run, it could not read the token.

---

## 11. HTTP SECURITY HEADERS AND CORS

### Helmet

`helmet()` is applied globally in [app.js](../server/app.js). It sets headers that protect against common attacks, including:

- `Content-Security-Policy` — limits where scripts and other resources can load from
- `Strict-Transport-Security` — tells browsers to use HTTPS only
- `X-Content-Type-Options: nosniff` — stops browsers guessing file types
- `X-Frame-Options` — prevents clickjacking by blocking the site from being shown in a frame
- Removes `X-Powered-By`, so the server does not advertise that it runs Express

### CORS

`cors()` is applied globally. In development the React client uses a proxy, so requests come from the same origin. Before deploying, CORS should be restricted to the client's domain (see [Known Limitations](#13-known-limitations)).

---

## 12. PRIVACY AND CONSENT

- Users must consent to admin users seeing their details (`adminDataConsent`) before an account can be created. This is checked by the register route **and** by the schema, so it cannot be skipped by sending a request outside the form.
- Admin routes only return the fields the admin page needs; passwords are never sent to the client.
- Server logs record user IDs and usernames for auditing, but never passwords or tokens.

---
<!-- 
## 13. KNOWN LIMITATIONS

These are areas to address before the application is deployed to production:

- **Plaintext passwords in development**: make sure `NODE_ENV=production` is set in production so passwords are hashed.
- **Open CORS**: `cors()` currently allows any origin. Restrict it to the client's domain, for example `cors({ origin: 'https://your-domain', credentials: true })`.
- **Password change is not rate limited**: `passwordUpdateRateLimiter` exists but is not applied to `PATCH /user/editPassword`.
- **No password reset**: there is no "forgot password" flow yet. A helper for hashing reset tokens (`hashResetToken` in [userUtil.js](../server/util/userUtil.js)) has been started but is not used.
- **No token revocation**: logging out deletes the cookie, but a copied token stays valid until it expires (default 12 hours).
- **JWT fallback secret**: [securityMiddleware.js](../server/middleware/securityMiddleware.js) falls back to `'secretKey'` if `JWT_SECRET_KEY` is missing. `ensureJwtSecret` normally prevents this, but the fallback should be removed.
- **Admin account age**: `ADMIN_MIN_ACCOUNT_AGE_MS` is set to 1 day for development and should be raised (e.g. 3 months) for production. -->
## 13. REFERENCES 

- 