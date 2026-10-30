const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: {},
    fullName: {},
    contactDetails: {},
    dateOfBirth: {},
    password: {},
    admin: {}
});