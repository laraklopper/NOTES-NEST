//app.js
/* Load environment variables from a .env 
file using the dotenv package*/
require('dotenv').config()
const ensureJwtSecret = require('./config/ensureJwtSecret');
ensureJwtSecret();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const app = express();

const port = process.env.PORT || 3001;

if (!port) {
    console.error('[ERROR: app.js] Port enviromental variable is missing');
    process.exit(1)// Exit the Node.js process with a non-zero exit code (1)
}

app.use(express.json())
app.use(express.urlencoded({extended:true}))
app.use(cors())
app.use(helmet())

