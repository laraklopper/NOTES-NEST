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
    - [2.1. DATABASE CONNECTION FUNCTION](#21-database-connection-function)
3. [DATABASE STRUCTURE](#3-database-structure)
    - [3.1. SCHEMAS](#31-schemas)
    - [3.2. DATA TYPES](#32-data-types)
        - [3.2.1. MONGOOSE SCHEMA TYPES](#321-mongoose-schema-types)
        - [3.2.2. MONGOOSE SCHEMA OPTIONS](#322-mongoose-schema-options)
    - [3.3. MONGODB DATA TYPES ](#33-mongodb-data-types)
        - [3.3.1. USE CASES](#331-use-cases)
4. [REFERENCES](#4-references)

- *View [GLOSSARY.md](/GLOSSARY.md) for terminology*
---
## 1. APPLICATION DATABASE

This application uses MongoDB. An open-source, document-oriented NoSQL database which stores data in BSON format for efficient handling of JSON-like documents. 

## 2. DATABASE CONNECTION

The application uses `mongoose` middleware to connect to MongoDB and define schemas. The application is connected to the MongoDB database using mongoose third-party middleware in the `app.js` file in the back end (server) folder. 


```bash
npm install mongoose
```
## 2.1. DATABASE CONNECTION FUNCTION

The `connectDB()` function in [`connect.js`](../server/config/connect.js) to connect to the database. The function uses `mongoose.connect()` to establish a connection between the application and the MongoDB database. 


```js
//connect.js
/* Load environment variables from a .env 
file using the dotenv package*/
require('dotenv').config();
// IMPORT REQUIRED MODULES AND PACKAGES
const mongoose = require('mongoose');

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

The server starts listening only **after** a successful database connection is established. This prevents the application from accepting requests when the database is unavailable.


[app.js](../server/app.js)  

```js
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

A document is the basic unit of data in MongoDB. A schema acts as your blueprint and defines what each document in MongoDB should look like including fields, types, defaults and rules. `mongoose` middleware is used to define the scemas. 
Schema validation lets you create validation rules for your fields, such as allowed data types and value ranges.

**DEFINING THE SCHEMA**

- [userSchema.js](../server/models/userSchema.js)

```js
// userSchema.js
//IMPORT REQUIRED MODULES AND PACKAGES
const mongoose = require('mongoose');

//Define new userSchema
const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, 'username is required']
    }
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

In a mongoose Schema the `type` key indicates the data type.type is a special property in Mongoose schemas. When Mongoose finds a nested property named type in your schema, Mongoose assumes that it needs to define a SchemaType with the given type.

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

`BSON` ("Binary JSON") is the binary format MongoDB uses to store documents and send them over the wire. It extended version of JSON, which supports additional data types (dates, binary data, precise integers and decimals, ObjectIds) and stores each value with a type tag and length, which makes documents fast to scan and traverse. 

|JSON | BSON |
|----|----|
|Text-based and human-readable |Binary-based and machine-optimized|
|Limited support for data types |Supports rich data types like ObjectId, Date, and Binary
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
| Double | `"double"` | Active | `Number` |a decimal number. It's the default for numbers, but it isn't exact, so 0.1 + 0.2 doesn't equal 0.3.|
| String | `"string"` | Active | `String` |UTF-8 encoded text values. *Supports any Unicode characters*|
|  Object (embedded document) | `"object"` | Active | Subdocument / nested object |a document inside another document, like an address.|
|Array | `"array"` | Active | `[Type]` / `Array` |an ordered list that can hold values of any type|
| ObjectId | `"objectId"` | Active | `Schema.Types.ObjectId` | a 12-byte ID that's the default for _id. It starts with a timestamp, so IDs roughly sort by when they were created.It's also what Mongoose ref and .populate() work with.|
|  Boolean | `"bool"` | Active | `Boolean` |true or false. In $type queries its name is "bool", not "boolean".|
|  Date | `"date"` | Active | `Date` | milliseconds since 1970, always stored in UTC. Convert it to SA time (UTC+2) in your app or in an aggregation.|
| Null | `"null"` | Active | | : "no value". Watch out: querying { field: null } also matches documents where the field is missing. |

Extra alias: `"number"` matches **double, int, long and decimal** in one go.

**NUMBER TYPES FOR ACCURACY**
| Type | Alias (`$type`) | Status | Mongoose SchemaType | Description|
|---|------|-----------------|--------|---------------------|
| 32-bit integer | `"int"` | Active | `Number` (stored as double unless cast) / `Int32` | a 32-bit whole number, good for counts and quantities.|
| 64-bit integer | `"long"` | Active | `BigInt` / `Long` | A 64-bit whole number. JavaScript loses precision on numbers above 2^53, so use BigInt or the driver's Long class for these.|
|Decimal128 |`"decimal"`| Active |`Schema.Types.Decimal128` | An exact decimal number.|

**SPECIAL TYPES**

| Type | Alias (`$type`) | Status | Mongoose SchemaType | Description|
|---|------|-----------------|--------|---------------------|
| Binary data | `"binData"` | Active |`Buffer` / `UUID`|Raw bytes with a **subtype** byte describing the contents|
| Regular Expression | `"regex"` | Active | — | The regular expression data type is used to store regex patterns. |
| Timestamp | `"timestamp"` | used internally for replication. Don't use it for your app's dates; use Date instead.|
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



## 4. REFERENCES

- https://mongoosejs.com/docs/guide.html
- https://mongoosejs.com/docs/schematypes.html
- https://mongoosejs.com/docs/schematypes.html#type-key
- https://www.geeksforgeeks.org/mongodb/datatypes-in-mongodb/
- https://www.geeksforgeeks.org/mongodb/what-is-mongodb-working-and-features/
- https://www.mongodb.com/docs/php-library/current/reference/bson/
- https://www.geeksforgeeks.org/mongodb/what-is-bson/