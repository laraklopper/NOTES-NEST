// noteRoutes.js
/*mounted at /notes by app.js
GET- /fetchNotes - fethc and list all notes for the specific user
GET - /:id - Get a single note by id
POST - /addNote - Create a note
*/
require('dotenv').config()
const express = require('express');