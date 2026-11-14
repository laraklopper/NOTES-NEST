# USER ROUTES - [`userRoutes.js`](../server/routes/userRoutes.js) BREAKDOWN

[`userRoutes.js`](../server/routes/userRoutes.js) is the Express router for **user accounts after sign-in**: a user reading and editing their own profile, changing their password, and the **admin-only** Users page (listing users, viewing one, and removing one along with all their data).

Signing in, registering, logging out and switching admin status on or off live in [`authRoutes.js`](../server/routes/authRoutes.js) (see [AUTH_ROUTES.md](AUTH_ROUTES.md)).

| Router | Handles |
|---|---|
| `authRoutes.js` | Login, register, logout, setAdmin, clearAdmin |
| `userRoutes.js` | Own profile, own password, admin user management |

---

## TABLE OF CONTENTS
1. [ROUTE SUMMARY](#1-route-summary)
     - [1.1. GET `/me`](#11-get-me)
     - [1.2. GET `/fetchUsers` (admin)](#12-get-fetchusers-admin)
     - [1.3. GET `/fetchUser/:id` (admin)](#13-get-fetchuserid-admin)
     - [1.4. PATCH `/editProfile`](#14-patch-editprofile)
     - [1.5. PATCH `/editPassword`](#15-patch-editpassword)
     - [1.6. DELETE `/deleteUser/:id` (admin)](#16-delete-deleteuserid-admin)
2. [IMPORTS AND SETUP](#2-imports-and-setup)
3. [SCHEMAS AND UTILITY FUNCTIONS](#3-schemas-and-utility-functions)
     - [3.1. SCHEMAS](#31-schemas)
          - [3.1.1. USER SCHEMA](#311-user-schema-userschemajs)
     - [3.2. UTILITY FUNCTIONS](#32-utility-functions)
4. [SECURITY](#4-security)
     - [4.1. PACKAGES](#41-packages)
     - [4.2. MIDDLEWARE](#42-middleware)
     - [4.3. ACCESS LEVELS](#43-access-levels)
5. [STATUS CODE REFERENCES](#5-status-code-references)
6. [KNOWN GAPS AND HOUSE KEEPING](#6-known-gaps-and-house-keeping)
     - [6.1. GAPS](#61-gaps)
     - [6.2. HOUSE KEEPING](#62-house-keeping)
7. [REFERENCES](#7-references)

- *View [GLOSSARY.md](../GLOSSARY.md) for terminology*

---

<!-- SECTION 1 -->
## 1. ROUTE SUMMARY

The router is mounted at **`/user`** by `app.js` (e.g. `GET /user/me`), as the header comment in `userRoutes.js` says. The paths below are relative to that mount point.

| Method | Path | Middleware | Who | Purpose |
|---|---|---|---|---|
| `GET` | `/me` | `checkJwtToken` | Any user | Own profile (used by `App.js` for `currentUser`, and by Settings) |
| `GET` | `/fetchUsers` | `checkJwtToken`, `checkAdmin` | **Admin** | All users, for the Users table |
| `GET` | `/fetchUser/:id` | `checkJwtToken`, `checkAdmin` | **Admin** | One non-admin user, for the details panel |
| `PATCH` | `/editProfile` | `checkJwtToken` | Any user | Update own profile and default languages |
| `PATCH` | `/editPassword` | `checkJwtToken`, `checkPasswordChange`, `checkPassword`, `passwordUpdateRateLimiter`, `hashPassword` | Any user | Change own password (signs out other sessions) |
| `DELETE` | `/deleteUser/:id` | `checkJwtToken`, `checkAdmin` | **Admin** | Remove a non-admin user and **all** their data |

**Client side usage:**

| Method | Full Path | Frontend/Client side files |
|---|---|---|
| `GET` | `/user/me` | [App.js](../client/src/App.js), [Home.js](../client/src/pages/Home.js), [NotePad.js](../client/src/pages/NotePad.js) |
| `GET` | `/user/fetchUsers` | [App.js](../client/src/App.js), [UsersList.js](../client/src/components/UsersList.js) |
| `GET` | `/user/fetchUser/:id` | [UsersList.js](../client/src/components/UsersList.js) ("View" button) |
| `PATCH` | `/user/editProfile` | [Home.js](../client/src/pages/Home.js) (EditProfile form) |
| `PATCH` | `/user/editPassword` | [EditPassword.js](../client/src/components/EditPassword.js) |
| `DELETE` | `/user/deleteUser/:id` | [UsersList.js](../client/src/components/UsersList.js) (details panel) |

---

### 1.1. GET `/me`

**Purpose:** Return the signed-in user's own profile. `App.js` calls it on load to fill `currentUser` (this is how the app "remembers" a login, since the JWT itself is in an HTTP-only cookie that JavaScript can't read). The Settings page also uses it.

```js
const user = await User.findById(req.user.id)
    .select('-password')// Never send the password, even hashed
    .exec();
```

| Result | Response |
|---|---|
| Found | `200` + the user object (everything except the password) |
| Account deleted or session signed out | `401` from `checkJwtToken` (see [4.2. MIDDLEWARE](#42-middleware)) |
| Not found (rare: the account was removed between the token check and this lookup) | `404 { message: 'User not found' }` |
| Exception | `500 { message: 'An error occurred while fetching the current user' }` |

**Response (200):**

```json
{
  "_id": "6731...",
  "username": "username",
  "fullName": { "firstName": "user", "lastName": "one" },
  "contactDetails": { "email": "user@example.com", "contactNumber": "+27821234567" },
  "dateOfBirth": "1995-04-12T00:00:00.000Z",
  "defaultLanguages": { "defaultSourceLanguage": "af", "defaultTargetLanguage": "en", "defaultNoteLanguage": "en" },
  "admin": false,
  "adminDataConsent": true,
  "tokenVersion": 0,
  "createdAt": "...",
  "updatedAt": "..."
}
```

**Logging:** only the user ID is logged (`Fetched profile: <id>`), never the email, phone number or date of birth. Under **POPIA**, logging is processing, so personal information isn't written to the server logs.

---

### 1.2. GET `/fetchUsers` (admin)

**Purpose:** The admin Users page table (`UsersList.js`).

```js
const users = await User.find()// Every user
    .select('-password')// No passwords
    .sort({ createdAt: -1 })// Newest accounts first
    .exec();
```

**Response (200):** a **plain array** of user objects (the same shape as `/me`).

```json
[ { "_id": "...", "username": "...", "...": "..." }, { "...": "..." } ]
```

| Detail | Note |
|---|---|
| Includes admins | Yes. This list shows **all** accounts, but `/fetchUser/:id` refuses admins. `UsersList.js` disables "View" on admin rows (with an aria-label explaining why), and a footer row notes that admin users can't be viewed or removed. |
| Pagination | None. Every user is returned at once (see [Gap 2](#gap-2-no-pagination-on-fetchusers)). |
| Consent | Registration requires `adminDataConsent: true`, so every listed user has agreed to admins seeing their details |
| Errors | A `500` returns only `{ message: 'Internal Server Error' }`. `error.message` is logged on the server, never sent, because it can contain database details. |

---

### 1.3. GET `/fetchUser/:id` (admin)

**Purpose:** One user's details for the details panel on the Users page.

```
isValid(id)? ──── no ──► 400 "Invalid user id"
     ▼
User.findById(id).select('-password')
     ▼
Not found? ──────────► 404 "User not found"
Is an admin? ────────► 403 "Admin accounts cannot be viewed."
     ▼
200 user
```

The **admin check comes after the lookup**, because the route needs the document to know whether it's an admin. The refusal is logged with `console.warn` (not `error`), since it's an expected refusal, not a failure.

**Response (200):** the user object (the same shape as `/me`).

---

### 1.4. PATCH `/editProfile`

**Purpose:** Update the signed-in user's profile from the EditProfile form. **Only fields that are sent and not blank change.** A field left blank on the form keeps its current value.

#### Request body (any combination)

```json
{
  "username": "username",
  "fullName": { "firstName": "user", "lastName": "one" },
  "contactDetails": { "email": "user@example.com", "contactNumber": "082 123 4567" },
  "defaultSourceLang": "af",
  "defaultTargetLang": "en",
  "defaultNoteLang": "en"
}
```

What **can't** be changed here: password (`/editPassword`), admin status (`/setAdmin`, `/clearAdmin`), date of birth, consent.

#### Step 1: Flatten the body

```js
const safeFullName = fullName && typeof fullName === 'object' ? fullName : {};
const safeContact = contactDetails && typeof contactDetails === 'object' ? contactDetails : {};

const submitted = {
    username,
    firstName: safeFullName.firstName,
    lastName: safeFullName.lastName,
    email: safeContact.email,
    contactNumber: safeContact.contactNumber,
    defaultSourceLang, defaultTargetLang, defaultNoteLang
};
```

The nested request (`fullName.firstName`) becomes **one flat key per editable field**, so all fields can be filtered and mapped the same way.

`safeFullName` / `safeContact` exist because the `= {}` destructuring default only applies to `undefined`. Without them, `"fullName": null` would make `fullName.firstName` throw (a **500**). Now that request gets the normal 400 "Please change at least one field".

#### Step 2: Filter and map to schema paths

```js
const updates = Object.entries(submitted)
    .filter(([, value]) => typeof value === 'string' && value.trim())// Non-empty strings only
    .map(([field, value]) => [EDITABLE_PROFILE_FIELDS[field], value.trim()]);// Form field → schema path
```

**Example:**

```
submitted:  { username: 'username', firstName: '', email: { $gt: '' }, defaultNoteLang: 'af' }

.filter     → [['username', 'user'], ['defaultNoteLang', 'af']]
              ('' is blank, so dropped; { $gt: '' } isn't a string, so dropped)

.map        → [['username', 'user'], ['defaultLanguages.defaultNoteLanguage', 'af']]
```

The form field → schema path map is [`EDITABLE_PROFILE_FIELDS`](#32-utility-functions).

**Security:** only the **eight keys built in `submitted`** can ever be updated. Sending `{ "admin": true }` or `{ "password": "x" }` does nothing, because those keys are never read from the body. This protects against **mass assignment**.

**Note:** because blank values are dropped, a field **can't be cleared** through this route. That's fine here, because every editable field is required.

#### Step 3: Nothing to update?

```js
if (updates.length === 0) → 400 "Please change at least one field before updating your profile"
```

#### Step 4: Load the user

```js
const user = await User.findById(userId).exec();// Not found → 404
```

#### Step 5: Source ≠ target language

```js
const trimmedLang = (value) => (typeof value === 'string' ? value.trim() : '');
const newSourceLang = trimmedLang(defaultSourceLang);
const newTargetLang = trimmedLang(defaultTargetLang);
const sourceLang = newSourceLang || user.defaultLanguages?.defaultSourceLanguage;// New value, or current
const targetLang = newTargetLang || user.defaultLanguages?.defaultTargetLanguage;
if ((newSourceLang || newTargetLang) && sourceLang === targetLang) → 400
```

This compares the **result after the update**: a new value if one was sent, otherwise the current one. The values are **trimmed** first (the same values Step 6 saves), so `" af"` and `"af"` count as a match. Non-strings count as "not sent", matching the Step 2 filter, so `{ "$gt": "" }` can't make `.trim()` throw.

| Current | Sent | Result |
|---|---|---|
| `af → en` | `defaultTargetLang: 'af'` | `af → af` ❌ 400 |
| `af → en` | `defaultSourceLang: 'zu'` | `zu → en` ✅ |
| `af → en` | Only `username` | Skipped (no language sent) |

This **can't** be a schema validator on one field, because it compares **two** fields.

#### Step 6: Set and save (rather than `findByIdAndUpdate`)

```js
updates.forEach(([path, value]) => user.set(path, value));// Dotted paths work: 'fullName.firstName'
await user.save({ validateModifiedOnly: true });
```

| Why `.set()` + `.save()` | |
|---|---|
| **Save hooks run** | The `userSchema` **pre-validate** hook normalises the data: lowercases the username and email, and converts the phone number to `+27` format. `findByIdAndUpdate` **skips** document hooks. |
| **Validators run** | `.save()` always validates. Update queries only do so with `runValidators`. |
| `validateModifiedOnly: true` | Validates **only the changed fields**. If schema rules got stricter after an older account registered, that account can still edit its name without being blocked by an unrelated field. |

#### Step 7: Respond

```js
const updatedUser = user.toJSON();
delete updatedUser.password;// Belt and braces: password is select:false, but never send it
return res.status(200).json({ message: 'Profile updated successfully', user: updatedUser });
```

The response contains the **saved** values, after normalisation (e.g. `username: "username"`, `contactNumber: "+27821234567"`), so the UI should update from `user`, not from what was typed.

**The JWT doesn't need re-issuing:** `setTokenCookie` only signs `{ id, isAdmin, tokenVersion }`, none of which this route can change. If profile fields are ever added to the token payload, `/editProfile` should call `setTokenCookie(res, user)` after saving.

#### Errors

| Error | Status | Message |
|---|---|---|
| Nothing to update | `400` | "Please change at least one field..." |
| Source = target | `400` | "Default source and target languages must be different" |
| `ValidationError` | `400` | The first schema message (e.g. invalid SA phone number) |
| Duplicate (`11000`) | `409` | A message for the duplicated field ("That username is already taken", "That contact number is already registered", "That email is already registered"), or a general fallback |
| User not found | `404` | "User not found" |
| Anything else | `500` | "Internal Server Error" |

---

### 1.5. PATCH `/editPassword`

**Purpose:** Change the signed-in user's password. The **current password must be confirmed**, so someone using an unattended logged-in browser can't lock the owner out.

#### Request body

```json
{ "currentPassword": "OldP@ss1", "newPassword": "NewP@ss2!" }
```

#### Middleware chain

```
checkJwtToken ──► checkPasswordChange ──► checkPassword ──► passwordUpdateRateLimiter ──► hashPassword ──► handler
     │                   │                      │                      │                         │
   401              400 missing or         400 weak new          429 after 3              newPassword is now
                    invalid fields          password             attempts/hour            a bcrypt hash
                                                                                          (plaintext in development)
```

By the time the handler runs, **`req.body.newPassword` is already hashed**. `currentPassword` is still plaintext, as typed.

The rate limiter sits **after** the form checks, so a mistyped or weak new password doesn't use up one of the 3 attempts, and **before** the handler compares the current password, so every guess is counted.

#### Step 1: Load the user, **with** the password

```js
const user = await User.findById(userId).select('+password').exec();
```

`password` is `select: false` in the schema, so `+password` is needed to compare it.

#### Step 2: Check the current password

```js
const isHashed = /^\$2[aby]\$/.test(user.password);
const isCurrentValid = isDevelopment && !isHashed
    ? currentPassword === user.password// Development plaintext account
    : await bcrypt.compare(currentPassword, user.password);// Normal bcrypt check
```

This is **the same logic as `/login`** in `authRoutes.js`, so a password that logs in also passes here.

#### Step 3: 400, not 401, for a wrong current password

```js
if (!isCurrentValid) return res.status(400).json({ message: 'Current password is incorrect' });
```

**Why not 401?** The frontend treats **401 as "session expired"** and logs the user out. Typing the wrong current password shouldn't log anyone out, so the route uses 400.

#### Step 4: Save and sign out other sessions

```js
user.password = newPassword;// Already hashed by the middleware
user.tokenVersion = (user.tokenVersion ?? 0) + 1;// Invalidate every token issued before this change
await user.save({ validateModifiedOnly: true });// Validate only the changed fields
setTokenCookie(res, user);// New cookie for this session; every other session is signed out
```

Increasing `tokenVersion` means `checkJwtToken` rejects every older token, so an attacker's session doesn't survive a password change (see [4.2. MIDDLEWARE](#42-middleware)).

**Response (200):** `{ "message": "Password changed successfully" }`, plus a fresh `token` cookie. The password (hashed or not) is never returned.

---

### 1.6. DELETE `/deleteUser/:id` (admin)

**Purpose:** An admin **permanently** removes a user **and everything they own**. This can't be undone.

#### Flow

```
isValid(id)? ─── no ─► 400
     ▼
User.findById(id).select('username admin')// Only the fields the checks need
     ▼
Not found? ──────────► 404
Is an admin? ────────► 403 "Admin accounts cannot be removed."
     ▼
Promise.all([
    Note.deleteMany({ user: id }),
    Notebook.deleteMany({ user: id }),
    Tag.deleteMany({ user: id }),
    Translation.deleteMany({ user: id })
])
     ▼
User.deleteOne({ _id: id })// The account LAST
     ▼
200 { message, user: { _id, username } }
```

#### Why the data is deleted first and the account last

```
Data first, account last (this code):
  deleteMany fails ──► account still exists ──► admin retries ──► the rest is cleaned up ✅

Account first (the wrong order):
  account deleted, deleteMany fails ──► orphaned notes/tags with no owner,
                                        and no account left to retry against ❌
```

Every step is **idempotent** (running `deleteMany` again on data that's already gone deletes 0 and succeeds), so a retry is always safe.

#### Why `Promise.all`

The four collections don't depend on each other, so they're deleted **in parallel**. Destructuring the results gives the `deletedCount` for each, and those go into the **audit log**:

```
[SUCCESS: userRoutes.js, DELETE /deleteUser/:id] Removed johndoe (6731...) by admin_user: 42 notes, 3 notebooks, 11 tags, 18 translations
```

`req.adminUser.username` (set by `checkAdmin`) records **which admin** removed the account.

#### Why the notebook and tag hooks don't matter here

`deleteMany` **doesn't** run the `findOneAndDelete` hooks that `$pull` tags from notes or unset notebooks. That's fine here, because the user's **notes are deleted too**, so there's nothing left to clean up.

#### What happens to the removed user's session

Their JWT is still validly signed, but `checkJwtToken` looks the account up on every request. Once the account is gone it clears the cookie and returns **401**, so the removed user can't keep creating data.

**Response (200):**

```json
{ "message": "User removed", "user": { "_id": "6731...", "username": "johndoe" } }
```

---

<!-- SECTION 2 IMPORTS AND SETUP-->
## 2. IMPORTS AND SETUP

```js
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/userSchema');
const Note = require('../models/noteSchema');
const Notebook = require('../models/notebookSchema');
const Tag = require('../models/tagSchema');
const Translation = require('../models/translationSchema');
const router = express.Router();
const { checkPassword, checkPasswordChange, hashPassword, isDevelopment } = require('../middleware/passwordMiddleware');
const { checkJwtToken, setTokenCookie } = require('../middleware/securityMiddleware');
const { checkAdmin } = require('../middleware/adminMiddleware');
const { EDITABLE_PROFILE_FIELDS } = require('../util/userUtil');
const { passwordUpdateRateLimiter } = require('../middleware/rateLimitMiddleware');
```

There's no `require('dotenv').config()` here: `app.js` loads it before requiring the routes, and this file reads no environment variables itself.

| Import | From | Used For |
|---|---|---|
| `express` | npm | Creates the `router` |
| `mongoose` | npm | `mongoose.Types.ObjectId.isValid()` for `:id` |
| `bcrypt` | npm (`bcryptjs`) | `/editPassword`: compares the **current** password with the stored hash |
| `User` | `models/userSchema` | The model this router manages |
| `Note`, `Notebook`, `Tag`, `Translation` | `models/` | `/deleteUser/:id`: deletes all of the user's data |
| `checkJwtToken` | `securityMiddleware` | Verifies the JWT cookie and sets `req.user` |
| `setTokenCookie` | `securityMiddleware` | `/editPassword`: issues a fresh cookie carrying the new `tokenVersion` |
| `checkAdmin` | `adminMiddleware` | Only lets admins through; sets **`req.adminUser`** (used in the delete log) |
| `checkPasswordChange` | `passwordMiddleware` | `/editPassword`: checks that `currentPassword` and `newPassword` are present, are strings, and differ |
| `checkPassword` | `passwordMiddleware` | `/editPassword`: password strength rules on `newPassword` |
| `hashPassword` | `passwordMiddleware` | `/editPassword`: replaces `newPassword` with its bcrypt hash (plaintext in development) |
| `isDevelopment` | `passwordMiddleware` | `/editPassword`: plaintext comparison for development accounts |
| `passwordUpdateRateLimiter` | `rateLimitMiddleware` | `/editPassword`: 3 attempts per hour per IP |
| `EDITABLE_PROFILE_FIELDS` | `util/userUtil` | `/editProfile`: maps form fields to schema paths (an **allowlist**) |

---

<!-- SECTION 3: SCHEMAS AND UTILITY FUNCTIONS-->
## 3. SCHEMAS AND UTILITY FUNCTIONS

### 3.1. SCHEMAS

`Note`, `Notebook`, `Tag` and `Translation` are only used by `/deleteUser/:id` (`deleteMany({ user: id })`). Their schemas are covered in [NOTE_ROUTES.md](NOTE_ROUTES.md), [NOTEBOOK_ROUTES.md](NOTEBOOK_ROUTES.md), [TAG_ROUTES.md](TAG_ROUTES.md) and [TRANSLATION_ROUTES.md](TRANSLATION_ROUTES.md).

#### 3.1.1. USER SCHEMA ([userSchema.js](../server/models/userSchema.js))

| Field | Type | Rules | Changed by |
|---|---|---|---|
| `username` | String | Required, **unique**, 3–30 chars, letters/numbers/underscores only; lowercased by the pre-validate hook | `/editProfile` |
| `fullName.firstName` | String | Required, 2–50 chars | `/editProfile` |
| `fullName.lastName` | String | Required, 3–50 chars | `/editProfile` |
| `contactDetails.email` | String | Required, lowercased, must match `emailRegex` | `/editProfile` |
| `contactDetails.contactNumber` | String | Required, **unique**, must match `phoneRegex` (SA mobile); normalised to `+27...` | `/editProfile` |
| `dateOfBirth` | Date | Required, not in the future, at least 13 years old | Registration only |
| `defaultLanguages.defaultSourceLanguage` | String | Default `'auto'`; `'auto'` or a Langbly language code | `/editProfile` |
| `defaultLanguages.defaultTargetLanguage` | String | Default `'fr'`; a Langbly language code (no `'auto'`) | `/editProfile` |
| `defaultLanguages.defaultNoteLanguage` | String | Default `'en'`; a Langbly language code | `/editProfile` |
| `password` | String | Required, 8–1024 chars, **`select: false`** | `/editPassword` |
| `adminDataConsent` | Boolean | Required, must be `true` | Registration only |
| `admin` | Boolean | Default `false` | `/setAdmin`, `/clearAdmin` (`authRoutes.js`) |
| `tokenVersion` | Number | Default `0`; signed into every JWT | `/editPassword` (incremented) |
| `createdAt`, `updatedAt` | Date | `timestamps: true` | Mongoose |

**What this router relies on:**

| Schema feature | Used by | Effect |
|---|---|---|
| `password: { select: false }` | All routes | The password is left out of every query unless asked for with `.select('+password')` (only `/editPassword` does) |
| `pre('validate')` normalisation hook | `/editProfile` | Lowercases `username` and `email`, and converts `082...` to `+2782...` before the unique checks run. Only runs on `.save()`, which is why `/editProfile` doesn't use `findByIdAndUpdate`. |
| `unique` on `username` and `contactNumber` | `/editProfile` | A clash throws error code `11000`, which the route turns into a `409` |
| Language `enum`s (built from `languageData`) | `/editProfile` | An unknown language code is a `ValidationError` → `400` |
| `tokenVersion` | `/editPassword`, `checkJwtToken` | Increasing it signs out every existing session |
| Virtuals `fullNameString`, `contactDetailsString` | — | Included in responses (`toJSON: { virtuals: true }`) but not used by this router |

### 3.2. UTILITY FUNCTIONS

#### `EDITABLE_PROFILE_FIELDS` ([userUtil.js](../server/util/userUtil.js))

```js
const EDITABLE_PROFILE_FIELDS = {
    username: 'username',
    firstName: 'fullName.firstName',
    lastName: 'fullName.lastName',
    email: 'contactDetails.email',
    contactNumber: 'contactDetails.contactNumber',
    defaultSourceLang: 'defaultLanguages.defaultSourceLanguage',
    defaultTargetLang: 'defaultLanguages.defaultTargetLanguage',
    defaultNoteLang: 'defaultLanguages.defaultNoteLanguage'
};
```

Maps each flat field built by `/editProfile` to its dotted path in `userSchema`, which `user.set(path, value)` accepts. `dateOfBirth`, `password`, `adminDataConsent` and `admin` are **left out on purpose**, so they can't be changed by adding them to the request body.

#### Inline helpers in `userRoutes.js`

| Helper | Route | Purpose |
|---|---|---|
| `trimmedLang(value)` | `/editProfile` | Returns the trimmed string, or `''` for non-strings, so the source ≠ target check compares the same values that get saved |
| `safeFullName` / `safeContact` | `/editProfile` | Treat `null` or non-object `fullName` / `contactDetails` as `{}` |

---

<!-- SECTION 4: ROUTER SECURITY -->
## 4. SECURITY

### 4.1. PACKAGES

| Package | Where | Security role |
|---|---|---|
| `bcryptjs` | `userRoutes.js`, `passwordMiddleware.js` | Hashes new passwords (10 salt rounds) and compares the current password against the stored hash |
| `jsonwebtoken` | `securityMiddleware.js` | Signs and verifies the session JWT (`{ id, isAdmin, tokenVersion }`) |
| `express-rate-limit` | `rateLimitMiddleware.js` | `passwordUpdateRateLimiter`: limits current-password guessing |
| `mongoose` | `userRoutes.js` | `ObjectId.isValid()` rejects malformed `:id` values before they reach a query |

### 4.2. MIDDLEWARE

| Middleware | File | Routes | What it does |
|---|---|---|---|
| `checkJwtToken` | [securityMiddleware.js](../server/middleware/securityMiddleware.js) | All | Reads the HTTP-only `token` cookie and verifies it, then loads the account's `tokenVersion`. Returns **401** (and clears the cookie) if there's no token, it's invalid or expired, the account was deleted, or the token's version is out of date. A database failure during the lookup returns **500**, not 401, so a DB hiccup doesn't sign everyone out. Sets `req.user`. |
| `checkAdmin` | [adminMiddleware.js](../server/middleware/adminMiddleware.js) | `/fetchUsers`, `/fetchUser/:id`, `/deleteUser/:id` | Loads the account (`username admin`) and returns **403** if `admin !== true`. Sets `req.adminUser`. |
| `checkPasswordChange` | [passwordMiddleware.js](../server/middleware/passwordMiddleware.js) | `/editPassword` | **400** unless both passwords are non-empty strings (so they can't inject query operators) and the new one differs from the current one |
| `checkPassword` | [passwordMiddleware.js](../server/middleware/passwordMiddleware.js) | `/editPassword` | **400** unless `newPassword` is at least 8 characters with one special character |
| `passwordUpdateRateLimiter` | [rateLimitMiddleware.js](../server/middleware/rateLimitMiddleware.js) | `/editPassword` | **429** after 3 attempts per hour per IP |
| `hashPassword` | [passwordMiddleware.js](../server/middleware/passwordMiddleware.js) | `/editPassword` | Replaces `newPassword` with its bcrypt hash (skipped in development, so passwords stay plaintext) |

### 4.3. ACCESS LEVELS

```
Request
   │
   ▼
checkJwtToken ──► 401 if no token, an invalid or expired one, a deleted account,
   │                or a signed-out session (sets req.user = { id, isAdmin, tokenVersion })
   ├── user routes: /me, /editProfile, /editPassword
   │      act ONLY on req.user.id (the user can only touch their own account)
   │
   ▼
checkAdmin ─────► 403 if the user isn't an admin
   │                (sets req.adminUser)
   └── admin routes: /fetchUsers, /fetchUser/:id, /deleteUser/:id
          act on :id from the URL (any NON-admin user)
```

| Rule | Where | Why |
|---|---|---|
| User routes take the ID from the **token**, never the body or URL | `/me`, `/editProfile`, `/editPassword` | A user can't read or edit another account |
| Admin routes take the ID from the **URL** | `/fetchUser/:id`, `/deleteUser/:id` | Admins manage other users |
| Admin accounts can't be viewed or removed through the admin routes | `/fetchUser/:id`, `/deleteUser/:id` | Admins can't spy on or remove each other, and an admin **can't delete themselves** |
| Only allowlisted fields can be edited | `/editProfile` | Blocks mass assignment (`admin`, `password`, etc.) |
| Passwords are never returned | All | `select: false` in the schema, `.select('-password')` in queries, and `delete updatedUser.password` in `/editProfile` |
| Errors return a generic `500` message | All | Internal error details are only logged on the server |

---

<!-- SECTION 5 -->
## 5. STATUS CODE REFERENCES

| Code | Route(s) | When |
|---|---|---|
| `200` | all | Success |
| `400` | fetchUser, deleteUser | `:id` isn't a valid ObjectId |
| `400` | editProfile | Nothing to update, source = target, schema validation |
| `400` | editPassword | (From the middleware) missing, matching or weak passwords; **current password incorrect**; schema validation |
| `401` | all | (From `checkJwtToken`) No token, an invalid or expired one, the account was deleted, or the session was signed out by a password change |
| `403` | fetchUsers, fetchUser, deleteUser | (From `checkAdmin`) Not an admin |
| `403` | fetchUser, deleteUser | The target account is an admin |
| `404` | me, fetchUser, editProfile, editPassword, deleteUser | User not found |
| `409` | editProfile | A unique field (username, contact number) is already registered |
| `429` | editPassword | (From `passwordUpdateRateLimiter`) More than 3 attempts in an hour |
| `500` | all | Unexpected error, including a failed user lookup in `checkJwtToken` |

---

<!-- SECTION 6 -->
## 6. KNOWN GAPS AND HOUSE KEEPING

### 6.1. GAPS

#### Gap 1: Email isn't unique

`contactDetails.email` has no `unique: true` in `userSchema.js`, so two accounts can register with the same email. `/editProfile` has a `409` message for a duplicate email ("That email is already registered"), but it can never fire, because MongoDB never raises a duplicate key error for that field.

**Fix:** add `unique: true` to `contactDetails.email` (any existing duplicates must be cleaned up before MongoDB can build the index).

#### Gap 2: No pagination on `/fetchUsers`

Every user is returned in one response. This is fine for a small user base, but the response and the Users table grow with every account.

#### Gap 3: First-name validation message doesn't match the rule

`fullName.firstName` has `minlength: [2, 'First name must be at least 3 characters long']`. A one-character name gets a message asking for 3 characters, while a two-character name is accepted.

**Fix:** change the message to "at least 2 characters", or the limit to 3.

### 6.2. HOUSE KEEPING

| Issue | Where | Change |
|---|---|---|
| "Conditional rendering" comments (a React UI term) are still there | `userRoutes.js`: `/editProfile` (two), `/editPassword` (one) | Change to "Guard clause: check ...", like the other routes in the file |
| The mount comment lists only two routes | `app.js`: `app.use('/user', userRoutes);// /user/me, /user/fetchUsers` | List all six, or point to the header comment in `userRoutes.js` |
| "Langauge" typo | `userSchema.js` comments on `defaultSourceLanguage` / `defaultTargetLanguage` | "Language" |

---

<!-- SECTION 7: REFERENCES -->
## 7. REFERENCES

**Project files**

- [userRoutes.js](../server/routes/userRoutes.js)
- [userSchema.js](../server/models/userSchema.js)
- [userUtil.js](../server/util/userUtil.js), [schemaUtil.js](../server/util/schemaUtil.js)
- [securityMiddleware.js](../server/middleware/securityMiddleware.js), [adminMiddleware.js](../server/middleware/adminMiddleware.js), [passwordMiddleware.js](../server/middleware/passwordMiddleware.js), [rateLimitMiddleware.js](../server/middleware/rateLimitMiddleware.js)
- [AUTH_ROUTES.md](AUTH_ROUTES.md), [GLOSSARY.md](../GLOSSARY.md)

**External documentation**

- [Express: Routing](https://expressjs.com/en/guide/routing.html)
- [Mongoose: Middleware (hooks)](https://mongoosejs.com/docs/middleware.html)
- [Mongoose: Validation](https://mongoosejs.com/docs/validation.html)
- [Mongoose: `Document.prototype.save()`](https://mongoosejs.com/docs/api/document.html#Document.prototype.save())
- [bcrypt.js](https://github.com/dcodeIO/bcrypt.js)
- [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken)
- [express-rate-limit](https://github.com/express-rate-limit/express-rate-limit)
- [OWASP: Mass Assignment Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Mass_Assignment_Cheat_Sheet.html)
- [MDN: HTTP response status codes](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status)
- [POPIA (Protection of Personal Information Act)](https://popia.co.za/)
