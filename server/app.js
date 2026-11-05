//app.js
/* Load environment variables from a .env 
file using the dotenv package*/
require('dotenv').config()
/* Custom security utility
 Guarantees JWT_SECRET_KEY enviromental variable exists
 Generates one automatically if missing (dev)
 Prevents app from running insecurely */
const ensureJwtSecret = require('./config/ensureJwtSecret');
ensureJwtSecret();// Ensures JWT secret key before anything else loads

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');// Reads the JWT cookie into req.cookies
const connectDB = require('./config/connect')
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const noteRoutes = require('./routes/noteRoutes')
const tagRoutes = require('./routes/tagRoutes')
const apiRoutes = require('./routes/apiRoutes')
const translationRoutes = require('./routes/translationRoutes')
const app = express();// Create an Express application

// Extract enviromental variables
const port = process.env.PORT || 3001;

//=====CHECK IF ALL THE ENVIRONMENTAL VARIABLES A PRESENT=========
// Conditional rendering to check if the environmental variables are missing
if (!port) {
    console.error('[ERROR: app.js] Port enviromental variable is missing');
    process.exit(1)// Exit the Node.js process with a non-zero exit code (1)
}

// =======GLOBAL MIDDLEWARE===============
app.use(express.json())
app.use(express.urlencoded({extended:true}))
app.use(cookieParser())
app.use(cors())
app.use(helmet())

// =======ROUTES===========
// Prefix all route modules with their base path.
app.use('/auth', authRoutes);// /auth/login, /auth/register, /auth/logout
app.use('/user', userRoutes);// /user/me, /user/fetchUsers
app.use('/notes', noteRoutes)
app.use('/tag', tagRoutes)
app.use('/api', apiRoutes)// Langbly: /api/language/translate/v2, /detect, /languages
app.use('/translation', translationRoutes)// /translation/save
// ================== MONGOOSE CONFIG ==================
/* Disable strict populate to prevent errors when populating 
paths that are conditionally defined*/
mongoose.set('strictPopulate', false);
//=============START THE SERVER=============
// Connect to MongoDB first; only start listening once the DB is available.
// This avoids “server started but DB is down” race conditions.
connectDB().then(() => {
    app.listen(port, () => {
        console.info(`[INFO:app.js] server is running on ${port}`)// Log a message in the console indicating the server is running
    })
}).catch((error) => {
     console.error('[ERROR: app.js]: Database connection failed');// Log an error message in the console for debugging purposes
    process.exit();//Exit if connection failed
})