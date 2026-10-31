// middleware.js
/* Load environment variables from a .env 
file using the dotenv package*/
require('dotenv').config();
// Import Required modules and packages
const jwt = require('jsonwebtoken');// Import the JSON Web Token (JWT) library


const secretKey = process.env.JWT_SECRET_KEY || 'secretKey';


/*/ =============================

=/*/