//connect.js
/* Load environment variables from a .env 
file using the dotenv package*/
require('dotenv').config();
// IMPORT REQUIRED MODULES AND PACKAGES
const mongoose = require('mongoose');

// Extract Enviromental variables
const uri = process.env.DATABASE_URL;
const database = process.env.DATABASE_NAME;

// ============================================
if (!uri || !database) {
    console.error('[ERROR: connect.js] Missing enviromental variables: DATABASE_URL or DATABASE_NAME');
    process.exit(1)
}

// =======================================
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

// ================== MONGOOSE CONNECTION EVENT LISTENERS ==================

// Fired if an error occurs after initial connection
mongoose.connection.on('error', (error) => {
    console.error(`[ERROR: connect.js] Error connecting to MongoDb database. Exiting now...`, error);//Log an error message in the console if connection error occurs
    process.exit(1);// Exit to prevent app running without DB
})

// Fired when MongoDB disconnects (network issue, restart, etc.)
mongoose.connection.on('disconnected', () => {
    console.warn(
        '[WARNING: connectDB.js] MongoDB disconnected! Attempting reconnection...'
    );//Log a warning message in the console if the connection is disconnected
    
    connectDB();// Attempt to reconnect automatically
});

// Fired when MongoDB successfully reconnects
mongoose.connection.on("reconnected", () => {
    console.log("[INFO: connectDB.js] MongoDB Reconnected!");//Log a message in the console on reconnection
});

// Fired once when the connection is fully opened
mongoose.connection.once('open', async () => {
    console.log("[SUCCESS: connectDB.JS] Database connection established");//Log a message in the console if the connection is successful
});

// ================== EXPORT ==================
// Export the connection function so it can be used in app.js / server.js
module.exports = connectDB;