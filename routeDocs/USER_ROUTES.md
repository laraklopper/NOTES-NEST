# USER ROUTES - [`userRoutes.js`](../server/routes/userRoutes.js) BREAKDOWN

[`userRoutes.js`](../server/routes/userRoutes.js) is the Express router for **user accounts after sign-in**: a user reading and editing their own profile, changing their password, and the **admin-only** Users page (listing users, viewing one, and removing one along with all their data).

Signing in, registering, logging out and switching admin status on or off live in [`authRoute.js`](../server/routes/authRoutes.js),

| Router | Handles |
|---|---|
| `authRoutes.js` | Login, register, logout, setAdmin, clearAdmin |
| `userRoutes.js`| Own profile, own password, admin user management |

---

## TABLE OF CONTENTS
1. [ROUTE SUMMARY](#1-route-summary)
     - [1.1. GET '/me'](#11-get-me)
     - [1.2. GET `/fetchUsers` (admin)](#12-get-fetchusers-admin)
     <!-- list all -->
2. [IMPORTS AND SETUP](#2-imports-and-setup)
3. [SCHEMAS AND UTILITY FUNCTIONS](#3-schemas-and-utility-functions)
     - [3.1. SCHEMAS](#31-schemas)
          - [3.1.1. USER SCHEMA](#311-user-schema-userschemajs)
     - [3.2. UTILITY FUNCTIONS](#32-utility-functions)
4. [SECURITY](#4-security)
     - [4.1.]
     - [4.2.]
5. [STATUS CODE REFERERENCES](#5-status-code-refererences)
6. [KNOWN GAPS AND HOUSE KEEPING](#6-known-gaps-and-house-keeping)
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

---
### 1.1. GET `/me`

<!-- PURPOSE: WHAT THE ROUTE DOES -->
**Purpose:** Return the signed-in user's own profile. `App.js` calls it on load to fill `currentUser` (this is how the app "remembers" a login, since the JWT itself is in an HTTP-only cookie that JavaScript can't read). The Settings page also uses it.

```js
const user = await User.findById(req.user.id)
    .select('-password')// Never send the password, even hashed
    .exec();
```


| Result | Response |
|---|---|
| Found | `200` + the user object (everything except the password) |
| Account deleted or session signed out | `401` from `checkJwtToken` (see [Gap 4](#gap-4-a-deleted-users-token-still-works-fixed)) |
| Not found (rare: the account was removed between the token check and this lookup) | `404 { message: 'User not found' }` |
| Exception | `500 { message: 'An error occurred while fetching the current user' }` |

**Response (200):**

```json
{
  "_id": "6731...",
  "username": "larak",
  "fullName": { "firstName": "Lara", "lastName": "K" },
  "contactDetails": { "email": "lara@example.com", "contactNumber": "+27821234567" },
  "dateOfBirth": "1995-04-12T00:00:00.000Z",
  "defaultLanguages": { "defaultSourceLanguage": "af", "defaultTargetLanguage": "en", "defaultNoteLanguage": "en" },
  "admin": false,
  "adminDataConsent": true,
  "tokenVersion": 0,
  "createdAt": "...",
  "updatedAt": "..."
}
```

<!-- Errors use a **`message`** key, the same as every other route (see [Gap 2](#gap-2-inconsistent-error-shapes-fixed)). -->

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
| Includes admins | Yes. This list shows **all** accounts, but `/fetchUser/:id` refuses admins (the table disables "View" on admin rows; see [Gap 6](#gap-6-admins-are-listed-but-cant-be-opened-fixed)) |
| Pagination | None. Every user is returned at once. |
| Consent | Registration requires `adminDataConsent: true`, so every listed user has agreed to admins seeing their details |

---

### 1.3. `GET`  `/fetchUser/:id`
### 1.4. PATCH `/editProfile`


### 1.5. PATCH `/editPassword`

### 1.6. DELETE `/deleteUser/:id`


---


<!-- SECTION 2 IMPORTS AND SETUP-->
## 2. IMPORTS AND SETUP

```js
require('dotenv').config()
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/userSchema');
const Note = require('../models/noteSchema');
const Notebook = require('../models/notebookSchema');
const Tag = require('../models/tagSchema');
const Translation = require('../models/translationSchema');
const { checkPassword, checkPasswordChange, hashPassword, isDevelopment } = require('../middleware/passwordMiddleware')
const { checkJwtToken } = require('../middleware/securityMiddleware')
const { checkAdmin } = require('../middleware/adminMiddleware')
const { EDITABLE_PROFILE_FIELDS } = require('../util/userUtil');
```

| Import | Used For |
|---|---|
|`require('dotenv').config()`| |
| `mongoose` | `ObjectId.isValid()` for `:id` |
| `bcrypt` | `/editPassword`: compares the **current** password with the stored hash |
| `User` | The model this router manages |
| `Note`, `Notebook`, `Tag`, `Translation` | `/deleteUser/:id`: deletes all of the user's data |
| `checkJwtToken` | Verifies the JWT cookie and sets `req.user` |
| `checkAdmin` | Only lets admins through; sets **`req.adminUser`** (used in the delete log) |
| `checkPasswordChange` | `/editPassword`: checks that `currentPassword` and `newPassword` are present and valid |
| `checkPassword` | `/editPassword`: password strength rules on `newPassword` |
| `hashPassword` | `/editPassword`: replaces `newPassword` with its bcrypt hash (plaintext in development) |
| `isDevelopment` | `/editPassword`: plaintext comparison for development accounts |
| `EDITABLE_PROFILE_FIELDS` | `/editProfile`: maps form fields to schema paths (an **allowlist**) |

---

<!-- SECTION 3: SCHEMAS AND UTILITY FUNCTIONS-->
## 3. SCHEMAS AND UTILITY FUNCTIONS

<!-- EXPLAIN EACH SCHEMA AND UTILITY FUNCTIONS-->
### 3.1. SCHEMAS

#### 3.1.1. USER SCHEMA [userSchema.js](../server)


### 3.2. UTILITY FUNCTIONS


<!-- EXPLAIN UTILITY FUNCTIONS-->

<!-- SECTION 4: ROUTER SECURITY -->
## 4. SECURITY

<!-- EXPLAIN ROUTER SECURITY -->
### 4.1. PACKAGES

### 4.2. MIDDLEWARE

### 4.3. ACCESS LEVELS

```
Request
   │
   ▼
checkJwtToken ──► 401 if no token, or an invalid or expired one
   │                (sets req.user = { id, ... })
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

---


<!-- MOVE TO ROUTE SUMMARY -->

### 6. GET `/fetchUser/:id` (admin)

**Purpose:** One user's details for the details panel on the Users page.

#### Flow

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

The **admin check comes after the lookup**, because the route needs the document to know whether it's an admin. The result is logged with `console.warn` (not `error`), since it's an expected refusal, not a failure.

**Response (200):** the user object (the same shape as `/me`).

---

### 7. PATCH `/editProfile`

**Purpose:** Update the signed-in user's profile from the EditProfile form. **Only fields that are sent and not blank change.** A field left blank on the form keeps its current value.

#### Request body (any combination)

```json
{
  "username": "LaraK",
  "fullName": { "firstName": "Lara", "lastName": "Kruger" },
  "contactDetails": { "email": "lara@example.com", "contactNumber": "082 123 4567" },
  "defaultSourceLang": "af",
  "defaultTargetLang": "en",
  "defaultNoteLang": "en"
}
```

What **can't** be changed here: password (`/editPassword`), admin status (`/setAdmin`, `/clearAdmin`), date of birth, consent.

#### Step 1: Flatten the body

```js
const submitted = {
    username,
    firstName: fullName.firstName,
    lastName: fullName.lastName,
    email: contactDetails.email,
    contactNumber: contactDetails.contactNumber,
    defaultSourceLang, defaultTargetLang, defaultNoteLang
};
```

The nested request (`fullName.firstName`) becomes **one flat key per editable field**, so all fields can be filtered and mapped the same way.

#### Step 2: Filter and map to schema paths

```js
const updates = Object.entries(submitted)
    .filter(([, value]) => typeof value === 'string' && value.trim())// Non-empty strings only
    .map(([field, value]) => [EDITABLE_PROFILE_FIELDS[field], value.trim()]);// Form field → schema path
```

**Example:**

```
submitted:  { username: 'LaraK', firstName: '', email: { $gt: '' }, defaultNoteLang: 'af' }

.filter     → [['username', 'LaraK'], ['defaultNoteLang', 'af']]
              ('' is blank, so dropped; { $gt: '' } isn't a string, so dropped)

.map        → [['username', 'LaraK'], ['defaultLanguages.defaultNoteLanguage', 'af']]
```

`EDITABLE_PROFILE_FIELDS` (in `userUtil`) is roughly:

```js
{
    username: 'username',
    firstName: 'fullName.firstName',
    lastName: 'fullName.lastName',
    email: 'contactDetails.email',
    contactNumber: 'contactDetails.contactNumber',
    defaultSourceLang: 'defaultLanguages.defaultSourceLanguage',
    defaultTargetLang: 'defaultLanguages.defaultTargetLanguage',
    defaultNoteLang: 'defaultLanguages.defaultNoteLanguage'
}
```

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
const sourceLang = defaultSourceLang || user.defaultLanguages?.defaultSourceLanguage;// New value, or current
const targetLang = defaultTargetLang || user.defaultLanguages?.defaultTargetLanguage;
if ((defaultSourceLang || defaultTargetLang) && sourceLang === targetLang) → 400
```

This compares the **result after the update**: a new value if one was sent, otherwise the current one.

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

The response contains the **saved** values, after normalisation (e.g. `username: "larak"`, `contactNumber: "+27821234567"`), so the UI should update from `user`, not from what was typed.

### Errors

| Error | Status | Message |
|---|---|---|
| Nothing to update | `400` | "Please change at least one field..." |
| Source = target | `400` | "Default source and target languages must be different" |
| `ValidationError` | `400` | The first schema message (e.g. invalid SA phone number) |
| Duplicate (`11000`) | `409` | A message for the duplicated field ("That username is already taken", "That contact number is already registered", "That email is already registered"), or a general fallback |
| User not found | `404` | "User not found" |

---

### 8. PATCH `/editPassword`

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

#### Step 1: Load the user, **with** the password

```js
const user = await User.findById(userId).select('+password').exec();
```

`password` is `select: false` in the schema, so `+password` is needed to compare it.

### Step 2: Check the current password

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

**Why not 401?** The frontend probably treats **401 as "session expired"** and logs the user out. Typing the wrong current password shouldn't log anyone out, so the route uses 400.

#### Step 4: Save

```js
user.password = newPassword;// Already hashed by the middleware
user.tokenVersion = (user.tokenVersion ?? 0) + 1;// Invalidate every token issued before this change
await user.save({ validateModifiedOnly: true });// Validate only the changed fields
setTokenCookie(res, user);// New cookie for this session; every other session is signed out
```

**Response (200):** `{ "message": "Password changed successfully" }`, plus a fresh `token` cookie. The password (hashed or not) is never returned. See [Gap 5](#gap-5-changing-the-password-doesnt-sign-out-other-sessions-fixed).

---

### 9. DELETE `/deleteUser/:id` (admin)

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
[SUCCESS: userRoutes.js, DELETE /deleteUser/:id] Removed johndoe (6731...) by admin_lara: 42 notes, 3 notebooks, 11 tags, 18 translations
```

`req.adminUser.username` (set by `checkAdmin`) records **which admin** removed the account.

#### Why the notebook and tag hooks don't matter here

`deleteMany` **doesn't** run the `findOneAndDelete` hooks that `$pull` tags from notes or unset notebooks. That's fine here, because the user's **notes are deleted too**, so there's nothing left to clean up.

**Response (200):**

```json
{ "message": "User removed", "user": { "_id": "6731...", "username": "johndoe" } }
```

---
<!-- SECTION 5 -->
## 5. STATUS CODE REFERERENCES

| Code | Route(s) | When |
|---|---|---|
| `200` | all | Success |
| `400` | fetchUser, deleteUser | `:id` isn't a valid ObjectId |
| `400` | editProfile | Nothing to update, source = target, schema validation |
| `400` | editPassword | (From the middleware) missing or weak password; **current password incorrect**; schema validation |
| `401` | all | (From `checkJwtToken`) No token, an invalid or expired one, the account was deleted, or the session was signed out by a password change |
| `403` | fetchUsers, fetchUser, deleteUser | (From `checkAdmin`) Not an admin |
| `403` | fetchUser, deleteUser | The target account is an admin |
| `404` | me, fetchUser, editProfile, editPassword, deleteUser | User not found |
| `409` | editProfile | A unique field (username, contact number) is already registered |
| `429` | editPassword | (From `passwordUpdateRateLimiter`) More than 3 attempts in an hour |
| `500` | all | Unexpected error, including a failed user lookup in `checkJwtToken` |

---

<!-- SECTION 6 -->
<!-- SKIP SECTION(REMOVE) IF NONE -->
## 6. KNOWN GAPS AND HOUSE KEEPING
<!-- ONLY LIST EXISTING GAPS AND HOUSE KEEPING -->
<!-- ## 11. Known Gaps & Housekeeping -->
<!-- SUB SECTIONS -->
### 6.1. GAPS
<!-- #### GAP 1 -->

### 6.2. HOUSE KEEPING
### ~~Gap 1: `/me` logs the whole user to the console~~ (fixed)

`/me` used to log the whole user document, which wrote the user's **email, phone number and date of birth** to the server logs every time the app loaded. Under **POPIA**, logging is processing, so personal information shouldn't be logged beyond what's needed.

**Fix:** `/me` now logs only the user ID, and its error log prints `error.message` instead of the whole error object:

```js
console.log(`[SUCCESS: userRoutes.js, GET /me] Fetched profile: ${userId}`);// No personal details in logs
```

### ~~Gap 2: Inconsistent error shapes~~ (fixed)

`/me` used to return errors as `{ error }` or `{ success: false, error }`, while every other route used `{ message }`. A frontend reading `data.message` would have shown blank errors for `/me`.

**Fix:** every route in this file now returns errors as `{ message: '...' }`.

### ~~Gap 3: `/fetchUsers` leaks the internal error message~~ (fixed)

`/fetchUsers` used to send `error.message` back in its 500 response. That message can contain database details (collection names, or connection strings in some driver errors), and its log label said `GET /` instead of `GET /fetchUsers`.

**Fix:** the details are now only logged on the server, under the correct label. The client gets a generic message:

```js
console.error('[ERROR: userRoutes.js, GET /fetchUsers] Error fetching users:', error.message);
return res.status(500).json({ message: 'Internal Server Error' });// Details stay in the server log
```

### ~~Gap 4: A deleted user's token still works~~ (fixed)

JWTs are **stateless**, so after `/deleteUser/:id` the removed user's cookie used to stay valid until it expired, letting them create data for an account that no longer exists.

**Fix:** `checkJwtToken` (`securityMiddleware.js`) now loads the token's user (`tokenVersion` only, one small query per request). If the account is gone it clears the cookie and returns **401**. A database failure during that lookup returns **500**, not 401, so a DB hiccup doesn't sign everyone out.

### ~~Gap 5: Changing the password doesn't sign out other sessions~~ (fixed)

After `/editPassword`, other logged-in devices used to stay logged in until their JWT expired, so an attacker's session survived a password reset.

**Fix:** the user schema has a `tokenVersion` number (default `0`). `setTokenCookie` signs it into the JWT, and `checkJwtToken` rejects a token whose version doesn't match the stored one (401, cookie cleared). `/editPassword` increments `tokenVersion` and calls `setTokenCookie`, so the current session gets a fresh cookie and every other session is signed out. Tokens and accounts created before this change are treated as version `0`, so existing sessions keep working until the next password change.

### ~~Gap 6: Admins are listed but can't be opened~~ (fixed)

`/fetchUsers` returns **all** users, including admins, but `/fetchUser/:id` refuses admins with **403**, so clicking an admin row used to show an error.

**Fix:** `UsersList.js` disables the "View" button on rows where `admin === true` (with an aria-label explaining why), and a footer row notes that admin users can't be viewed or removed. Admins stay in the list so the table still shows every account.

### ~~Gap 7: No rate limit on `/editPassword`~~ (fixed)

Without a limiter, anyone holding a session cookie (e.g. on a shared computer) could **guess the current password as fast as they liked**.

**Fix:** `/editPassword` uses `passwordUpdateRateLimiter` (`rateLimitMiddleware.js`, 3 attempts per hour per IP, 429 after that):

```js
router.patch('/editPassword', checkJwtToken, checkPasswordChange, checkPassword, passwordUpdateRateLimiter, hashPassword, ...);
```

The limiter sits **after** the form checks, so a mistyped or weak new password doesn't use up one of the 3 attempts, and **before** the handler compares the current password, so every guess is counted.

### ~~Gap 8: The language check uses untrimmed values~~ (fixed)

The source ≠ target check used to compare the **raw** `defaultSourceLang` / `defaultTargetLang`, but the update saves the **trimmed** values, so `" af"` and `"af"` passed the check and then both saved as `af`.

**Fix:** `/editProfile` now trims both values before comparing. Non-string values are treated as "not sent", matching how the update filters them, so `{ "$gt": "" }` can't make `.trim()` throw:

```js
const trimmedLang = (value) => (typeof value === 'string' ? value.trim() : '');
const newSourceLang = trimmedLang(defaultSourceLang);
const newTargetLang = trimmedLang(defaultTargetLang);
const sourceLang = newSourceLang || user.defaultLanguages?.defaultSourceLanguage;
const targetLang = newTargetLang || user.defaultLanguages?.defaultTargetLanguage;
if ((newSourceLang || newTargetLang) && sourceLang === targetLang) { /* 400 */ }
```

### ~~Gap 9: The JWT may hold outdated profile data~~ (not an issue)

If the JWT carried the `username` or `fullName`, editing the profile would leave the old values in the token until the next login.

**Checked:** `setTokenCookie` only signs `{ id, isAdmin, tokenVersion }`, none of which `/editProfile` can change, so there's nothing to go stale. `/setAdmin` and `/clearAdmin` already re-issue the cookie when `isAdmin` changes, and `/editPassword` does when `tokenVersion` changes. If profile fields are ever added to the payload, `/editProfile` should call `setTokenCookie(res, user)` after saving.

### ~~Gap 10: The same duplicate-field and `null` gaps as `authRoutes.js`~~ (fixed)

- **Duplicate message:** any duplicate that wasn't `contactNumber` used to be reported as "username". `/editProfile` now maps each unique field to its own message (`username`, `contactDetails.contactNumber`, `contactDetails.email`), with a general fallback for any field added later.
- **`null` objects:** `fullName = {}` only applies when the value is `undefined`, so `"fullName": null` made `fullName.firstName` throw (a **500**). `/editProfile` now treats `null` or non-object `fullName` / `contactDetails` as empty (`safeFullName` / `safeContact`), so that request gets the normal 400 "Please change at least one field" instead.

### Housekeeping (done)

| Issue | Change |
|---|---|
| No header comment with the mount point and route list | Added `/* mounted at /user by app.js ... */` listing all six routes, matching the other route files |
| Comments said `/users/...` for the GET routes but `/user/...` elsewhere | All use `/user/...`, the prefix in `app.js` |
| `require('dotenv').config()` wasn't used in this file | Removed; `app.js` loads it before requiring the routes |
| `///` comment describing several imports at once; missing spaces, semicolons, `require (` | Each import is formatted consistently with its own comment |
| "Use middleware to attach user info" above `req.user.id` in `/me` | Replaced with one accurate comment |
| `[RESPONSE: userRoutes]` log, and `/me` error log without a prefix | Fixed with [Gap 1](#gap-1-me-logs-the-whole-user-to-the-console-fixed) |
| "Users pagetable" | "Users page table" |
| `/fetchUsers` log label said `GET /` | Fixed with [Gap 3](#gap-3-fetchusers-leaks-the-internal-error-message-fixed) |
| Extra blank lines | Removed |
| "Conditional rendering" comments (a React UI term) | Now "Guard clause: check ..." |

<!-- SECTION 7: REFERENCES -->
## 7. REFERENCES