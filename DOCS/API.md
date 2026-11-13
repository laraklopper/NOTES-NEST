# APPLICATION PROGRAMMING INTERFACE `(API)` INTEGRATION


## CONTENTS
1. [OVERVIEW](#1-overview)

- *View [GLOSSARY.md](../GLOSSARY.md) for terminology*
---

## 1. OVERVIEW 

An `API` call is a request by a software application to access data or any other service from another application or any other server.
The term `API` can refer to many types of services, and developers have many choices for how their *`APIs`* are architected and what protocols and standards they use.


## REST API's

`REST  APIs` use `JSON` (most common), `XML`, `HTML`, or plain text format. `REST APIs` are the most common APIs used across the web today. `HTTP` is an application-layer protocol for fetching resources such as `HTML` .

| **HTTP Verb** | **CRUD Operation** | **Description** |
|--------|-------|------|
| POST | CREATE | Used to submit data about a specific entity to the server |
| GET | READ | Used to fetch information from the database |
| PUT | UPDATE | Full replacement update of a resource on the database |
| PATCH | UPDATE | Partial update of a resource on the database |
| DELETE | DELETE | Deletes a specific resource |

## APPLICATION LEVEL REQUESTS

All routes are protected and require a JWT token except the /login, and /register routes/requests.

### 2.1 AUTH ROUTES:

| Method | Endpoint | Auth | Description |
|---|---|---|---|
|POST| `/auth/login` | NONE |
|POST| `/auth/register` | NONE |
### 2.2. USER ROUTES

### 2.3. NOTE ROUTES
### 2.4. NOTEBOOK ROUTES
### 2.5 TAG ROUTES
## 3. THIRD PARTY (EXTERNAL) REQUESTS:

- langbly

## REFERENCES

- https://blog.postman.com/different-types-of-apis/
- https://www.geeksforgeeks.org/blogs/application-programming-interfaces-api-and-its-types/