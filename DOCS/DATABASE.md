# DATABASE

## OVERVIEW

Databases are used to store, manage and retrieve data efficiently. SQL and NoSQL are the two main types of databases, each designed for different data storage and application requirements.

|**SQL**	|**NoSQL**|
|------|----------|
|Data is stored in tables with rows and columns.	|Data is stored as documents, key-value pairs, graphs or columns.|
|Uses a relational data model |	Uses a non-relational data model |
|Has a fixed schema |	Has a flexible schema|
| Supports complex joins between tables |	Generally avoids joins |
| Follows ACID properties for transactions |	Usually follows the BASE model |
| Scales vertically by increasing server capacity |	Scales horizontally by adding more servers |
| Best suited for structured data |	Suitable for structured, semi-structured and unstructured data |
| Commonly used in banking, ERP and CRM systems |	Commonly used in social media, Big Data and IoT applications |

## TABLE OF CONTENTS
1. [APPLICATION DATABASE](#1-application-database)
2. [DATABASE CONNECTION](#2-database-connection)
    - [2.1. ENVIRONMENT VARIABLES](#21-environment-variables)
    - [2.2. DATABASE CONNECTION FUNCTION](#22-database-connection-function)
    - [2.3. CONNECTION EVENT LISTENERS](#23-connection-event-listeners)
    - [2.4. STARTING THE SERVER](#24-starting-the-server)
3. [DATABASE STRUCTURE](#3-database-structure)
    - [3.1. SCHEMAS](#31-schemas)
    - [3.2. DATA TYPES](#32-data-types)
        - [3.2.1. MONGOOSE SCHEMA TYPES](#321-mongoose-schema-types)
        - [3.2.2. MONGOOSE SCHEMA OPTIONS](#322-mongoose-schema-options)
    - [3.3. MONGODB DATA TYPES ](#33-mongodb-data-types)
        - [3.3.1. USE CASES](#331-use-cases)
    - [3.4. APPLICATION COLLECTIONS](#34-application-collections)
    - [3.5. INDEXES](#35-indexes)
4. [REFERENCES](#4-references)

- *View [GLOSSARY.md](/GLOSSARY.md) for terminology*
- *View [SCHEMAS.md](./SCHEMAS.md) for the full field-by-field description of each model*
---
## 1. APPLICATION DATABASE

This application uses MongoDB, an open-source, document-oriented NoSQL database which stores data in BSON format for efficient handling of JSON-like documents.

## 2. DATABASE CONNECTION

The application uses the `mongoose` package (an Object Data Modeling library) to connect to MongoDB and define schemas. It is installed in the back end (`server`) folder:

```bash
cd server
npm install mongoose
```

## 2.1. ENVIRONMENT VARIABLES

The connection details are read from the `server/.env` file using the `dotenv` package. Never commit the `.env` file.

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | MongoDB connection string (e.g. a MongoDB Atlas `mongodb+srv://...` URI). |
| `DATABASE_NAME` | Name of the database to use on the cluster. Passed to Mongoose as `dbName`. |

If either variable is missing, [`connect.js`](../server/config/connect.js) logs an error and exits the process with code `1` before any connection is attempted.

## 2.2. DATABASE CONNECTION FUNCTION

The `connectDB()` function in [`connect.js`](../server/config/connect.js) uses `mongoose.connect()` to establish a connection between the application and the MongoDB database.

```js
//connect.js
/* Load environment variables from a .env 
file using the dotenv package*/
require('dotenv').config();
// IMPORT REQUIRED MODULES AND PACKAGES
const mongoose = require('mongoose');

// Extract Enviromental variables
const uri = process.env.DATABASE_URL;
const database = process.env.DATABASE_NAME;

if (!uri || !database) {
    console.error('[ERROR: connect.js] Missing enviromental variables: DATABASE_URL or DATABASE_NAME');
    process.exit(1)
}

mongoose.Promise = global.Promise;

const connectDB = async () => {
    try {
        await mongoose.connect(uri, {
            dbName: database,
            serverSelectionTimeoutMS: 5000,
            connectTimeoutMS:'100000'
        })
         console.log('[SUCCESS: connect.js]: Successfully connected to MongoDB');
    } catch (error) {
        console.error('[ERROR: connect.js] Error connecting to MongoDB', error);//Log an error message in the console if connection error occurs
        process.exit(1);     // Exit to prevent app running without DB   
    }
};

module.exports = connectDB;
```

**CONNECTION OPTIONS**

| Option | Value | Description |
|--------|-------|-------------|
| `dbName` | `DATABASE_NAME` | The database to use, overriding any database name in the URI. |
| `serverSelectionTimeoutMS` | `5000` | How long (5 seconds) the driver tries to find an available server before failing. |
| `connectTimeoutMS` | `100000` | How long (100 seconds) the driver waits for the initial socket connection before timing out. |

## 2.3. CONNECTION EVENT LISTENERS

[`connect.js`](../server/config/connect.js) also listens for events on `mongoose.connection` to log and react to changes in the connection state after start-up.

| Event | When it fires | Action |
|-------|---------------|--------|
| `error` | An error occurs after the initial connection. | Logs the error and exits the process (`process.exit(1)`). |
| `disconnected` | MongoDB disconnects (network issue, restart, etc.). | Logs a warning and calls `connectDB()` to try to reconnect. |
| `reconnected` | The connection is restored. | Logs an info message. |
| `open` (once) | The connection is fully opened for the first time. | Logs a success message. |

```js
// Fired if an error occurs after initial connection
mongoose.connection.on('error', (error) => {
    console.error(`[ERROR: connect.js] Error connecting to MongoDb database. Exiting now...`, error);
    process.exit(1);// Exit to prevent app running without DB
})

// Fired when MongoDB disconnects (network issue, restart, etc.)
mongoose.connection.on('disconnected', () => {
    console.warn('[WARNING: connectDB.js] MongoDB disconnected! Attempting reconnection...');
    connectDB();// Attempt to reconnect automatically
});

// Fired when MongoDB successfully reconnects
mongoose.connection.on("reconnected", () => {
    console.log("[INFO: connectDB.js] MongoDB Reconnected!");
});

// Fired once when the connection is fully opened
mongoose.connection.once('open', async () => {
    console.log("[SUCCESS: connectDB.JS] Database connection established");
});
```

## 2.4. STARTING THE SERVER

The server starts listening only **after** a successful database connection is established. This prevents the application from accepting requests when the database is unavailable. Once connected, the 60-day archive sweep (`startArchiveSweep()` in [`archiveUtil.js`](../server/util/archiveUtil.js)) also starts.

Before connecting, [app.js](../server/app.js) disables Mongoose's `strictPopulate` option so `.populate()` doesn't throw an error on paths that are only conditionally defined in a schema.

[app.js](../server/app.js)  

```js
// ================== MONGOOSE CONFIG ==================
/* Disable strict populate to prevent errors when populating 
paths that are conditionally defined*/
mongoose.set('strictPopulate', false);
//=============START THE SERVER=============
// Connect to MongoDB first; only start listening once the DB is available.
// This avoids “server started but DB is down” race conditions.
connectDB().then(() => {
    startArchiveSweep();// Move archived notes/translations older than 60 days to the trash now, then every hour
    app.listen(port, () => {
        console.info(`[INFO:app.js] server is running on ${port}`)// Log a message in the console indicating the server is running
    })
}).catch((error) => {
     console.error('[ERROR: app.js]: Database connection failed');// Log an error message in the console for debugging purposes
    process.exit();//Exit if connection failed
})
```

## 3. DATABASE STRUCTURE
MongoDB organizes data into a hierarchy of the following levels:

|**COMPONENT**|**DESCRIPTION** |
|----|----|
|**Database:** |  Top-level data structures in a MongoDB deployment that store collections |
|**Collections:**|Groups of MongoDB documents. They are analogous to tables in relational databases. |
|**Documents:** |Units that store  data key-value pairs.|

In MongoDB, each document stored in a standard collection requires a unique `_id` field that acts as a primary key. If an inserted document omits the _id field, the MongoDB driver automatically generates an `ObjectId` for the _id field. MongoDB documents are composed of field-and-value pairs and have the following structure:

```js
{
   field1: value1,
   field2: value2,
   field3: value3,
   ...
   fieldN: valueN
}
```

### 3.1. SCHEMAS

A document is the basic unit of data in MongoDB. A schema acts as your blueprint and defines what each document in MongoDB should look like, including fields, types, defaults and rules. `mongoose` is used to define the schemas.
Schema validation lets you create validation rules for your fields, such as allowed data types and value ranges.

**DEFINING THE SCHEMA**

The example below is a shortened version of [userSchema.js](../server/models/userSchema.js). See [SCHEMAS.md](./SCHEMAS.md#2-user) for every field.

```js
// userSchema.js
//IMPORT REQUIRED MODULES AND PACKAGES
const mongoose = require('mongoose');

//Define new userSchema
const userSchema = new mongoose.Schema({
    //Field for username
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: [3, 'Username must be at least 3 characters long'],
        maxlength: [30, 'Username cannot exceed 30 characters'],
        match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'],
    },
    //=================NESTED FULL NAME OBJECT===================
    fullName: {
        //Field for firstName
        firstName: {
            type: String,
            required: [true, 'User First Name is required'],
            trim: true,
            minlength: [2, 'First name must be at least 3 characters long'],
            maxlength: [50, 'First name cannot exceed 50 characters'],
        },
        //Field for lastName
        lastName: {
            type: String,
            required: [true, 'Last name is required'],
            trim: true,
            minlength: [3, 'Last name must be at least 3 characters long'],
            maxlength: [50, 'Last name cannot exceed 50 characters'],
        },
    },
},{
     // SCHEMA OPTIONS
    timestamps: true,            // Auto-adds createdAt and updatedAt fields, managed by Mongoose
    toJSON: {virtuals: true},    // Include virtual fields (displayName, age, etc.) when the document is serialized to JSON
    toObject: {virtuals:true},   // Includes virtual fields when converting a document to a plain JavaScript object. applies when using .toObject()
})

// -----------VIRTUALS------------------
// Virtual field to return full name as a single string
userSchema.virtual('displayName').get(function () {
    return `${this.fullName.firstName} ${this.fullName.lastName}`;
});

module.exports = mongoose.model('User', userSchema)//Export the schema
```

## 3.2. DATA TYPES

**THE MONGOOSE TYPE KEY**

In a Mongoose schema the `type` key indicates the data type. `type` is a special property in Mongoose schemas. When Mongoose finds a nested property named type in your schema, Mongoose assumes that it needs to define a SchemaType with the given type.

### 3.2.1. MONGOOSE SCHEMA TYPES

| Schema Type | Description |
|-------------|-------------|
| `String` | Stores text values. |
| `Number` | Stores integers and floating-point numbers. |
| `Boolean` | Stores `true` or `false` values. |
| `Date` | Stores dates and timestamps. |
| `Buffer` | Stores binary data such as images or files. |
| `ObjectId` | Stores a reference to another MongoDB document. |
| `Mixed` | Stores any type of data without enforcing a schema. |
| `Decimal128` | Stores high-precision decimal numbers, commonly used for financial data. |
| `Map` | Stores key-value pairs where all values have the same data type. |
| `Array` | Stores an ordered collection of values. |
| `UUID` | Stores Universally Unique Identifiers (UUIDs). |
| `BigInt` | Stores very large integers beyond JavaScript's safe integer limit. |
| `Subdocument` | Stores a nested schema as a single embedded document. |
| `Document Array` | Stores an array of embedded subdocuments. |


### 3.2.2. MONGOOSE SCHEMA OPTIONS

| Schema Option | Description |
|---------------|-------------|
| `autoCreate` | Automatically creates the MongoDB collection when the model is first used. |
| `autoIndex` | Automatically builds indexes defined in the schema. |
| `bufferCommands` | Buffers database operations until a connection is established. |
| `bufferTimeoutMS` | Specifies how long buffered operations wait before timing out. |
| `capped` | Creates the collection as a capped collection with a fixed size. |
| `collection` | Specifies the MongoDB collection name to use. |
| `discriminatorKey` | Sets the field used to identify discriminator models. |
| `id` | Enables or disables the virtual `id` property. |
| `minimize` | Removes empty objects before saving documents. |
| `optimisticConcurrency` | Enables optimistic concurrency control using the version key. |
| `pluginTags` | Applies plugins only to schemas with matching tags. |
| `read` | Sets the default read preference for queries. |
| `shardKey` | Defines the shard key for sharded collections. |
| `strict` | Controls whether fields not defined in the schema are saved. |
| `strictQuery` | Controls whether query filters are limited to schema-defined fields. |
| `timestamps` | Automatically adds and maintains `createdAt` and `updatedAt` fields. |
| `toJSON` | Defines default options when converting documents to JSON. |
| `toObject` | Defines default options when converting documents to plain JavaScript objects. |
| `typeKey` | Changes the property name used to define field types (default is `type`). |
| `validateBeforeSave` | Determines whether validation runs automatically before saving. |
| `versionKey` | Enables, disables, or renames the document version field (default `__v`). |
| `writeConcern` | Specifies the default write concern for database operations. |
| `_id` | Enables or disables automatic generation of the `_id` field (primarily for subdocuments). |

### 3.3. MONGODB DATA TYPES 

<!-- MongoDB uses BSON, an extended version of JSON, which supports additional data types like binary data, dates, and nested arrays, improving query efficiency and storage performance. -->

`BSON` ("Binary JSON") is the binary format MongoDB uses to store documents and send them over the wire. It is an extended version of JSON which supports additional data types (dates, binary data, precise integers and decimals, ObjectIds) and stores each value with a type tag and length, which makes documents fast to scan and traverse.

|JSON | BSON |
|----|----|
|Text-based and human-readable |Binary-based and machine-optimized|
|Limited support for data types |Supports rich data types like ObjectId, Date, and Binary|
|Slower parsing and traversal|Faster parsing and data access|
|Less efficient for database storage |Efficient storage and querying in databases like MongoDB|
|Larger size for network transfer | Compact format, efficient network transfer|
|Better for simple data exchange|Ideal for high-performance and real-time applications|

**Limits worth remembering**
 
- Max document size: **16 MB** (use GridFS beyond that).
- Max nesting depth: **100 levels**.
- Field names can't contain null characters; avoid leading `$` and `.` in names.

Each BSON type has a number and a string alias. Use either with the `$type` query operator. 

**COMMON DATA TYPES**

| Type | Alias (`$type`) | Status | Mongoose SchemaType | Description|
|---|------|-----------------|--------|---------------------|
| Double | `"double"` | Active | `Number` |A decimal number. It's the default for numbers, but it isn't exact, so 0.1 + 0.2 doesn't equal 0.3.|
| String | `"string"` | Active | `String` |UTF-8 encoded text values. *Supports any Unicode characters*|
|  Object (embedded document) | `"object"` | Active | Subdocument / nested object |A document inside another document, like an address.|
|Array | `"array"` | Active | `[Type]` / `Array` |An ordered list that can hold values of any type.|
| ObjectId | `"objectId"` | Active | `Schema.Types.ObjectId` | A 12-byte ID that's the default for `_id`. It starts with a timestamp, so IDs roughly sort by when they were created. It's also what Mongoose `ref` and `.populate()` work with.|
|  Boolean | `"bool"` | Active | `Boolean` |`true` or `false`. In `$type` queries its name is `"bool"`, not `"boolean"`.|
|  Date | `"date"` | Active | `Date` | Milliseconds since 1970, always stored in UTC. Convert it to SA time (UTC+2) in your app or in an aggregation.|
| Null | `"null"` | Active | — | "No value". Watch out: querying `{ field: null }` also matches documents where the field is missing. |

Extra alias: `"number"` matches **double, int, long and decimal** in one go.

**NUMBER TYPES FOR ACCURACY**
| Type | Alias (`$type`) | Status | Mongoose SchemaType | Description|
|---|------|-----------------|--------|---------------------|
| 32-bit integer | `"int"` | Active | `Number` (stored as double unless cast) / `Int32` | A 32-bit whole number, good for counts and quantities.|
| 64-bit integer | `"long"` | Active | `BigInt` / `Long` | A 64-bit whole number. JavaScript loses precision on numbers above 2^53, so use BigInt or the driver's Long class for these.|
|Decimal128 |`"decimal"`| Active |`Schema.Types.Decimal128` | An exact decimal number.|

**SPECIAL TYPES**

| Type | Alias (`$type`) | Status | Mongoose SchemaType | Description|
|---|------|-----------------|--------|---------------------|
| Binary data | `"binData"` | Active |`Buffer` / `UUID`|Raw bytes with a **subtype** byte describing the contents|
| Regular Expression | `"regex"` | Active | — | The regular expression data type is used to store regex patterns. |
| Timestamp | `"timestamp"` | Active (internal) | — | Used internally for replication. Don't use it for your app's dates; use `Date` instead.|
| MinKey / MaxKey| `"minKey"` `"maxKey"` | Active (internal) | — | Internal types that compare **lower / higher than every other BSON value**. Used mainly in sharding chunk ranges and index bounds.|


**DEPRECATED TYPES**


| Type | Alias (`$type`) | Status | Mongoose SchemaType |Description | Replace With |
|------|-----------------|--------|---------------------|----|----|
| Undefined | `"undefined"` | **Deprecated** | — | Legacy placeholder | `null` or omit the field instead. |
|  DBPointer | `"dbPointer"` | **Deprecated** | — | Old way to reference another document | ObjectId field (manual reference) or `DBRef` convention.|
| Symbol | `"symbol"` | **Deprecated** | — | A string variant for languages with a symbol type | String |
|  JavaScript with scope | `"javascriptWithScope"` | **Deprecated** (4.4+) | — |JavaScript code plus a variable scope document. | Don't use. |



#### 3.3.1. USE CASES

| Use case | Recommended BSON type |
|----------|----------------------|
| Primary keys / references | ObjectId |
| Money (ZAR), tax, VAT | Decimal128 (or long storing cents) |
| Quantities, stock counts | int (or double via Mongoose `Number`) |
| Ratings, percentages, coordinates | double |
| Created/updated dates, due dates | Date |
| Flags (active, inStock) | Boolean |
| Names, codes, enums (provinces) | String |
| Phone numbers (+27…) | String (never a number — leading zeros/`+` are lost) |
| Nested info (address) | Object |
| Lists (tags, line items) | Array |
| UUIDs, hashes, small files | Binary data |
| Huge counters / external 64-bit IDs | long |

### 3.4. APPLICATION COLLECTIONS

The application stores its data in six collections, one per Mongoose model in [`server/models/`](../server/models/). Mongoose creates the collection name by lower-casing and pluralising the model name.

| Model | Collection | Schema file | Stores |
|-------|------------|-------------|--------|
| `User` | `users` | [userSchema.js](../server/models/userSchema.js) | User accounts, profile and language preferences. |
| `Note` | `notes` | [noteSchema.js](../server/models/noteSchema.js) | Notes, with optional notebook and tags. |
| `Notebook` | `notebooks` | [notebookSchema.js](../server/models/notebookSchema.js) | Notebooks that group a user's notes. |
| `Tag` | `tags` | [tagSchema.js](../server/models/tagSchema.js) | Tags that can be attached to notes. |
| `Translation` | `translations` | [translationSchema.js](../server/models/translationSchema.js) | Saved text translations, optionally linked to a note. |
| `DocumentTranslation` | `documenttranslations` | [docTranslateSchema.js](../server/models/docTranslateSchema.js) | Saved document (PDF) translations. |

Documents reference each other by `ObjectId` using `ref`, so related data can be loaded with `.populate()`. Every collection except `users` has an owner field (`user`, or `userId` on `DocumentTranslation`) that is used to filter every query. See [SCHEMAS.md](./SCHEMAS.md#1-relationships) for the relationship diagram.

### 3.5. INDEXES

Indexes let MongoDB find documents without scanning the whole collection. The schemas define them with `schema.index()`, and Mongoose builds them when the app starts (`autoIndex`).

| Index type | Used for | Example |
|------------|----------|---------|
| **Compound** | Filtering by owner and sorting lists. | `noteSchema.index({ user: 1, isPinned: -1, updatedAt: -1 })` |
| **Unique** | Preventing duplicates per user (returns **409**). | `tagSchema.index({ user: 1, name: 1 }, { unique: true })` |
| **Text** | Full-text search on notes; title matches rank higher. | `noteSchema.index({ title: 'text', plainText: 'text' }, { weights: { title: 3, plainText: 1 } })` |
| **TTL** | Permanently deleting trashed notes, translations and document translations 30 days after `deletedAt`. | `noteSchema.index({ deletedAt: 1 }, { expireAfterSeconds: THIRTY_DAYS_IN_SECONDS })` |

See [SCHEMAS.md](./SCHEMAS.md) for the full list of indexes per model and [SCHEMAS.md §9](./SCHEMAS.md#9-archive-and-trash-lifecycle) for the archive and trash lifecycle.

## 4. REFERENCES

- https://mongoosejs.com/docs/guide.html
- https://mongoosejs.com/docs/schematypes.html
- https://mongoosejs.com/docs/schematypes.html#type-key
- https://mongoosejs.com/docs/connections.html
- https://mongoosejs.com/docs/guide.html#indexes
- https://www.mongodb.com/docs/manual/indexes/
- https://www.geeksforgeeks.org/mongodb/datatypes-in-mongodb/
- https://www.geeksforgeeks.org/mongodb/what-is-mongodb-working-and-features/
- https://www.mongodb.com/docs/php-library/current/reference/bson/
- https://www.geeksforgeeks.org/mongodb/what-is-bson/