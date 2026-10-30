const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: {},
    fullName: {
        firstName: {},
        lastName: {},
    },
    contactDetails: {
        email: {},
        phone: {},
    },
    dateOfBirth: {},
    password: {},
    admin: {}
},{
    timestamps: true,
    toJSON: {virtuals: true},
    toObject: {virtuals: true}
});