# AUTH_ROUTES.md — `authRoutes.js` Breakdown

`authRoutes.js` is the Express router that handles **accounts and sessions**: logging in, registering, logging out, and switching admin status on or off. Sessions use a **JWT stored in an HTTP-only cookie**. The token is never sent in a response body, so client-side JavaScript can never read it.

```
React (Login / Register / Profile)  ──►  /users/...  ──►  MongoDB (User model)
            ▲                          (this router)
            └──── user details (JSON)  +  Set-Cookie: token=<JWT>; HttpOnly
```

---

## Table of Contents

1. [Route Summary](#1-route-summary)
2. [Imports & Setup](#2-imports--setup)
3. [Admin Rules (schemaUtil)](#3-admin-rules-schemautil)
4. [sessionUser() Helper](#4-sessionuser-helper)
5. [POST /login](#5-post-userslogin)
6. [POST /register](#6-post-usersregister)
7. [POST /logout](#7-post-userslogout)
8. [PATCH /setAdmin](#8-patch-userssetadmin)
9. [PATCH /clearAdmin](#9-patch-usersclearadmin)
10. [Security Measures in This File](#10-security-measures-in-this-file)
11. [Status Code Reference](#11-status-code-reference)
12. [Known Gaps & Housekeeping](#12-known-gaps--housekeeping)

---

## 1. Route Summary

According to the header comment, the router is mounted at **`/users`** in `app.js` (see [Housekeeping](#housekeeping) about the `/auth` naming in the route comments).

| Method | Full Path | Middleware | Purpose |
|---|---|---|---|
| `POST` | `/users/login` | `loginLimiter` | Check credentials and set the JWT cookie |
| `POST` | `/users/register` | `registerLimiter`, `checkPassword`, `hashPassword` | Create a new user |
| `POST` | `/users/logout` | `checkJwtToken` | Clear the JWT cookie |
| `PATCH` | `/users/setAdmin` | `checkJwtToken` | Upgrade the logged-in user to admin (21+, minimum account age) |
| `PATCH` | `/users/clearAdmin` | `checkJwtToken` | Remove admin status from the logged-in user |

`/login` and `/register` **don't** require a token, because the user doesn't have one yet.

---

## 2. Imports & Setup

```js
require('dotenv').config()
const express = require('express');
const User = require('../models/userSchema');
const bcrypt = require('bcryptjs');
const { checkJwtToken, setTokenCookie, cookieOptions } = require('../middleware/securityMiddleware')
const { isDevelopment, hashPassword, checkPassword } = require('../middleware/passwordMiddleware')
const { loginLimiter, registerLimiter } = require('../middleware/rateLimitMiddleware');
const router = express.Router()
const { calculateAge } = require('../util/userUtil')
const { ADMIN_MIN_AGE, ADMIN_MIN_ACCOUNT_AGE_MS } = require('../util/schemaUtil');
```

| Import | From | Used For |
|---|---|---|
| `dotenv` | npm | Loads `.env` (JWT secret, environment flags) |
| `express` | npm | Creates the `router` |
| `User` | `models/userSchema` | The Mongoose model for users |
| `bcrypt` | `bcryptjs` | `bcrypt.compare()` in `/login`. Hashing happens in middleware, not here. |
| `checkJwtToken` | `securityMiddleware` | Verifies the JWT cookie and sets `req.user` |
| `setTokenCookie` | `securityMiddleware` | Signs a JWT for a user and sets it as an HTTP-only cookie |
| `cookieOptions` | `securityMiddleware` | Shared cookie settings. `/logout` needs the same options to clear the cookie. |
| `isDevelopment` | `passwordMiddleware` | `true` in development, when passwords are stored as plaintext |
| `checkPassword` | `passwordMiddleware` | Validates the password before registration (strength rules) |
| `hashPassword` | `passwordMiddleware` | Replaces `req.body.password` with a bcrypt hash (left as plaintext in development) |
| `loginLimiter`, `registerLimiter` | `rateLimitMiddleware` | Per-IP limits that slow down brute-force and spam signups |
| `calculateAge` | `util/userUtil` | Works out an age from `dateOfBirth` for the admin age rule |
| `ADMIN_MIN_AGE`, `ADMIN_MIN_ACCOUNT_AGE_MS` | `util/schemaUtil` | Admin eligibility rules ([section 3](#3-admin-rules-schemautil)) |

---

## 3. Admin Rules (schemaUtil)

| Constant | Rule | Development | Production |
|---|---|---|---|
| `ADMIN_MIN_AGE` | Minimum age, in years | 21 | 21 |
| `ADMIN_MIN_ACCOUNT_AGE_MS` | How long the account must have existed | 1 day | 3 months |

Keeping these in `schemaUtil` means the same numbers can be shared by the schema, the routes and the frontend messages.

---

## 4. sessionUser() Helper

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

---

## 5. POST `/users/login`

**Purpose:** Check the username and password, then start a session by setting the JWT cookie.

**Middleware:** `loginLimiter`. This limits login attempts per IP, which slows down password guessing.

**Request body:**

```json
{ "username": "LaraK", "password": "MyP@ssw0rd" }
```

### Flow

```
Missing username/password? ───────────────────────────► 400
Not strings? (e.g. { "$gt": "" }) ─────────────────────► 400
     ▼
User.findOne({ username: trimmed + lowercase }).select('+password')
     ▼
No user? ──────────────────────────────────────────────► 401 "Invalid credentials"
     ▼
Compare the password (bcrypt, or plaintext in development)
     ▼
Wrong password? ───────────────────────────────────────► 401 "Invalid credentials"
     ▼
setTokenCookie(res, user) → 200 sessionUser(user)
```

### Step-by-step

**Step 1: Presence check**

```js
if (!username || !password) return res.status(400)...
```

**Step 2: Type check (blocks NoSQL injection)**

```js
if (typeof username !== 'string' || typeof password !== 'string') return res.status(400)...
```

Without this check, a request like:

```json
{ "username": { "$gt": "" }, "password": "x" }
```

would give `findOne` a **query operator** that matches the first user in the collection. Making sure both values are strings shuts that down.

**Step 3: Find the user**

```js
const user = await User.findOne({ username: username.trim().toLowerCase() })
    .select('+password')
    .exec();
```

| Piece | Why |
|---|---|
| `.trim().toLowerCase()` | Usernames are stored in lowercase by the schema's pre-validate hook, so `" LaraK "` finds the record stored as `larak`. |
| `.select('+password')` | The schema hides `password` by default (`select: false`). The `+` adds it back for this query only. |
| `.exec()` | Returns a real Promise and gives better stack traces. |

**Step 4: Same error for a wrong username or a wrong password**

```js
return res.status(401).json({ message: 'Invalid credentials' });
```

Both cases send an **identical** status and message. If they were different ("User not found" vs. "Wrong password"), an attacker could use the login form to find out which usernames exist. This is called **user enumeration**.

**Step 5: Compare the password**

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

**Step 6: Log, set the cookie, respond**

```js
setTokenCookie(res, user);
return res.status(200).json(sessionUser(user));
```

The success log includes `userId` and `username` only, **never the password**.

**Response (200):**

```json
{
  "userId": "6731f0c2a1b2c3d4e5f60718",
  "fullName": { "firstName": "Lara", "lastName": "K" },
  "isAdmin": false
}
```

The response also has a header like:

```
Set-Cookie: token=<JWT>; HttpOnly; ...
```

---

## 6. POST `/users/register`

**Purpose:** Create a new user account. It does **not** log the user in. The client is told to log in afterwards.

**Middleware (runs in order):**

```
registerLimiter → checkPassword → hashPassword → route handler
      │                │               │
      └─ 429           └─ 400 weak     └─ req.body.password becomes a bcrypt hash
                          password        (plaintext in development)
```

So when the handler runs, `req.body.password` is **already hashed**.

**Request body:**

```json
{
  "username": "LaraK",
  "fullName": { "firstName": "Lara", "lastName": "K" },
  "contactDetails": { "email": "lara@example.com", "contactNumber": "0821234567" },
  "dateOfBirth": "1995-04-12",
  "defaultSourceLang": "af",
  "defaultTargetLang": "en",
  "defaultNoteLang": "en",
  "password": "MyP@ssw0rd",
  "adminDataConsent": true
}
```

### Step-by-step

**Step 1: Destructure with defaults**

```js
const { username, fullName = {}, contactDetails = {}, ... } = req.body || {};
```

`fullName = {}` and `contactDetails = {}` mean `fullName.firstName` doesn't crash when the client leaves out the whole object. (Defaults only apply to `undefined`. See [Gap 2](#gap-2-null-nested-objects-cause-a-500).)

**Step 2: Required strings check**

```js
const requiredStrings = [username, fullName.firstName, fullName.lastName,
    contactDetails.email, contactDetails.contactNumber, dateOfBirth, password];
if (requiredStrings.some((value) => typeof value !== 'string' || !value.trim())) → 400
```

One check covers both **presence** (no blanks or whitespace) and **type** (blocks `{ "$gt": "" }`-style injection). `.some()` stops at the first failure.

**Step 3: Consent check**

```js
if (adminDataConsent !== true) → 400
```

The checkbox on the form already enforces this, but someone could call the API directly (Postman, curl) and skip the form. **The server is the real gatekeeper.** `!== true` is strict, so `"true"` or `1` are rejected.

**Step 4: Optional language preferences**

```js
const defaultLanguages = {};
if (typeof defaultSourceLang === 'string' && defaultSourceLang) defaultLanguages.defaultSourceLanguage = defaultSourceLang;
// ...same for target and note languages
```

Only the languages the user actually chose are added. If a key is missing, **the schema default applies**. If you sent `undefined` or `''` explicitly, that could override the default or fail validation.

Note the renaming: the request uses `defaultSourceLang`, but the schema uses `defaultLanguages.defaultSourceLanguage`.

**Step 5: Build the user from named fields only**

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

and register as an admin. Picking each field by name means `admin` can never come from the request.

**Step 6: Save**

```js
await newUser.save();
```

This runs the schema validation (regex for SA phone numbers, email format, enums, etc.), the pre-validate hooks (lowercasing the username), and the unique indexes.

**Response (201):**

```json
{ "message": "Registration successful. Please log in.", "userId": "6731f0c2a1b2c3d4e5f60718" }
```

### Error handling in the `catch`

| Error | Detected By | Status | Message |
|---|---|---|---|
| Schema validation failed | `error.name === 'ValidationError'` | `400` | The **first** validation message (e.g. "Please enter a valid SA contact number") |
| Duplicate unique field | `error.code === 11000` (MongoDB) | `409` | "That contact number is already registered" / "That username is already taken" |
| Anything else | — | `500` | "Internal Server Error" |

**Getting the first validation message:**

```js
Object.values(error.errors)[0]?.message
```

`error.errors` is an object keyed by field path (`{ 'contactDetails.email': ValidatorError, ... }`). `Object.values(...)[0]` takes the first one, so the user fixes one problem at a time.

**Finding which field is duplicated:**

```js
const field = Object.keys(error.keyPattern || {})[0] || '';
```

MongoDB's duplicate key error includes `keyPattern`, e.g. `{ 'contactDetails.contactNumber': 1 }`. The route checks whether the field name includes `contactNumber`, and otherwise assumes it's the username.

---

## 7. POST `/users/logout`

```js
router.post('/logout', checkJwtToken, (req, res) => {
    res.clearCookie('token', cookieOptions);
    return res.status(200).json({ message: 'Logged out' });
});
```

**Purpose:** End the session by deleting the cookie.

| Detail | Why |
|---|---|
| `POST`, not `GET` | Logging out changes state. A `GET` could be triggered by an `<img src="/users/logout">` on another site. |
| `cookieOptions` passed to `clearCookie` | Browsers only delete a cookie when the `path`, `domain`, `sameSite` and `secure` settings **match** the ones it was set with |
| `checkJwtToken` | Provides `req.user.id` for the log line |
| No `try/catch` | The handler is synchronous and has nothing that would throw |

Logging out only removes the cookie from the browser. The JWT itself stays **valid until it expires**, so anyone who had copied it could still use it. With an HTTP-only cookie, that's very hard to do.

---

## 8. PATCH `/users/setAdmin`

**Purpose:** Let the logged-in user upgrade **themselves** to admin, if they meet the rules.

**Middleware:** `checkJwtToken`, so only logged-in users can call it. The user ID comes from the **token**, not the request body, so nobody can upgrade someone else.

**Request body:** none.

### Flow

```
User.findById(req.user.id)
     ▼
Not found? ───────────────────────────► 404 "User not found"
Already admin? ───────────────────────► 409 "User is already an admin"
Age < ADMIN_MIN_AGE (21)? ────────────► 403 "You must be at least 21..."
Account younger than min age? ────────► 403 "Your account is too new..."
     ▼
user.admin = true
user.save({ validateModifiedOnly: true })
setTokenCookie(res, user)   ← new JWT with the admin claim
     ▼
200 { message, user: sessionUser(user) }
```

### Key details

**The account age check**

```js
Date.now() - new Date(user.createdAt).getTime() < ADMIN_MIN_ACCOUNT_AGE_MS
```

`createdAt` comes from the schema's `timestamps: true` option. Both sides are milliseconds, so they compare directly.

**`validateModifiedOnly: true`**

```js
await user.save({ validateModifiedOnly: true });
```

Normally `.save()` validates **every** field. If your schema rules got stricter after some users registered (say, a new phone regex), those older accounts would fail validation on an unrelated update. This option validates only the field that changed (`admin`), so older accounts can still be upgraded.

**Issuing a new token**

```js
setTokenCookie(res, user);
```

The JWT payload includes the admin claim. The old token still says `admin: false`, so without a new token the user would have to log out and back in before admin routes worked.

**Status codes used:**

| Code | Meaning Here |
|---|---|
| `404` | The token's user no longer exists (e.g. it was deleted) |
| `409` | Conflict: already in the requested state |
| `403` | Forbidden: logged in, but doesn't meet the rules |

---

## 9. PATCH `/users/clearAdmin`

**Purpose:** Let an admin step down to a regular user.

This mirrors `/setAdmin` with fewer checks:

```
Not found? ──────────► 404
Not an admin? ───────► 409 "User is not an admin"
     ▼
user.admin = false → save (validateModifiedOnly) → new token cookie → 200
```

There are no age or account-age checks, because giving up a permission never needs them.

**Response (200):**

```json
{
  "message": "Admin status removed",
  "user": { "userId": "...", "fullName": { "firstName": "Lara", "lastName": "K" }, "isAdmin": false }
}
```

---

## 10. Security Measures in This File

| Measure | Where | Protects Against |
|---|---|---|
| HTTP-only JWT cookie | `setTokenCookie` | XSS stealing the token (JavaScript can't read it) |
| Same "Invalid credentials" for both failures | `/login` | Username enumeration |
| `typeof === 'string'` checks | `/login`, `/register` | NoSQL operator injection (`{ "$gt": "" }`) |
| Building the user from named fields | `/register` | Mass assignment (`{ "admin": true }`) |
| Server-side consent check | `/register` | Skipping the form's checkbox |
| Rate limiters | `/login`, `/register` | Brute-force logins, spam signups |
| `select: false` + `.select('+password')` | Schema + `/login` | Accidentally returning password hashes in other queries |
| User ID taken from the token, not the body | `/setAdmin`, `/clearAdmin`, `/logout` | Acting on another user's account |
| `sessionUser()` whitelist | All responses | Leaking private fields |
| No passwords in logs | All `console.log` calls | Credentials in log files |
| `POST` for logout | `/logout` | Cross-site GET-triggered logouts |

---

## 11. Status Code Reference

| Code | Route(s) | When |
|---|---|---|
| `200` | login, logout, setAdmin, clearAdmin | Success |
| `201` | register | User created |
| `400` | login, register | Missing or invalid fields, no consent, schema validation failed |
| `401` | login | Invalid credentials |
| `401` | logout, setAdmin, clearAdmin | (From `checkJwtToken`) No token, or an invalid or expired one |
| `403` | setAdmin | Under 21, or account too new |
| `404` | setAdmin, clearAdmin | The token's user no longer exists |
| `409` | register | Username or contact number already taken |
| `409` | setAdmin, clearAdmin | Already in the requested admin state |
| `429` | login, register | (From the rate limiters) Too many attempts |
| `500` | all except logout | Unexpected server error |

---

## 12. Known Gaps & Housekeeping

### Gap 1: Plaintext passwords (development)

The header says passwords are stored as **plaintext in development**. This is fine for local testing, but:

- **Before going live**, make sure `isDevelopment` is `false` in the deployed environment, so `hashPassword` actually hashes.
- Accounts created while in plaintext mode store a value that isn't a bcrypt hash. In production, `/login` sends them to `bcrypt.compare()`, which can't match a plaintext value, so **those accounts won't be able to log in**. Clear out dev users (or re-hash them) before deploying.
- The plaintext comparison uses `===`, which isn't timing-safe. That's acceptable for development only.

### Gap 2: `null` nested objects cause a 500

```js
const { fullName = {}, contactDetails = {} } = req.body || {};
```

Destructuring defaults only apply when the value is `undefined`. If a client sends `"fullName": null`, then `fullName.firstName` throws a `TypeError`, and the user gets a **500** instead of a 400. **Fix:**

```js
const safeFullName = fullName && typeof fullName === 'object' ? fullName : {};// Treat null or non-objects as empty
const safeContact = contactDetails && typeof contactDetails === 'object' ? contactDetails : {};// Same for contact details
```

### Gap 3: The duplicate-field message assumes "username"

Any duplicate key that isn't `contactNumber` is reported as "That username is already taken". If you later add another unique field (e.g. `contactDetails.email`), it'll show the wrong message. Check each field explicitly:

```js
const messages = {
    username: 'That username is already taken',
    'contactDetails.contactNumber': 'That contact number is already registered',
    'contactDetails.email': 'That email is already registered',
};
const message = messages[field] || 'That account already exists';// Fallback for any new unique field
```

### Gap 4: Login timing reveals usernames (minor)

When the user **doesn't exist**, `/login` responds immediately. When they **do** exist, it runs `bcrypt.compare()`, which takes noticeably longer. The messages are the same, but the response time can still hint at which usernames are real. The rate limiter makes this hard to exploit. To close it completely, run a dummy `bcrypt.compare()` against a fixed hash when the user isn't found.

### Gap 5: Logout requires a valid token

Because of `checkJwtToken`, a user whose token has **expired** gets a 401 from `/logout`, and the expired cookie stays in their browser. Consider dropping `checkJwtToken` from `/logout` (clearing a cookie is harmless) and logging `req.user?.id` only when it's present.

Also check `cookieOptions`: if it contains `maxAge`, **Express 4** can set a fresh expiry when clearing instead of deleting the cookie (Express 5 ignores `maxAge` in `clearCookie`). Use a copy without `maxAge`/`expires` for `clearCookie`.

### Gap 6: Self-service admin

Any user who meets the age and account-age rules can make **themselves** an admin. That's fine for a portfolio or dev project, but in a real app admin rights are normally granted by an existing admin, or need approval.

### Gap 7: `checkPassword` / `hashPassword` run before the type checks

The route's `typeof password === 'string'` check runs **after** both password middlewares. Make sure those middlewares handle a missing or non-string `password` themselves (returning a 400), otherwise `bcrypt.hash()` may throw and give a 500.

### Housekeeping

| Line(s) | Issue | Suggestion |
|---|---|---|
| 2 vs. 39, 107, 203, 214, 251 | Header says it's mounted at `/users`, but route comments say `/auth/login`, `/auth/setAdmin`, etc. | Use one prefix in all the comments, matching `app.js` |
| 3–6 | The header route list leaves out `POST /logout` | Add it |
| 42 | Typo: "usersername" | "username" |
| 44 | Comment says "email and password" | The route checks **username** and password |
| 44, 62 | "Conditional rendering" | That's a React UI term. Here these are **guard clauses** / conditional checks. |
| 62 | `/*/` opening | Should be `/*` |
| 26 | A stray "Use Plaintext passwords for development" comment above HELPERS | Move it into the header or delete it |
| 103, 199 vs. 246, 275 | Some 500 responses include `success: false` and some don't | Pick one error shape (`{ message }`) everywhere |
| 98 vs. 243, 271 | `/login` returns the user object directly; `/setAdmin` and `/clearAdmin` wrap it in `{ message, user }` | It works, but the frontend has to handle two shapes. Consider making them consistent. |
