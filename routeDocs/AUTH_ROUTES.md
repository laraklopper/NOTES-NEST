# AUTH_ROUTES.md — `authRoutes.js` Breakdown

[`authRoutes.js`](../server/routes/authRoutes.js) is the Express router that handles **accounts and sessions**: logging in, registering, logging out, and switching admin status on or off. Sessions use a **JWT stored in an HTTP-only cookie**. The token is never sent in a response body, so client-side JavaScript can never read it.

```
React (Login / Register / Profile)  ──►  /users/...  ──►  MongoDB (User model)
            ▲                          (this router)
            └──── user details (JSON)  +  Set-Cookie: token=<JWT>; HttpOnly
```

---

## Table of Contents

1. [ROUTE SUMMARY](#1-route-summary)
2. [IMPORTS AND SETUP](#2-imports-and-setup)
3. [ADMIN RULES (schemaUtil)](#3-admin-rules)
4. [sessionUser() Helper](#4-sessionuser-helper)
5. [POST /login](#5-post-userslogin)
6. [POST /register](#6-post-usersregister)
7. [POST /logout](#7-post-userslogout)
8. [PATCH /setAdmin](#8-patch-userssetadmin)
9. [PATCH /clearAdmin](#9-patch-usersclearadmin)
10. [Security Measures in This File](#10-security-measures-in-this-file)
11. [Status Code Reference](#11-status-code-reference)
12. [REFERENCES](#12-references)

<!-- 12. [Known Gaps & Housekeeping](#12-known-gaps--housekeeping) -->

---

## 1. ROUTE SUMMARY

The router is mounted at **`/auth`** in [`app.js`](../server/app.js) 


| Method | Full Path | Middleware | Purpose |
|---|---|---|---|
| `POST` | `/users/login` | `loginLimiter` | Check credentials and set the JWT cookie |
| `POST` | `/users/register` | `registerLimiter`, `checkPassword`, `hashPassword` | Create a new user |
| `POST` | `/users/logout` | — | Clear the JWT cookie |
| `PATCH` | `/users/setAdmin` | `checkJwtToken` | Upgrade the logged-in user to admin (21+, minimum account age) |
| `PATCH` | `/users/clearAdmin` | `checkJwtToken` | Remove admin status from the logged-in user |

`/login` and `/register` **don't** require a token, because the user doesn't have one yet. `/logout` doesn't either, so an expired cookie can still be cleared.

### 1.1. POST `/users/login`

**Purpose:** Check the username and password, then start a session by setting the JWT cookie.
**Middleware:** `loginLimiter`. This limits login attempts per IP, which slows down password guessing.

**Request body:**

```json
{ "username": "username", "password": "MyP@ssw0rd" }
```


#### REQUEST FLOW

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
Step-by-step

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

The two cases also take the **same time**. When the user isn't found, the route still runs a `bcrypt.compare()` against a fixed dummy hash before responding:

```js
const DUMMY_HASH = bcrypt.hashSync('dummy-password-for-timing', 10);// Created once, when the file loads
// ...
if (!user) {
    await bcrypt.compare(password, DUMMY_HASH);
    return res.status(401).json({ message: 'Invalid credentials' });
}
```

Without it, an unknown username would get an instant reply, while a real one would wait for bcrypt. The difference in response time would give the username away even though the message is the same. The dummy hash uses cost `10`, the same as `SALT_ROUNDS` in `passwordMiddleware`, so it takes as long as a real check.

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

## 1.2. POST `/users/register`

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

**Step 1: Destructure, then make the nested objects safe**

```js
const { username, fullName: rawFullName, contactDetails: rawContactDetails, ... } = req.body || {};
const fullName = rawFullName && typeof rawFullName === 'object' ? rawFullName : {};
const contactDetails = rawContactDetails && typeof rawContactDetails === 'object' ? rawContactDetails : {};
```

If the client leaves out `fullName` or `contactDetails`, or sends `null` or a non-object, it's replaced with `{}`. That way `fullName.firstName` never crashes, and the required fields check in Step 2 returns a **400**. A destructuring default (`fullName = {}`) wouldn't be enough, because defaults only apply to `undefined`, not `null`. (See [Gap 2](#gap-2-null-nested-objects-cause-a-500-fixed).)

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
| Duplicate unique field | `error.code === 11000` (MongoDB) | `409` | A message for the specific field (see below) |
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

MongoDB's duplicate key error includes `keyPattern`, e.g. `{ 'contactDetails.contactNumber': 1 }`. The route looks the field up in a map of messages:

```js
const duplicateMessages = {
    username: 'That username is already taken',
    'contactDetails.contactNumber': 'That contact number is already registered',
    'contactDetails.email': 'That email is already registered',
};
const message = duplicateMessages[field] || 'Those details are already registered to another account';
```

Any field not in the map gets the general fallback, so a unique field added later is never reported as the username. This is the same map `PATCH /editProfile` uses in `userRoutes.js`.

---

## 1.3. POST `/users/logout`

```js
router.post('/logout', (req, res) => {
    res.clearCookie('token', cookieOptions);
    return res.status(200).json({ message: 'Logged out' });
});
```

**Purpose:** End the session by deleting the cookie.

| Detail | Why |
|---|---|
| `POST`, not `GET` | Logging out changes state. A `GET` could be triggered by an `<img src="/users/logout">` on another site. |
| `cookieOptions` passed to `clearCookie` | Browsers only delete a cookie when the `path`, `domain`, `sameSite` and `secure` settings **match** the ones it was set with |
| No `checkJwtToken` | Clearing a cookie is harmless, and requiring a valid token would leave an **expired** cookie stuck in the browser with a 401 ([Gap 5](#gap-5-logout-required-a-valid-token-fixed)) |
| No `try/catch` | The handler is synchronous and has nothing that would throw |

Logging out only removes the cookie from the browser. The JWT itself stays **valid until it expires**, so anyone who had copied it could still use it. With an HTTP-only cookie, that's very hard to do.

---

### 1.4. PATCH `/users/setAdmin`

**Purpose:** Let the logged-in user upgrade **themselves** to admin, if they meet the rules.

**Middleware:** `checkJwtToken`, so only logged-in users can call it. The user ID comes from the **token**, not the request body, so nobody can upgrade someone else.

**Request body:** none.

#### Flow

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

### 1.5. PATCH `/users/clearAdmin`
---

## 2. IMPORTS AND SETUP

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
| `ADMIN_MIN_AGE`, `ADMIN_MIN_ACCOUNT_AGE_MS` | [`util/schemaUtil`](../server/util/schemaUtil.js) | Admin eligibility rules ([section 3](#3-admin-rules-schemautil)) |

---



## 3. UTILITY FUNCTIONS
### 3.1. ADMIN RULES

Sets requirements for users to become admin users


| Constant | Rule | Development | Production |
|---|---|---|---|
| `ADMIN_MIN_AGE` | Minimum age, in years | 21 | 21 |
| `ADMIN_MIN_ACCOUNT_AGE_MS` | How long the account must have existed | 1 day | 3 months |

Keeping these in [`schemaUtil`](../server/util/schemaUtil.js) means the same numbers can be shared by the schema, the routes and the frontend messages.

---

### 3.1. sessionUser() Helper

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
| Dummy `bcrypt.compare()` for unknown usernames | `/login` | Username enumeration through response timing |
| `typeof === 'string'` checks | `/login`, `/register` | NoSQL operator injection (`{ "$gt": "" }`) |
| Building the user from named fields | `/register` | Mass assignment (`{ "admin": true }`) |
| Server-side consent check | `/register` | Skipping the form's checkbox |
| Rate limiters | `/login`, `/register` | Brute-force logins, spam signups |
| `select: false` + `.select('+password')` | Schema + `/login` | Accidentally returning password hashes in other queries |
| User ID taken from the token, not the body | `/setAdmin`, `/clearAdmin` | Acting on another user's account |
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
| `401` | setAdmin, clearAdmin | (From `checkJwtToken`) No token, or an invalid or expired one |
| `403` | setAdmin | Under 21, or account too new |
| `404` | setAdmin, clearAdmin | The token's user no longer exists |
| `409` | register | Username or contact number already taken |
| `409` | setAdmin, clearAdmin | Already in the requested admin state |
| `429` | login, register | (From the rate limiters) Too many attempts |
| `500` | all except logout | Unexpected server error |

---


## 12. REFERENCES


<!-- ## 12. Known Gaps & Housekeeping

### Gap 1: Plaintext passwords (development)

The header says passwords are stored as **plaintext in development**. This is fine for local testing, but:

- **Before going live**, make sure `isDevelopment` is `false` in the deployed environment, so `hashPassword` actually hashes.
- Accounts created while in plaintext mode store a value that isn't a bcrypt hash. In production, `/login` sends them to `bcrypt.compare()`, which can't match a plaintext value, so **those accounts won't be able to log in**. Clear out dev users (or re-hash them) before deploying.
- The plaintext comparison uses `===`, which isn't timing-safe. That's acceptable for development only.

### Gap 2: `null` nested objects cause a 500 (fixed)

Destructuring defaults (`fullName = {}`) only apply when the value is `undefined`. A client sending `"fullName": null` made `fullName.firstName` throw a `TypeError`, so the user got a **500** instead of a 400.

**Fixed:** `/register` now replaces a `null` or non-object `fullName` / `contactDetails` with `{}`, so the required fields check returns a 400. See [section 6, Step 1](#step-by-step-1).

### Gap 3: The duplicate-field message assumed "username" (fixed)

Any duplicate key that wasn't `contactNumber` was reported as "That username is already taken", so a unique field added later would show the wrong message.

**Fixed:** `/register` now looks the field up in a map of messages, with a general fallback for anything not listed. See [Error handling in the catch](#error-handling-in-the-catch).

### Gap 4: Login timing revealed usernames (fixed)

When the user didn't exist, `/login` responded immediately. When they did, it ran `bcrypt.compare()`, which takes noticeably longer, so response time hinted at which usernames were real.

**Fixed:** `/login` now runs `bcrypt.compare()` against a fixed dummy hash when the user isn't found, so both failures take about the same time. See [section 5, Step 4](#step-by-step).

### Gap 5: Logout required a valid token (fixed)

Because of `checkJwtToken`, a user whose token had **expired** got a 401 from `/logout`, and the expired cookie stayed in their browser.

**Fixed:** `/logout` no longer uses `checkJwtToken`. Clearing a cookie is harmless, so anyone can call it, and it always returns 200. The log line no longer includes the user ID, because there's no verified token to read it from. See [section 7](#7-post-userslogout).

**Checked:** `cookieOptions` has no `maxAge` or `expires` (the expiry is only added inside `setTokenCookie`), and the project uses **Express 5**, which ignores both in `clearCookie`. So `clearCookie` really deletes the cookie, with no change needed.

### Gap 6: Self-service admin (accepted by design)

Any user who meets the age and account-age rules can make **themselves** an admin through `AdminRegisForm`. This is **intentional** for this project: Notes Nest is a portfolio/dev project with no "super admin" to approve requests, so the rules in `schemaUtil` (21+, minimum account age) are the only gate.

In a real production app, admin rights would normally be granted by an existing admin, or need approval. That would mean making `/setAdmin` admin-only with a target user ID, plus a frontend screen for promoting users.

### Gap 7: `checkPassword` / `hashPassword` run before the type checks (not an issue)

The route's `typeof password === 'string'` check runs **after** both password middlewares, so the concern was that a missing or non-string `password` could reach `bcrypt.hash()` and cause a 500.

**Checked:** `checkPassword` runs first and returns a **400** ("Password is required.") when the password isn't a string, so `hashPassword` only ever sees a string. The one odd case is a register request with no `password` but a valid `newPassword`: both middlewares pass, but the route's required fields check still returns a 400. There's no path to a 500, so no code change was needed.

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
| 98 vs. 243, 271 | `/login` returns the user object directly; `/setAdmin` and `/clearAdmin` wrap it in `{ message, user }` | It works, but the frontend has to handle two shapes. Consider making them consistent. | -->
