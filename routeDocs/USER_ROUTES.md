# USER_ROUTES.md — `userRoutes.js` Breakdown

`userRoutes.js` is the Express router for **user accounts after sign-in**: a user reading and editing their own profile, changing their password, and the **admin-only** Users page (listing users, viewing one, and removing one along with all their data).

Signing in, registering, logging out and switching admin status on or off live in `authRoutes.js`.

| Router | Handles |
|---|---|
| `authRoutes.js` | Login, register, logout, setAdmin, clearAdmin |
| **`userRoutes.js`** (this file) | Own profile, own password, admin user management |

---

## Table of Contents

1. [Route Summary](#1-route-summary)
2. [Imports & Middleware](#2-imports--middleware)
3. [Access Levels](#3-access-levels)
4. [GET /me](#4-get-me)
5. [GET /fetchUsers (admin)](#5-get-fetchusers-admin)
6. [GET /fetchUser/:id (admin)](#6-get-fetchuserid-admin)
7. [PATCH /editProfile](#7-patch-editprofile)
8. [PATCH /editPassword](#8-patch-editpassword)
9. [DELETE /deleteUser/:id (admin)](#9-delete-deleteuserid-admin)
10. [Status Code Reference](#10-status-code-reference)
11. [Known Gaps & Housekeeping](#11-known-gaps--housekeeping)

---

## 1. Route Summary

This file has **no header comment** saying where it's mounted, and the route comments use both `/users/...` and `/user/...` (see [Housekeeping](#housekeeping)). The paths below are relative to the mount point. Check `app.js` for the actual prefix.

| Method | Path | Middleware | Who | Purpose |
|---|---|---|---|---|
| `GET` | `/me` | `checkJwtToken` | Any user | Own profile (used by `App.js` for `currentUser`, and by Settings) |
| `GET` | `/fetchUsers` | `checkJwtToken`, `checkAdmin` | **Admin** | All users, for the Users table |
| `GET` | `/fetchUser/:id` | `checkJwtToken`, `checkAdmin` | **Admin** | One non-admin user, for the details panel |
| `PATCH` | `/editProfile` | `checkJwtToken` | Any user | Update own profile and default languages |
| `PATCH` | `/editPassword` | `checkJwtToken`, `checkPasswordChange`, `checkPassword`, `hashPassword` | Any user | Change own password |
| `DELETE` | `/deleteUser/:id` | `checkJwtToken`, `checkAdmin` | **Admin** | Remove a non-admin user and **all** their data |

---

## 2. Imports & Middleware

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

## 3. Access Levels

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

## 4. GET `/me`

**Purpose:** Return the signed-in user's own profile. `App.js` calls it on load to fill `currentUser` (this is how the app "remembers" a login, since the JWT itself is in an HTTP-only cookie that JavaScript can't read). The Settings page also uses it.

```js
const user = await User.findById(req.user.id)
    .select('-password')// Never send the password, even hashed
    .exec();
```

| Result | Response |
|---|---|
| Found | `200` + the user object (everything except the password) |
| Not found (e.g. the account was deleted, but the token is still valid) | `404 { error: 'User not found' }` |
| Exception | `500 { success: false, error: '...' }` |

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
  "createdAt": "...",
  "updatedAt": "..."
}
```

This route's errors use an **`error`** key, while every other route uses **`message`** (see [Gap 2](#gap-2-inconsistent-error-shapes)).

---

## 5. GET `/fetchUsers` (admin)

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
| Includes admins | Yes. This list shows **all** accounts, but `/fetchUser/:id` refuses admins (see [Gap 6](#gap-6-admins-are-listed-but-cant-be-opened)) |
| Pagination | None. Every user is returned at once. |
| Consent | Registration requires `adminDataConsent: true`, so every listed user has agreed to admins seeing their details |

---

## 6. GET `/fetchUser/:id` (admin)

**Purpose:** One user's details for the details panel on the Users page.

### Flow

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

## 7. PATCH `/editProfile`

**Purpose:** Update the signed-in user's profile from the EditProfile form. **Only fields that are sent and not blank change.** A field left blank on the form keeps its current value.

### Request body (any combination)

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

### Step 1: Flatten the body

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

### Step 2: Filter and map to schema paths

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

### Step 3: Nothing to update?

```js
if (updates.length === 0) → 400 "Please change at least one field before updating your profile"
```

### Step 4: Load the user

```js
const user = await User.findById(userId).exec();// Not found → 404
```

### Step 5: Source ≠ target language

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

### Step 6: Set and save (rather than `findByIdAndUpdate`)

```js
updates.forEach(([path, value]) => user.set(path, value));// Dotted paths work: 'fullName.firstName'
await user.save({ validateModifiedOnly: true });
```

| Why `.set()` + `.save()` | |
|---|---|
| **Save hooks run** | The `userSchema` **pre-validate** hook normalises the data: lowercases the username and email, and converts the phone number to `+27` format. `findByIdAndUpdate` **skips** document hooks. |
| **Validators run** | `.save()` always validates. Update queries only do so with `runValidators`. |
| `validateModifiedOnly: true` | Validates **only the changed fields**. If schema rules got stricter after an older account registered, that account can still edit its name without being blocked by an unrelated field. |

### Step 7: Respond

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
| Duplicate (`11000`) | `409` | "That contact number is already registered" / "That username is already taken" |
| User not found | `404` | "User not found" |

---

## 8. PATCH `/editPassword`

**Purpose:** Change the signed-in user's password. The **current password must be confirmed**, so someone using an unattended logged-in browser can't lock the owner out.

### Request body

```json
{ "currentPassword": "OldP@ss1", "newPassword": "NewP@ss2!" }
```

### Middleware chain

```
checkJwtToken ──► checkPasswordChange ──► checkPassword ──► hashPassword ──► handler
     │                   │                      │                  │
   401              400 missing or         400 weak new      newPassword is now
                    invalid fields          password          a bcrypt hash
                                                              (plaintext in development)
```

By the time the handler runs, **`req.body.newPassword` is already hashed**. `currentPassword` is still plaintext, as typed.

### Step 1: Load the user, **with** the password

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

### Step 3: 400, not 401, for a wrong current password

```js
if (!isCurrentValid) return res.status(400).json({ message: 'Current password is incorrect' });
```

**Why not 401?** The frontend probably treats **401 as "session expired"** and logs the user out. Typing the wrong current password shouldn't log anyone out, so the route uses 400.

### Step 4: Save

```js
user.password = newPassword;// Already hashed by the middleware
await user.save({ validateModifiedOnly: true });// Validate only the password field
```

**Response (200):** `{ "message": "Password changed successfully" }`. The password (hashed or not) is never returned.

---

## 9. DELETE `/deleteUser/:id` (admin)

**Purpose:** An admin **permanently** removes a user **and everything they own**. This can't be undone.

### Flow

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

### Why the data is deleted first and the account last

```
Data first, account last (this code):
  deleteMany fails ──► account still exists ──► admin retries ──► the rest is cleaned up ✅

Account first (the wrong order):
  account deleted, deleteMany fails ──► orphaned notes/tags with no owner,
                                        and no account left to retry against ❌
```

Every step is **idempotent** (running `deleteMany` again on data that's already gone deletes 0 and succeeds), so a retry is always safe.

### Why `Promise.all`

The four collections don't depend on each other, so they're deleted **in parallel**. Destructuring the results gives the `deletedCount` for each, and those go into the **audit log**:

```
[SUCCESS: userRoutes.js, DELETE /deleteUser/:id] Removed johndoe (6731...) by admin_lara: 42 notes, 3 notebooks, 11 tags, 18 translations
```

`req.adminUser.username` (set by `checkAdmin`) records **which admin** removed the account.

### Why the notebook and tag hooks don't matter here

`deleteMany` **doesn't** run the `findOneAndDelete` hooks that `$pull` tags from notes or unset notebooks. That's fine here, because the user's **notes are deleted too**, so there's nothing left to clean up.

**Response (200):**

```json
{ "message": "User removed", "user": { "_id": "6731...", "username": "johndoe" } }
```

---

## 10. Status Code Reference

| Code | Route(s) | When |
|---|---|---|
| `200` | all | Success |
| `400` | fetchUser, deleteUser | `:id` isn't a valid ObjectId |
| `400` | editProfile | Nothing to update, source = target, schema validation |
| `400` | editPassword | (From the middleware) missing or weak password; **current password incorrect**; schema validation |
| `401` | all | (From `checkJwtToken`) No token, or an invalid or expired one |
| `403` | fetchUsers, fetchUser, deleteUser | (From `checkAdmin`) Not an admin |
| `403` | fetchUser, deleteUser | The target account is an admin |
| `404` | me, fetchUser, editProfile, editPassword, deleteUser | User not found |
| `409` | editProfile | Username or contact number already taken |
| `500` | all | Unexpected error |

---

## 11. Known Gaps & Housekeeping

### Gap 1: `/me` logs the whole user to the console

```js
console.log(`[RESPONSE: userRoutes]`, user);
```

This writes the user's **email, phone number and date of birth** to the server logs **every time** the app loads. Logs are often kept for a long time and seen by more people than the database is. Under **POPIA**, personal information shouldn't be processed (and logging is processing) beyond what's needed. Log only the ID:

```js
console.log(`[SUCCESS: userRoutes.js, GET /me] Fetched profile: ${userId}`);// No personal details in logs
```

### Gap 2: Inconsistent error shapes

| Route | Error Shape |
|---|---|
| `/me` | `{ error: '...' }` and `{ success: false, error: '...' }` |
| Everything else | `{ message: '...' }` |

If the frontend shows `err.response.data.message`, errors from `/me` appear as **blank**. Use `{ message }` everywhere.

### Gap 3: `/fetchUsers` leaks the internal error message

```js
return res.status(500).json({ message: 'Internal Server Error', error: error.message });
```

`error.message` can contain database details (collection names, connection strings in some driver errors). It's admin-only, but it's still better to log it and **not** send it:

```js
return res.status(500).json({ message: 'Internal Server Error' });// Details stay in the server log
```

The log label also says `GET /` instead of `GET /fetchUsers`.

### Gap 4: A deleted user's token still works

JWTs are **stateless**: after `/deleteUser/:id`, the removed user's cookie stays **valid until it expires**. If `checkJwtToken` only verifies the signature (and doesn't look the user up), that person can still:

- call `/me` → 404 (fine)
- call `POST /notes/addNote`, `POST /notebooks`, etc. → **creates new data for a user that no longer exists**

Options:
- Make `checkJwtToken` check that the user still exists (one quick `User.exists()` per request), or
- add a `tokenVersion` number to the user, include it in the JWT, and reject tokens whose version doesn't match. This also helps with [Gap 5](#gap-5-changing-the-password-doesnt-sign-out-other-sessions).

### Gap 5: Changing the password doesn't sign out other sessions

After `/editPassword`, **any other device or browser that's logged in stays logged in** until its JWT expires. If the password was changed **because** the account was compromised, the attacker's session keeps working. The `tokenVersion` approach in Gap 4 fixes this: increase it on a password change, issue a new cookie for the current session (`setTokenCookie`), and every other token becomes invalid.

### Gap 6: Admins are listed but can't be opened

`/fetchUsers` returns **all** users, including admins, but `/fetchUser/:id` refuses admins with **403**. Clicking an admin row in the Users table shows an error. Either:
- filter them out of the list: `User.find({ admin: { $ne: true } })`, or
- hide or disable the "View" button for rows where `admin === true` in `UsersList.js`.

### Gap 7: No rate limit on `/editPassword`

`/login` has `loginLimiter`, but `/editPassword` has no limiter. Anyone holding a session cookie (e.g. on a shared computer) can **guess the current password as fast as they like**. Add a limiter:

```js
router.patch('/editPassword', passwordChangeLimiter, checkJwtToken, checkPasswordChange, checkPassword, hashPassword, ...);// e.g. 5 attempts per 15 min
```

### Gap 8: The language check uses untrimmed values

The source ≠ target check compares the **raw** `defaultSourceLang` / `defaultTargetLang`, but the update saves the **trimmed** values. `" af"` and `"af"` would pass the check and then both save as `af`. Compare the trimmed values:

```js
const sourceLang = defaultSourceLang?.trim() || user.defaultLanguages?.defaultSourceLanguage;
const targetLang = defaultTargetLang?.trim() || user.defaultLanguages?.defaultTargetLanguage;
```

### Gap 9: The JWT may hold outdated profile data

If the JWT payload includes the `username` or `fullName` (check `setTokenCookie`), editing the profile leaves the **old** values in the token until the next login. If anything reads those from `req.user`, issue a new cookie after the update, the same way `/setAdmin` does:

```js
setTokenCookie(res, user);// Keep the token's claims in step with the profile
```

### Gap 10: The same duplicate-field and `null` gaps as `authRoutes.js`

- **Duplicate message:** any duplicate that isn't `contactNumber` is reported as "username". If `email` is unique, users get the wrong message. Use the field-to-message map from `AUTH_ROUTES.md` Gap 3.
- **`null` objects:** `fullName = {}` only applies when it's `undefined`. `"fullName": null` makes `fullName.firstName` throw a `TypeError`, which becomes a **500**. The fix is in `AUTH_ROUTES.md` Gap 2.

### Housekeeping

| Line(s) | Issue | Suggestion |
|---|---|---|
| 1 | No header comment with the mount point and route list (every other route file has one) | Add one, e.g. `/* mounted at /users by app.js ... */` with the six routes |
| 22, 47, 64 vs. 105, 195, 247 | Comments say `/users/...` for the GET routes but `/user/...` for the PATCH and DELETE routes | Use the real mount prefix from `app.js` everywhere |
| 4 | `require('dotenv').config()` isn't used in this file | Load it once in `app.js` |
| 14 | `///` (three slashes), and it says "JWT, admin, password" for one import line | `//` and move each description next to its import |
| 15–17 | No spaces inside braces, missing semicolons, `require (` with a space | `const { checkPassword, ... } = require('...');` |
| 26–27 | "Use middleware to attach user info" is above a line that reads `req.user.id` | Swap them: "Get the authenticated user's ID from the JWT token" |
| 36 | `[RESPONSE: userRoutes]` doesn't follow the `[SUCCESS: file.js, METHOD path]` pattern | See [Gap 1](#gap-1-me-logs-the-whole-user-to-the-console) |
| 39 | `'Error fetching current user:'` has no `[ERROR: ...]` prefix, and logs the whole error object | `[ERROR: userRoutes.js, GET /me]`, error.message |
| 48 | "Users pagetable" | "Users page table" |
| 59 | The log label says `GET /` | `GET /fetchUsers` |
| 103–104, 193–194 | Extra blank lines | Remove |
| 31, 70, 80, 86, 137, 145, 151, 207, 220, 254, 262, 268 | "Conditional rendering" | That's a React UI term. These are **guard clauses** / validation checks. |
