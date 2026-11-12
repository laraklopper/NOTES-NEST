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
// Matches ADMIN_MIN_ACCOUNT_AGE_MS in server/util/schemaUtil.js
export const ADMIN_MIN_ACCOUNT_AGE_MS = process.env.NODE_ENV === 'production'
  ? 1000 * 60 * 60 * 24 * 90// 3 months (90 days) in production
  : 1000 * 60 * 60 * 24;// 1 day during development

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
//-----------AGE FUNCTIONS-----------
/* Age in whole years on today's date. A birthday that has not come round yet
this year has not been had, so the year difference is reduced by one.
Used by the registration form to hold users to a minimum age. */
export const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return null;// Nothing to work out an age from
    const dob = new Date(dateOfBirth);// Convert the date of birth into a Date object
    if (isNaN(dob.getTime())) return null;// An unreadable date has no age
    const now = new Date();// Get the current date
    let age = now.getFullYear() - dob.getFullYear();// Calculate age based on year difference
    const monthDifference = now.getMonth() - dob.getMonth();// Calculate month difference
    // If the user's birthday has not happened yet this year,
    if (monthDifference < 0 || (monthDifference === 0 && now.getDate() < dob.getDate())) {
        age--;// subtract 1 from the calculated age
    }
    return age;
};

/* Empty form values, shared by the initial state and the CLEAR FORM button.
Fields start empty and the user's current details are shown as placeholders,
so only the fields the user types into are sent */
export const emptyProfileForm = {
  username: '',
  fullName: {
    firstName: '',
    lastName: ''
  },
  contactDetails: {
    email: '',
    contactNumber: ''
  },
  defaultSourceLang: '',
  defaultTargetLang: '',
  defaultNoteLang: '',
  adminDataConsent: false
}