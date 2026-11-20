# DOCUMENT ROUTES - [`/docTranslateRoutes.js`](../server/routes/docTranslateRoutes.js) BREAKDOWN

[`/docTranslateRoutes.js`](../server/routes/docTranslateRoutes.js) is the Express router for the user's **document translation history**: listing, saving, trashing, restoring and permanently deleting document translations. Only  <!-- document format --> can be translated. 

<!-- Translating documents api -->


Archiving translations is handled by a different router, [`archiveRoutes.js`](../server/routes/archiveRoutes.js) (see [`ARCHIVE_ROUTES.md`](../routeDocs/ARCHIVE_ROUTES.md)). This router only reads and resets the archive fields.
<!-- Explain relationships with other routers e.g. Archiving documents and add the links to the router and 
router-->


## TABLE OF CONTENTS
1. [ROUTE SUMMARY](#1-route-summary)
 - [1.1. GET '/fetchDocuments'](#11-get-fetchdocuments)
2. [IMPORTS AND SETUP](#2-imports-and-setup)
3. [SCHEMAS AND UTILITY FUNCTIONS](#3-schemas-and-utility-functions)
    - [3.1. SCHEMAS](#31-schemas)
    - [3.2. UTILITY FUNCTIONS](#32-utility-functions)
 4. [SECURITY](#4-security)
    - [4.1. PACKAGES](#41-packages)
    - [4.2. MIDDLEWARE](#42-middleware)
5. [STATUS CODE REFERENCES](#5-status-code-references)
6. [KNOWN GAPS AND HOUSE KEEPING](#6-known-gaps-and-house-keeping)
    - [6.1. GAPS](#61-gaps)
    - [6.2. HOUSE KEEPING](#62-house-keeping)
7. [REFERENCES](#7-references)

- *View [GLOSSARY.md](../GLOSSARY.md) for terminology*
--- 

## 1. ROUTE SUMMARY

The router is mounted at **`/document`** in `app.js`. Every route requires a valid JWT (`checkJwtToken`).



| Method | Full Path | Middleware  | Purpose | NOTES | 
|---     |---        |         ---|---     |---|
| GET | `/documents/fetchDocuments` | `checkJwtToken` | Lists the current user's saved document translations |  newest first (text omitted) (query: page, limit) |


**Client side usage:**
| Method | Full Path | Frontend/Client side files |
|---|---|---|
|||


<!-- list all routes -->
### 1.1. GET '/fetchDocuments'

## 2. IMPORTS AND SETUP

## 3. SCHEMAS AND UTILITY FUNCTIONS

### 3.1. SCHEMAS

### 3.2. UTILITY FUNCTIONS

## 4. SECURITY

### 4.1. PACKAGES

### 4.2. MIDDLEWARE

## 5. STATUS CODE REFERENCES

## 6. KNOWN GAPS AND HOUSE KEEPING
<!-- ONLY ADD IF GAPS OR HOUSE KEEPING EXIST  (do not add section if none exist)-->
### 6.1. GAPS

### 6.2. HOUSE KEEPING

## 7. REFERENCES