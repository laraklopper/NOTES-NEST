//dateFunctions.js
//-----------DATE FUNCTIONS----------
// Function to specify the date format
export const dateDisplay = (dateString) => {
    const options = {
        day: '2-digit',// Display day as two digit
        month: '2-digit',// Display month as two digits
        year: 'numeric',// Display year as four digits
        timeZone: 'Africa/Johannesburg'// Set the timezone
    }
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid date';
    return date.toLocaleDateString('en-GB', options);
}

//-----------TIME FUNCTIONS-----------
// Format time as hh:mm:ss
export const timeDisplay = (dateObj) => {
    return dateObj.toLocaleTimeString('en-GB', {
        hour: '2-digit',// Display hour as two digits
        minute: '2-digit',// Display minute as two digits
        second: '2-digit',// Display second as two digits
        hour12: false,// Use 24-hour format
        timeZone: 'Africa/Johannesburg'// Set the timezone
    });
};

/* Today in YYYY-MM-DD, used as the date input's upper bound so a date of birth
in the future cannot be picked. The schema rejects one anyway; stopping it here
saves a round trip. */
export const TODAY = new Date().toISOString().split('T')[0];