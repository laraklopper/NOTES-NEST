//calenderUtil.js
export const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']; // Monday-first week

export const buildMonthGrid = (year, month) => { // month is 0–11 (JS Date style)
  const offset = (new Date(year, month, 1).getDay() + 6) % 7; // Monday-first: Mon=0 … Sun=6
  const daysInMonth = new Date(year, month + 1, 0).getDate(); // day 0 of next month = last day of this month
  const cells = Array(offset).fill(null).concat(Array.from({ length: daysInMonth }, (_, i) => i + 1)); // blanks + 1..31
  while (cells.length % 7) cells.push(null); // pad the last week
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7)); // split into rows of 7
  return weeks;
};

export const toKey = (year, month, day) => // 'YYYY-MM-DD', matches the server's '%Y-%m-%d'
  `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

export const monthTitle = (year, month) => // "November 2026"
  new Date(year, month).toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' });

export const longDate = (key) => { // '2026-11-16' → "Monday, 16 November 2026"
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
};
