// apiUtil.js
/* GET /notes/fetchCalendar : the user's active notes for one month, grouped by day.
The browser's time zone is sent so notes land on the day they were written locally */
export const fetchCalendar = async (year, month) => { // month is 1–12
  const params = new URLSearchParams({ year: String(year), month: String(month) });
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;// e.g. 'Africa/Johannesburg'
  if (tz) params.set('tz', tz);

  const res = await fetch(`/notes/fetchCalendar?${params.toString()}`, {
    method: 'GET',
    credentials: 'include' // sends the httpOnly JWT cookie
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({})); // error body may not be JSON
    const error = new Error(data.message || `Request failed (${res.status})`);
    error.status = res.status; // 400, 401, 429, 500…
    throw error;
  }

  return res.json(); // → [{ date: '2026-11-16', count: 3, notes: [{ _id, title }] }]
};
