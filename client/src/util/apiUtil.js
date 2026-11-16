export const fetchCalendar = async (year, month) => { // month is 1–12
  const res = await fetch(`/notes/fetchCalendar?year=${year}&month=${month}`, {
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