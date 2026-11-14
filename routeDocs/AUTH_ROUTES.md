# AUTH ROUTES - [`authRoutes.js`](../server/routes/authRoutes.js) BREAKDOWN

[`authRoutes.js`](../server/routes/authRoutes.js) is the Express router that handles **accounts and sessions**: logging in, registering, logging out, and switching admin status on or off. Sessions use a **JWT stored in an HTTP-only cookie**. The token is never sent in a response body, so client-side JavaScript can never read it.

Reading and editing a profile, changing a password and the admin Users page live in [`userRoutes.js`](../server/routes/userRoutes.js) (see [USER_ROUTES.md](USER_ROUTES.md)).

```
React (Login / Register / Profile)  ──►  /auth/...  ──►  MongoDB (User model)
            ▲                          (this router)
            └──── user details (JSON)  +  Set-Cookie: token=<JWT>; HttpOnly
```

---

## TABLE OF CONTENTS
1. [ROUTE SUMMARY](#1-route-summary)
     - [1.1. POST `/login`](#11-post-login)
     - [1.2. POST `/register`](#12-post-register)
     - [1.3. POST `/logout`](#13-post-logout)
     - [1.4. PATCH `/setAdmin`](#14-patch-setadmin)
     - [1.5. PATCH `/clearAdmin`](#15-patch-clearadmin)
2. [IMPORTS AND SETUP](#2-imports-and-setup)
3. [SCHEMAS AND UTILITY FUNCTIONS](#3-schemas-and-utility-functions)
     - [3.1. SCHEMAS](#31-schemas)
          - [3.1.1. USER SCHEMA](#311-user-schema-userschemajs)
     - [3.2. UTILITY FUNCTIONS](#32-utility-functions)
          - [3.2.1. ADMIN RULES](#321-admin-rules-schemautiljs)
          - [3.2.2. `sessionUser()` HELPER](#322-sessionuser-helper)
          - [3.2.3. `DUMMY_HASH`](#323-dummy_hash)
4. [SECURITY](#4-security)
     - [4.1. PACKAGES](#41-packages)
     - [4.2. MIDDLEWARE](#42-middleware)
     - [4.3. SECURITY MEASURES IN THIS FILE](#43-security-measures-in-this-file)
5. [STATUS CODE REFERENCES](#5-status-code-references)
6. [KNOWN GAPS AND HOUSE KEEPING](#6-known-gaps-and-house-keeping)
     - [6.1. GAPS](#61-gaps)
     - [6.2. HOUSE KEEPING](#62-house-keeping)
7. [REFERENCES](#7-references)

- *View [GLOSSARY.md](../GLOSSARY.md) for terminology*

---

<!-- SECTION 1 -->
## 1. ROUTE SUMMARY

The router is mounted at **`/auth`** by [`app.js`](../server/app.js) (e.g. `POST /auth/login`). The paths below are relative to that mount point.

| Method | Path | Middleware | Purpose |
|---|---|---|---|
| `POST` | `/login` | `loginLimiter` | Check credentials and set the JWT cookie |
| `POST` | `/register` | `registerLimiter`, `checkPassword`, `hashPassword` | Create a new user |
| `POST` | `/logout` | none | Clear the JWT cookie |
| `PATCH` | `/setAdmin` | `checkJwtToken` | Upgrade the logged-in user to admin (21+, minimum account age) |
| `PATCH` | `/clearAdmin` | `checkJwtToken` | Remove admin status from the logged-in user |

`/login` and `/register` **don't** require a token, because the user doesn't have one yet. `/logout` doesn't either, so an expired cookie can still be cleared.

**Client side usage:**

| Method | Full Path | Frontend/Client side files |
|---|---|---|
| `POST` | `/auth/login` | [Login.js](../client/src/pages/Login.js) |
| `POST` | `/auth/register` | [Register.js](../client/src/pages/Register.js) |
| `POST` | `/auth/logout` | [App.js](../client/src/App.js) |
| `PATCH` | `/auth/setAdmin` | [AdminRegisForm.js](../client/src/components/AdminRegisForm.js) |
| `PATCH` | `/auth/clearAdmin` | [Profile.js](../client/src/components/Profile.js) |

---

### 1.1. POST `/login`

**Purpose:** Check the username and password, then start a session by setting the JWT cookie.

**Middleware:** `loginLimiter` (10 attempts per 15 minutes per IP), which slows down password guessing.

#### Request body

```json
{ "username": "username", "password": "MyP@ssw0rd" }
```

#### Flow

```
Missing username/password? ───────────────────────────► 400
Not strings? (e.g. { "$gt": "" }) ─────────────────────► 400
     ▼
User.findOne({ username: trimmed + lowercase }).select('+password')
     ▼
No user? ── dummy bcrypt.compare() ────────────────────► 401 "Invalid credentials"
     ▼
Compare the password (bcrypt, or plaintext in development)
     ▼
Wrong password? ───────────────────────────────────────► 401 "Invalid credentials"
     ▼
setTokenCookie(res, user) → 200 sessionUser(user)
```

#### Step 1: Presence check

```js
if (!username || !password) → 400 "username and password are required"
```

#### Step 2: Type check (blocks NoSQL injection)

```js
if (typeof username !== 'string' || typeof password !== 'string') → 400 "username and password are required"
```

Without this check, a request like:

```json
{ "username": { "$gt": "" }, "password": "x" }
```

would give `findOne` a **query operator** that matches the first user in the collection. Making sure both values are strings shuts that down.

#### Step 3: Find the user

```js
const user = await User.findOne({ username: username.trim().toLowerCase() })
    .select('+password')
    .exec();
```

| Piece | Why |
|---|---|
| `.trim().toLowerCase()` | Usernames are stored in lowercase by the schema's pre-validate hook, so `" userA "` finds the record stored as `userA`. |
| `.select('+password')` | The schema hides `password` by default (`select: false`). The `+` adds it back for this query only. |
| `.exec()` | Returns a real Promise and gives better stack traces. |

#### Step 4: Same error for a wrong username or a wrong password

```js
return res.status(401).json({ message: 'Invalid credentials' });
```

Both cases send an **identical** status and message. If they were different ("User not found" vs. "Wrong password"), an attacker could use the login form to find out which usernames exist. This is called **user enumeration**.

The two cases also take the **same time**: when the user isn't found, the route still runs `bcrypt.compare()` against `DUMMY_HASH` before responding (see [3.2.3. `DUMMY_HASH`](#323-dummy_hash)).

#### Step 5: Compare the password

```js
const isHashed = /^\$2[aby]\$/.test(user.password);
const isPasswordValid = isDevelopment && !isHashed
    ? password === user.password
    : await bcrypt.compare(password, user.password);
```

| Part | Meaning |
|---|---|
| `/^\$2[aby]\$/` | Matches the bcrypt hash prefix (`$2a$`, `$2b$`, `$2y$`). If it matches, the stored value is a hash. |
| Development + not hashed | Compare plaintext directly (`===`) |
| Otherwise | `bcrypt.compare()` hashes the submitted password with the stored salt and compares the result |

So accounts created **before** plaintext mode (already hashed) can still log in during development.

#### Step 6: Log, set the cookie, respond

```js
setTokenCookie(res, user);
return res.status(200).json(sessionUser(user));
```

The success log includes `userId` and `username` only, **never the password**.

#### Response (200)

```json
{
  "userId": "6731f0c2a1b2c3d4e5f60718",
  "fullName": { "firstName": "user", "lastName": "A" },
  "isAdmin": false
}
```

The response also has a header like:

```
Set-Cookie: token=<JWT>; Path=/; Expires=...; HttpOnly; Secure; SameSite=Strict
```

(`Secure` is left out in development.)

---

### 1.2. POST `/register`

**Purpose:** Create a new user account. It does **not** log the user in. The client is told to log in afterwards.

#### Middleware chain

```
registerLimiter → checkPassword → hashPassword → route handler
      │                │               │
      └─ 429           └─ 400 weak     └─ req.body.password becomes a bcrypt hash
                          password        (plaintext in development)
```

So when the handler runs, `req.body.password` is **already hashed**.

#### Request body

```json
{
  "username": "username",
  "fullName": { "firstName": "user", "lastName": "A" },
  "contactDetails": { "email": "user@example.com", "contactNumber": "0821234567" },
  "dateOfBirth": "1993-04-12",
  "defaultSourceLang": "af",
  "defaultTargetLang": "en",
  "defaultNoteLang": "en",
  "password": "MyP@ssw0rd",
  "adminDataConsent": true
}
```

#### Step 1: Destructure, then make the nested objects safe

```js
const { username, fullName: rawFullName, contactDetails: rawContactDetails, ... } = req.body || {};
const fullName = rawFullName && typeof rawFullName === 'object' ? rawFullName : {};
const contactDetails = rawContactDetails && typeof rawContactDetails === 'object' ? rawContactDetails : {};
```

If the client leaves out `fullName` or `contactDetails`, or sends `null` or a non-object, it's replaced with `{}`. That way `fullName.firstName` never crashes, and the required fields check in Step 2 returns a **400**. A destructuring default (`fullName = {}`) wouldn't be enough, because defaults only apply to `undefined`, not `null`. (See [Gap 2](#gap-2-null-nested-objects-caused-a-500-fixed).)

#### Step 2: Required strings check

```js
const requiredStrings = [username, fullName.firstName, fullName.lastName,
    contactDetails.email, contactDetails.contactNumber, dateOfBirth, password];
if (requiredStrings.some((value) => typeof value !== 'string' || !value.trim())) → 400 "Please fill in all required fields"
```

One check covers both **presence** (no blanks or whitespace) and **type** (blocks `{ "$gt": "" }`-style injection). `.some()` stops at the first failure.

#### Step 3: Consent check

```js
if (adminDataConsent !== true) → 400 "You must consent to admin users seeing your details to register"
```

The checkbox on the form already enforces this, but someone could call the API directly (Postman, curl) and skip the form. **The server is the real gatekeeper.** `!== true` is strict, so `"true"` or `1` are rejected.

#### Step 4: Optional language preferences

```js
const defaultLanguages = {};
if (typeof defaultSourceLang === 'string' && defaultSourceLang) defaultLanguages.defaultSourceLanguage = defaultSourceLang;
// ...same for target and note languages
```

Only the languages the user actually chose are added. If a key is missing, **the schema default applies**. Sending `undefined` or `''` explicitly could override the default or fail validation.

Note the renaming: the request uses `defaultSourceLang`, but the schema uses `defaultLanguages.defaultSourceLanguage`.

#### Step 5: Build the user from named fields only

```js
const newUser = new User({
    username,
    fullName: { firstName: fullName.firstName, lastName: fullName.lastName },
    contactDetails: { email: contactDetails.email, contactNumber: contactDetails.contactNumber },
    dateOfBirth, defaultLanguages, password, adminDataConsent
});
```

This protects against **mass assignment**. If the code did `new User(req.body)`, a client could send:

```json
{ "username": "hacker", "admin": true, ... }
```

and register as an admin. Picking each field by name means `admin` (and `tokenVersion`) can never come from the request.

#### Step 6: Save

```js
await newUser.save();
```

This runs the schema validation (regex for SA phone numbers, email format, enums, etc.), the pre-validate hooks (lowercasing the username, normalising the phone number), and the unique indexes.

#### Response (201)

```json
{ "message": "Registration successful. Please log in.", "userId": "6731f0c2a1b2c3d4e5f60718" }
```

#### Errors

| Error | Detected By | Status | Message |
|---|---|---|---|
| Weak or missing password | `checkPassword` | `400` | "Password must be at least 8 characters long and contain one special character." / "Password is required." |
| Missing, blank or non-string field | Step 2 | `400` | "Please fill in all required fields" |
| Consent not given | Step 3 | `400` | "You must consent to admin users seeing your details to register" |
| Schema validation failed | `error.name === 'ValidationError'` | `400` | The **first** validation message (e.g. "Please enter a valid SA contact number") |
| Duplicate unique field | `error.code === 11000` (MongoDB) | `409` | A message for the specific field (see below) |
| Too many registrations | `registerLimiter` | `429` | "Too many registration attempts, please try again later" |
| Anything else | | `500` | "Internal Server Error" |

**Getting the first validation message:**

```js
Object.values(error.errors)[0]?.message
```

`error.errors` is an object keyed by field path (`{ 'contactDetails.email': ValidatorError, ... }`). `Object.values(...)[0]` takes the first one, so the user fixes one problem at a time.

**Finding which field is duplicated:**

```js
const field = Object.keys(error.keyPattern || {})[0] || '';
const duplicateMessages = {
    username: 'That username is already taken',
    'contactDetails.contactNumber': 'That contact number is already registered',
    'contactDetails.email': 'That email is already registered',
};
const message = duplicateMessages[field] || 'Those details are already registered to another account';
```

MongoDB's duplicate key error includes `keyPattern`, e.g. `{ 'contactDetails.contactNumber': 1 }`. Any field not in the map gets the general fallback, so a unique field added later is never reported as the username. This is the same map `PATCH /editProfile` uses in `userRoutes.js`.

---

### 1.3. POST `/logout`

**Purpose:** End the session by deleting the cookie.

```js
router.post('/logout', (req, res) => {
    res.clearCookie('token', cookieOptions);
    return res.status(200).json({ message: 'Logged out' });
});
```

| Detail | Why |
|---|---|
| `POST`, not `GET` | Logging out changes state. A `GET` could be triggered by an `<img src="/auth/logout">` on another site. |
| `cookieOptions` passed to `clearCookie` | Browsers only delete a cookie when the `path`, `domain`, `sameSite` and `secure` settings **match** the ones it was set with |
| No `checkJwtToken` | Clearing a cookie is harmless, and requiring a valid token would leave an **expired** cookie stuck in the browser with a 401 ([Gap 5](#gap-5-logout-required-a-valid-token-fixed)) |
| No `try/catch` | The handler is synchronous and has nothing that would throw |

Logging out only removes the cookie from the browser. The JWT itself stays **valid until it expires** (or until `tokenVersion` changes, e.g. after a password change), so anyone who had copied it could still use it. With an HTTP-only cookie, that's very hard to do.

---

### 1.4. PATCH `/setAdmin`

**Purpose:** Let the logged-in user upgrade **themselves** to admin, if they meet the rules.

**Middleware:** `checkJwtToken`, so only logged-in users can call it. The user ID comes from the **token**, not the request body, so nobody can upgrade someone else.

**Request body:** none.

#### Flow

```
User.findById(req.user.id)
     ▼
Not found? ───────────────────────────► 404 "User not found"
Already admin? ───────────────────────► 409 "User is already an admin"
Age < ADMIN_MIN_AGE (21)? ────────────► 403 "You must be at least 21 years old to register as an admin."
Account younger than min age? ────────► 403 "Your account is too new to register as an admin."
     ▼
user.admin = true
user.save({ validateModifiedOnly: true })
setTokenCookie(res, user)   ← new JWT with the admin claim
     ▼
200 { message, user: sessionUser(user) }
```

#### Key details

**The account age check**

```js
Date.now() - new Date(user.createdAt).getTime() < ADMIN_MIN_ACCOUNT_AGE_MS
```

`createdAt` comes from the schema's `timestamps: true` option. Both sides are milliseconds, so they compare directly.

**`validateModifiedOnly: true`**

```js
await user.save({ validateModifiedOnly: true });
```

Normally `.save()` validates **every** field. If the schema rules got stricter after some users registered (say, a new phone regex), those older accounts would fail validation on an unrelated update. This option validates only the field that changed (`admin`), so older accounts can still be upgraded.

**Issuing a new token**

```js
setTokenCookie(res, user);
```

The JWT payload includes the `isAdmin` claim. The old token still says `isAdmin: false`, so without a new token the user would have to log out and back in before admin routes worked.

#### Response (200)

```json
{
  "message": "Admin registration successful",
  "user": { "userId": "...", "fullName": { "firstName": "user", "lastName": "A" }, "isAdmin": true }
}
```

| Code | Meaning Here |
|---|---|
| `404` | The token's user no longer exists (e.g. it was deleted) |
| `409` | Conflict: already in the requested state |
| `403` | Forbidden: logged in, but doesn't meet the rules |

---

### 1.5. PATCH `/clearAdmin`

**Purpose:** Let an admin step down to a regular user.

**Middleware:** `checkJwtToken`. **Request body:** none.

This mirrors `/setAdmin` with fewer checks:

```
Not found? ──────────► 404 "User not found"
Not an admin? ───────► 409 "User is not an admin"
     ▼
user.admin = false → save (validateModifiedOnly) → new token cookie → 200
```

There are no age or account-age checks, because giving up a permission never needs them.

#### Response (200)

```json
{
  "message": "Admin status removed",
  "user": { "userId": "...", "fullName": { "firstName": "User", "lastName": "A" }, "isAdmin": false }
}
```

---

<!-- SECTION 2 IMPORTS AND SETUP-->
## 2. IMPORTS AND SETUP

```js
require('dotenv').config()
const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/userSchema');
const {checkJwtToken, setTokenCookie, cookieOptions} = require('../middleware/securityMiddleware')
const {isDevelopment, hashPassword, checkPassword} = require('../middleware/passwordMiddleware')
const { loginLimiter, registerLimiter } = require('../middleware/rateLimitMiddleware');
const { calculateAge } = require('../util/userUtil')
const { ADMIN_MIN_AGE, ADMIN_MIN_ACCOUNT_AGE_MS } = require('../util/schemaUtil');

const router = express.Router()
```

| Import | From | Used For |
|---|---|---|
| `dotenv` | npm | Loads `.env` (also loaded by `app.js`, so this call is a fallback) |
| `express` | npm | Creates the `router` |
| `bcrypt` | `bcryptjs` | `bcrypt.compare()` in `/login`, and `DUMMY_HASH`. Hashing for registration happens in middleware, not here. |
| `User` | [`models/userSchema`](../server/models/userSchema.js) | The Mongoose model for users |
| `checkJwtToken` | [`securityMiddleware`](../server/middleware/securityMiddleware.js) | Verifies the JWT cookie and sets `req.user` |
| `setTokenCookie` | `securityMiddleware` | Signs a JWT for a user and sets it as an HTTP-only cookie |
| `cookieOptions` | `securityMiddleware` | Shared cookie settings. `/logout` needs the same options to clear the cookie. |
| `isDevelopment` | [`passwordMiddleware`](../server/middleware/passwordMiddleware.js) | `true` in development, when passwords are stored as plaintext |
| `checkPassword` | `passwordMiddleware` | Validates the password before registration (strength rules) |
| `hashPassword` | `passwordMiddleware` | Replaces `req.body.password` with a bcrypt hash (left as plaintext in development) |
| `loginLimiter`, `registerLimiter` | [`rateLimitMiddleware`](../server/middleware/rateLimitMiddleware.js) | Per-IP limits that slow down brute-force logins and spam signups |
| `calculateAge` | [`util/userUtil`](../server/util/userUtil.js) | Works out an age from `dateOfBirth` for the admin age rule |
| `ADMIN_MIN_AGE`, `ADMIN_MIN_ACCOUNT_AGE_MS` | [`util/schemaUtil`](../server/util/schemaUtil.js) | Admin eligibility rules ([3.2.1](#321-admin-rules-schemautiljs)) |

---

<!-- SECTION 3: SCHEMAS AND UTILITY FUNCTIONS-->
## 3. SCHEMAS AND UTILITY FUNCTIONS

### 3.1. SCHEMAS

#### 3.1.1. USER SCHEMA ([userSchema.js](../server/models/userSchema.js))

The full field list is in [USER_ROUTES.md, 3.1.1](USER_ROUTES.md#311-user-schema-userschemajs). The parts this router relies on:

| Schema feature | Used by | Effect |
|---|---|---|
| `username`: required, **unique**, lowercased by the `pre('validate')` hook | `/login`, `/register` | `/login` lowercases the input to match; a duplicate on register → `409` |
| `contactDetails.contactNumber`: **unique**, SA mobile regex, normalised to `+27...` | `/register` | A duplicate → `409`; an invalid number → `400` |
| `contactDetails.email`: lowercased, `emailRegex` | `/register` | An invalid email → `400` |
| `dateOfBirth`: not in the future, at least 13 | `/register`, `/setAdmin` | Registration validation; `calculateAge()` for the 21+ rule |
| `defaultLanguages.*`: enums with defaults | `/register` | Missing languages fall back to the defaults |
| `password`: **`select: false`** | `/login` | Hidden from every query unless asked for with `.select('+password')` |
| `adminDataConsent`: required, must be `true` | `/register` | Backs up the route's consent check |
| `admin`: default `false` | `/setAdmin`, `/clearAdmin`, `sessionUser()` | The only fields these routes change |
| `tokenVersion`: default `0` | `setTokenCookie`, `checkJwtToken` | Signed into every JWT; a mismatch signs the session out |
| `createdAt` (`timestamps: true`) | `/setAdmin` | The account age rule |

### 3.2. UTILITY FUNCTIONS

#### 3.2.1. ADMIN RULES ([schemaUtil.js](../server/util/schemaUtil.js))

The requirements a user must meet to become an admin:

| Constant | Rule | Development | Production |
|---|---|---|---|
| `ADMIN_MIN_AGE` | Minimum age, in years | 21 | 21 |
| `ADMIN_MIN_ACCOUNT_AGE_MS` | How long the account must have existed | 1 day | 3 months (90 days) |

```js
const ADMIN_MIN_ACCOUNT_AGE_MS = process.env.NODE_ENV === 'production'
  ? 1000 * 60 * 60 * 24 * 90 // 3 months (90 days) in production
  : 1000 * 60 * 60 * 24;     // 1 day during development
```

Keeping these in `schemaUtil` means the same numbers can be shared by the schema, the routes and the frontend messages.

**`calculateAge(dateOfBirth)`** ([userUtil.js](../server/util/userUtil.js)) returns whole years, subtracting one if this year's birthday hasn't happened yet:

```js
return now.getFullYear() - dob.getFullYear() - (
    now < new Date(now.getFullYear(), dob.getMonth(), dob.getDate()) ? 1 : 0
);
```

#### 3.2.2. `sessionUser()` HELPER

```js
const sessionUser = (user) => ({
    userId: user._id,
    fullName: user.fullName,
    isAdmin: user.admin === true
})
```

This builds the **safe, public** user object that `/login`, `/setAdmin` and `/clearAdmin` return. It deliberately leaves out the password, contact details, date of birth and the token.

| Field | Source | Notes |
|---|---|---|
| `userId` | `user._id` | MongoDB ObjectId |
| `fullName` | `user.fullName` | The `{ firstName, lastName }` object |
| `isAdmin` | `user.admin === true` | A strict comparison, so `undefined`, `null` or `"true"` all become `false` |

Because the shape comes from one helper, the frontend always receives the same user object.

#### 3.2.3. `DUMMY_HASH`

```js
const DUMMY_HASH = bcrypt.hashSync('dummy-password-for-timing', 10);// Created once, when the file loads
// ...in /login
if (!user) {
    await bcrypt.compare(password, DUMMY_HASH);
    return res.status(401).json({ message: 'Invalid credentials' });
}
```

Without it, an unknown username would get an instant reply, while a real one would wait for bcrypt. The difference in response time would give the username away even though the message is the same. The dummy hash uses cost `10`, the same as `SALT_ROUNDS` in `passwordMiddleware`, so it takes as long as a real check.

#### Middleware helpers from `securityMiddleware.js`

| Helper | What it does |
|---|---|
| `setTokenCookie(res, user)` | Signs `{ id, isAdmin, tokenVersion }` with `JWT_SECRET_KEY` (expiry `JWT_EXPIRATION`, default `12h`; algorithm `JWT_ALGORITHM`, default `HS256`) and sets it as the `token` cookie, expiring with the token |
| `cookieOptions` | `{ httpOnly: true, secure: !isDevelopment, sameSite: 'strict', path: '/' }` |

---

<!-- SECTION 4: ROUTER SECURITY -->
## 4. SECURITY

### 4.1. PACKAGES

| Package | Where | Security role |
|---|---|---|
| `bcryptjs` | `authRoutes.js`, `passwordMiddleware.js` | Hashes passwords and compares them in constant time |
| `jsonwebtoken` | `securityMiddleware.js` | Signs the session JWT (`setTokenCookie`) and verifies it (`checkJwtToken`) |
| `express-rate-limit` | `rateLimitMiddleware.js` | `loginLimiter` and `registerLimiter` |
| `cookie-parser` | `app.js` | Reads the HTTP-only `token` cookie into `req.cookies` |
| `dotenv` | `authRoutes.js`, `app.js` | Keeps `JWT_SECRET_KEY` and `NODE_ENV` out of the source code |

### 4.2. MIDDLEWARE

| Middleware | File | Routes | What it does |
|---|---|---|---|
| `loginLimiter` | [rateLimitMiddleware.js](../server/middleware/rateLimitMiddleware.js) | `/login` | **429** after 10 attempts per 15 minutes per IP ("Too many login attempts, please try again in 15 minutes") |
| `registerLimiter` | [rateLimitMiddleware.js](../server/middleware/rateLimitMiddleware.js) | `/register` | **429** after 20 registrations per hour per IP |
| `checkPassword` | [passwordMiddleware.js](../server/middleware/passwordMiddleware.js) | `/register` | **400** unless the password is a string of 8+ characters with at least one special character |
| `hashPassword` | [passwordMiddleware.js](../server/middleware/passwordMiddleware.js) | `/register` | Replaces the password with a bcrypt hash (10 rounds); skipped in development. **500** "Error processing password" if hashing fails. |
| `checkJwtToken` | [securityMiddleware.js](../server/middleware/securityMiddleware.js) | `/setAdmin`, `/clearAdmin` | **401** if the cookie is missing, the token is invalid or expired, the user no longer exists, or the session was signed out (`tokenVersion` changed). **500** if the user lookup fails. Sets `req.user`. |

The rate limiters go **first**, so a flood of requests is rejected before any password work or database call.

### 4.3. SECURITY MEASURES IN THIS FILE

| Measure | Where | Protects Against |
|---|---|---|
| HTTP-only, `SameSite=Strict` JWT cookie | `setTokenCookie` | XSS stealing the token; cross-site requests carrying it |
| Same "Invalid credentials" for both failures | `/login` | Username enumeration |
| Dummy `bcrypt.compare()` for unknown usernames | `/login` | Username enumeration through response timing |
| `typeof === 'string'` checks | `/login`, `/register` | NoSQL operator injection (`{ "$gt": "" }`) |
| Building the user from named fields | `/register` | Mass assignment (`{ "admin": true }`) |
| Server-side consent check | `/register` | Skipping the form's checkbox |
| Rate limiters | `/login`, `/register` | Brute-force logins, spam signups |
| `select: false` + `.select('+password')` | Schema + `/login` | Accidentally returning password hashes in other queries |
| User ID taken from the token, not the body | `/setAdmin`, `/clearAdmin` | Acting on another user's account |
| `sessionUser()` whitelist | All user responses | Leaking private fields |
| No passwords in logs | All `console.log` calls | Credentials in log files |
| `POST` for logout | `/logout` | Cross-site GET-triggered logouts |

---

<!-- SECTION 5 -->
## 5. STATUS CODE REFERENCES

| Code | Route(s) | When |
|---|---|---|
| `200` | login, logout, setAdmin, clearAdmin | Success |
| `201` | register | User created |
| `400` | login | Missing or non-string username or password |
| `400` | register | Weak or missing password, missing or invalid fields, no consent, schema validation failed |
| `401` | login | Invalid credentials |
| `401` | setAdmin, clearAdmin | (From `checkJwtToken`) Not logged in, or the token is invalid, expired or signed out |
| `403` | setAdmin | Under 21, or account too new |
| `404` | setAdmin, clearAdmin | The token's user no longer exists |
| `409` | register | Username, email or contact number already registered |
| `409` | setAdmin, clearAdmin | Already in the requested admin state |
| `429` | login, register | (From the rate limiters) Too many attempts |
| `500` | all except logout | Unexpected server error (including a failed hash in `hashPassword`) |

---

<!-- SECTION 6 -->
## 6. KNOWN GAPS AND HOUSE KEEPING

### 6.1. GAPS

#### Gap 1: Plaintext passwords (development)

Passwords are stored as **plaintext in development**. This is fine for local testing, but:

- **Before going live**, make sure `NODE_ENV` is set to `production` in the deployed environment, so `isDevelopment` is `false` and `hashPassword` actually hashes. An **unset** `NODE_ENV` counts as development.
- Accounts created while in plaintext mode store a value that isn't a bcrypt hash. In production, `/login` sends them to `bcrypt.compare()`, which can't match a plaintext value, so **those accounts won't be able to log in**. Clear out dev users (or re-hash them) before deploying.
- The plaintext comparison uses `===`, which isn't timing-safe. That's acceptable for development only.

#### Gap 2: `null` nested objects caused a 500 (fixed)

Destructuring defaults (`fullName = {}`) only apply when the value is `undefined`. A client sending `"fullName": null` made `fullName.firstName` throw a `TypeError`, so the user got a **500** instead of a 400.

**Fixed:** `/register` now replaces a `null` or non-object `fullName` / `contactDetails` with `{}`, so the required fields check returns a 400. See [1.2, Step 1](#step-1-destructure-then-make-the-nested-objects-safe).

#### Gap 3: The duplicate-field message assumed "username" (fixed)

Any duplicate key that wasn't `contactNumber` was reported as "That username is already taken", so a unique field added later would show the wrong message.

**Fixed:** `/register` now looks the field up in a map of messages, with a general fallback for anything not listed. See [1.2, Errors](#errors).

#### Gap 4: Login timing revealed usernames (fixed)

When the user didn't exist, `/login` responded immediately. When they did, it ran `bcrypt.compare()`, which takes noticeably longer, so response time hinted at which usernames were real.

**Fixed:** `/login` now runs `bcrypt.compare()` against a fixed dummy hash when the user isn't found, so both failures take about the same time. See [3.2.3. `DUMMY_HASH`](#323-dummy_hash).

#### Gap 5: Logout required a valid token (fixed)

Because of `checkJwtToken`, a user whose token had **expired** got a 401 from `/logout`, and the expired cookie stayed in their browser.

**Fixed:** `/logout` no longer uses `checkJwtToken`. Clearing a cookie is harmless, so anyone can call it, and it always returns 200. The log line no longer includes the user ID, because there's no verified token to read it from. See [1.3. POST `/logout`](#13-post-logout).

**Checked:** `cookieOptions` has no `maxAge` or `expires` (the expiry is only added inside `setTokenCookie`), and the project uses **Express 5**, which ignores both in `clearCookie`. So `clearCookie` really deletes the cookie, with no change needed.

#### Gap 6: Self-service admin (accepted by design)

Any user who meets the age and account-age rules can make **themselves** an admin through `AdminRegisForm`. This is **intentional** for this project: Notes Nest is a portfolio/dev project with no "super admin" to approve requests, so the rules in `schemaUtil` (21+, minimum account age) are the only gate.

In a real production app, admin rights would normally be granted by an existing admin, or need approval. That would mean making `/setAdmin` admin-only with a target user ID, plus a frontend screen for promoting users.

#### Gap 7: `checkPassword` / `hashPassword` run before the type checks (not an issue)

The route's `typeof password === 'string'` check runs **after** both password middlewares, so the concern was that a missing or non-string `password` could reach `bcrypt.hash()` and cause a 500.

**Checked:** `checkPassword` runs first and returns a **400** ("Password is required.") when the password isn't a string, so `hashPassword` only ever sees a string. The one odd case is a register request with no `password` but a valid `newPassword`: both middlewares pass, but the route's required fields check still returns a 400. There's no path to a 500, so no code change was needed.

### 6.2. HOUSE KEEPING

**Done:**

| Issue | What changed |
|---|---|
| Header said the router was mounted at `/users`, while route comments said `/auth/...` | The header and every route comment now say `/auth`, matching `app.js` |

**Still to do:**

| Line(s) | Issue | Suggestion |
|---|---|---|
| 42 | Typo: "usersername" | "username" |
| 44 | Comment says "email and password" | The route checks **username** and password |
| 44, 62 | "Conditional rendering" | That's a React UI term. Here these are **guard clauses**. |
| 62 | `/*/` opening | Should be `/*` |
| 22 | A stray "Use Plaintext passwords for development" comment above HELPERS | Move it into the header or delete it |
| 104, 210 vs. 259, 288 | `/login` and `/register` 500 responses include `success: false`; `/setAdmin` and `/clearAdmin` don't | Pick one error shape (`{ message }`) everywhere |
| 99 vs. 256, 284 | `/login` returns the user object directly; `/setAdmin` and `/clearAdmin` wrap it in `{ message, user }` | It works, but the frontend has to handle two shapes. Consider making them consistent. |
| 230–231, 239 | Uneven indentation in `/setAdmin` | Re-indent to four spaces |
| 12, 13, 16, 20 | Missing semicolons on the `require` lines and `express.Router()` | Add `;` to match the other lines |
| `userUtil.js` lines 23–25 | `userUtil.js` defines its own `ADMIN_MIN_AGE` and `ADMIN_MIN_ACCOUNT_AGE_MS` (always 1 day) and exports them, while this router uses the `schemaUtil.js` versions (3 months in production) | Remove the copies from `userUtil.js` so there's one source for the admin rules |

---

<!-- SECTION 7: REFERENCES -->
## 7. REFERENCES

**Project files**

- [authRoutes.js](../server/routes/authRoutes.js)
- [userSchema.js](../server/models/userSchema.js)
- [securityMiddleware.js](../server/middleware/securityMiddleware.js), [passwordMiddleware.js](../server/middleware/passwordMiddleware.js), [rateLimitMiddleware.js](../server/middleware/rateLimitMiddleware.js)
- [schemaUtil.js](../server/util/schemaUtil.js), [userUtil.js](../server/util/userUtil.js)
- [Login.js](../client/src/pages/Login.js), [Register.js](../client/src/pages/Register.js), [App.js](../client/src/App.js), [AdminRegisForm.js](../client/src/components/AdminRegisForm.js), [Profile.js](../client/src/components/Profile.js)
- [USER_ROUTES.md](USER_ROUTES.md), [GLOSSARY.md](../GLOSSARY.md)

**External documentation**

- [Express: Routing](https://expressjs.com/en/guide/routing.html)
- [Express: `res.cookie()` / `res.clearCookie()`](https://expressjs.com/en/api.html#res.cookie)
- [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken)
- [bcryptjs](https://github.com/dcodeIO/bcrypt.js)
- [express-rate-limit](https://github.com/express-rate-limit/express-rate-limit)
- [Mongoose: Validation](https://mongoosejs.com/docs/validation.html)
- [OWASP: Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [MDN: `Set-Cookie`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie)
- [MDN: HTTP response status codes](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status)
