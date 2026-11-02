//userUtil.js

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

module.exports = {ADMIN_MIN_ACCOUNT_AGE_MS, ADMIN_MIN_AGE, calculateAge}