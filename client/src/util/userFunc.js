// userFunc.js
/*===============================
ADMIN RULES
============================*/
// Admin users take on other people's records, so they are held to a higher age
export const ADMIN_MIN_AGE = 21
export const USER_MIN_AGE = 13
export const ADMIN_STATUS = ['YES', 'NO']
/* The time the required before the user can 
register as admin */
export const ADMIN_MIN_ACCOUNT_AGE_MS = 24 * 60 * 60 * 1000;// User for 1 day during development (3 months in production)

// ====PASSWORDS==============
/* True when a password is at least 8 characters and includes at least one
special character. */
export const isStrongPassword = (pwd) => {
  //Regex pattern to check for at least 8 characters and one special character
  return /^(?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z\d!@#$%^&*(),.?":{}|<>]{8,}$/
    .test(
      String(pwd || '')// Ensure pwd is a string before testing
    );
}