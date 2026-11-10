//userUtil.js
/* Request body fields the edit profile form may change, mapped to their path in the
userSchema. dateOfBirth, password, adminDataConsent and admin are left out on purpose,
so a client cannot change them by adding them to the request body */
const EDITABLE_PROFILE_FIELDS = {
    username: 'username',
    firstName: 'fullName.firstName',
    lastName: 'fullName.lastName',
    email: 'contactDetails.email',
    contactNumber: 'contactDetails.contactNumber',
    defaultSourceLang: 'defaultLanguages.defaultSourceLanguage',
    defaultTargetLang: 'defaultLanguages.defaultTargetLanguage',
    defaultNoteLang: 'defaultLanguages.defaultNoteLanguage'
};
// Calculate a user's age in years from their date of birth
const calculateAge = (dateOfBirth) => {
    const dob = new Date(dateOfBirth);
    const now = new Date();
    return now.getFullYear() - dob.getFullYear() - (
        now < new Date(now.getFullYear(), dob.getMonth(), dob.getDate()) ? 1 : 0
    );
}
// Admin requirements (AdminRegisForm.js)
const ADMIN_MIN_AGE = 21;// Admin users must be 21 or older
const ADMIN_MIN_ACCOUNT_AGE_MS = 24 * 60 * 60 * 1000;// User for 1 day during development (3 months in production)

/* Hash a reset token with SHA-256. Only the hash is stored on the user
document, so a leaked database cannot be used to reset anyone's password:
the raw token exists only in the email that was sent. SHA-256 (rather than
bcrypt) is enough here because the token is 256 bits of random data, not a
guessable, human-chosen secret. */
const hashResetToken = (token) => crypto.createHash('sha256').update(token).digest('hex');
module.exports = {ADMIN_MIN_ACCOUNT_AGE_MS, ADMIN_MIN_AGE, calculateAge, hashResetToken, EDITABLE_PROFILE_FIELDS}