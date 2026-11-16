import React, { useEffect, useState } from 'react'
import '../css/pagesCss/Calender.css'
// import Button from 'react-bootstrap/Button';
import { toKey } from '../util/calenderUtil'
import { fetchCalendar } from '../util/apiUtil'
export default function Calendar({onSelectDay, selectedDate}) {
  const today = new Date()
  const todayKey = toKey(today.getFullYear() , today.getMonth(), today.getDate())

  const [view, setView] = useState({year: todayKey.getFullYear(), month: today.getMonth()})// month 0–11
  const [days, setDays] = useState({}); // { '2026-11-16': { date, count, notes: [{ _id, title }] } }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');


  useEffect(() => {
    let ignore = false; // drops stale responses when the month is changed quickly
    setLoading(true);
    setError('');
    fetchCalendar // server expects 1–12
      .then(data => { if (!ignore) setDays(Object.fromEntries(data.map(d => [d.date, d]))); }) // array → lookup object
      .catch(() => { if (!ignore) setError('Could not load calendar'); })
      .finally(() => { if (!ignore) setLoading(false); });
    return () => { ignore = true; }; // cleanup runs before the next fetch
  }, [view]);

  const changeMonth = step => setView(({ year, month }) => {
    const d = new Date(year, month + step, 1); // Date handles Dec → Jan rollover
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const goToday = () => {
    setView({ year: today.getFullYear(), month: today.getMonth() });
    onSelectDay?.(todayKey, days[todayKey]?.notes || []); // also select today
  };

  const monthTotal = Object.values(days).reduce((sum, d) => sum + d.count, 0); // notes this month
  return (
    <div id='calendar'>
      
        




    </div>
  )
}
