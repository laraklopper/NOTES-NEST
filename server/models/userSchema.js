const mongoose = require('mongoose');
const {languageData} = require('../util/langaugeData')
//============REGULAR EXPRESSIONS=============
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;// Regular expression for validating email formats
const phoneRegex = /^(\+27|0)\d{2}[ ]?\d{3}[ ]?\d{4}$/;// Regular expression for validating South African phone numbers

// Normalize SA phone to a consistent format for uniqueness
function normalizePhoneSA(phone) {
    if (!phone) return phone;

    let p = String(phone).trim().replace(/\s+/g, '');// Remove all spaces

    if (p.startsWith('0')) {
        p = '+27' + p.slice(1);
    }
    return p;
}


/* Valid language codes, derived from the Langbly language list rather than
written out again here, so the enums stay correct when that list changes.

A source language may also be "auto", which asks the provider to detect it.
A target language may not: there is nothing to detect on the way out. */
const LANGUAGE_CODES = languageData.map((lang) => lang.code);
const SOURCE_LANGUAGE_CODES = ['auto', ...LANGUAGE_CODES];

//Define user schema
const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: [3, 'Username must be at least 3 characters long'],
        maxlength: [30, 'Username cannot exceed 30 characters'],
        match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'],// Regular expression to allow only letters, numbers, and underscores
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
    //==========NESTED CONTACT DETAILS OBJECT==================
    contactDetails: {
        //Field for email
        email: {
            type: String,
            required: [true, 'Email address is required'],
            lowercase: true,
            trim: true,
            validate: {
                validator: (v) => emailRegex.test(v),
                message: (props) => `${props.value} is not a valid email address`
            },
        },
         //Field for phone number
        contactNumber: {
            type: String,
            required: [true, 'Phone number is required'],
            unique: true,
            trim: true,
            validate: {
                validator: (v) => phoneRegex.test(v),
                 message: 'Invalid South African contact number (e.g., +27 82 123 4567 or 082 123 4567)' 
            },
        },
    },
    // =========NESTED DEFAULT LANGUAGES OBJECT=======
    defaultLanguages: {
        // Field for Default Source Langauge
        defaultSourceLanguage:{
            type: String,
            default: 'auto',
            required: false,
            trim: true,
            set: (v) => (v === ''? undefined: v),
            enum: {
                values: SOURCE_LANGUAGE_CODES,
                 message: '{VALUE} is not a language the translation provider supports',
            }
        },
        // Field for Default Target Langauge
        defaultTargetLanguage: {
                type: String,
                default: "fr",
                required: false,
                trim: true,
                set: (v) => (v === '' ? undefined : v),
                enum: {
                    values: LANGUAGE_CODES,
                    message: '{VALUE} is not a language the translation provider supports',
                },
                },
        },
    
     /*Field for Date of Birth
     minimum age 13 years, minimum admin age 21 years*/
    dateOfBirth: {
        type: Date,// specify data type as date
        required: [true, 'Date of birth is required'],
        // Date of Birth validation
        validate: {
            validator: function (value) {
                if (!value || value > new Date()) return false;             
                const today = new Date();
                let age = today.getFullYear() - value.getFullYear();
                const m = today.getMonth() - value.getMonth();
                if (m < 0 || (m === 0 && today.getDate() < value.getDate())) {
                    age--;
                }
                return age >= 13;
            },
            message: 'User must be at least 13 years old',
        },
    },
     /*Password field
     Plaintext password used during development
     hash password using custom middleware function
    */
    password: {
        type: String,
        required: [true, 'User password is required'],
        minlength: [8, 'Password must be at least 8 characters long'],
        maxlength: [1024, 'Password cannot exceed 1024 characters'],
        select: false,
    },
    adminDataConsent: {
        type: Boolean,
        required: [true, 'Consent for admin users to see your details is required'],
        validate: {
            validator: (v) => v === true,
            message: 'You must consent to admin users seeing your details to register'
        }
    },

    // Optional admin field
    admin:{// admin field to indicate if the user has administrative privileges
        type:Boolean,
        default: false,
    }

},{
    timestamps: true,
    toJSON: {virtuals: true},
    toObject: {virtuals: true}
});

//===============VIRTUALS==========================
// Virtual field to return full name as a single string
userSchema.virtual('fullNameString').get(function () {
    const { firstName, lastName } = this.fullName;
    return `${firstName} ${lastName}`.trim();
});

// Virtual to generate a contact details string
userSchema.virtual('contactDetailsString').get(function () {
    const { email = '', phone = '' } = this.contactDetails;
    return `Email: ${email}, Phone: ${phone}`;
});

// ============ NORMALIZATION HOOK ==============
// Runs before validation so unique comparisons are consistent.
// - username -> lowercase
// - email -> lowercase
// - phone -> normalized to +27xxxxxxxxx
userSchema.pre('validate', function (next) {
    if (this.username) this.username = String(this.username).trim().toLowerCase();
    if (this.contactDetails?.email) {
        this.contactDetails.email = String(this.contactDetails.email).trim().toLowerCase();
    }
    if (this.contactDetails?.phone) {
        this.contactDetails.phone = normalizePhoneSA(this.contactDetails.phone);
    }   
});


module.exports = mongoose.model('User', userSchema)