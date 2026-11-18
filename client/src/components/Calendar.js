//Calendar.js
import React, { useEffect, useRef, useState } from 'react'
import '../css/componentCss/Calender.css'
import Button from 'react-bootstrap/Button';
import Table from 'react-bootstrap/Table';
import Badge from 'react-bootstrap/Badge';
import Alert from 'react-bootstrap/Alert';
import Stack from 'react-bootstrap/Stack';
import { DAY_NAMES, buildMonthGrid, toKey, monthTitle, longDate } from '../util/calenderUtil'
import { fetchCalendar } from '../util/apiUtil'
import { CalendarChevronsLeft , CalendarChevronsRight  } from 'lucide-react';

export default function Calendar({ onSelectDay, selectedDate }) {
  const today = new Date()
  const todayKey = toKey(today.getFullYear(), today.getMonth(), today.getDate())

  const [view, setView] = useState({ year: today.getFullYear(), month: today.getMonth() })// month 0–11
  const [days, setDays] = useState({}); // { '2026-11-16': { date, count, notes: [{ _id, title }] } }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  /* Latest props, read inside the fetch without re-running it when they change */
  const selectedRef = useRef(selectedDate)
  const onSelectRef = useRef(onSelectDay)
  selectedRef.current = selectedDate
  onSelectRef.current = onSelectDay

  useEffect(() => {
    let ignore = false; // drops stale responses when the month is changed quickly
    setLoading(true);
    setError('');
    const monthPrefix = toKey(view.year, view.month, 1).slice(0, 8); // e.g. '2026-11-'
    fetchCalendar(view.year, view.month + 1) // server expects 1–12
      .then(data => {
        if (ignore) return;
        const lookup = Object.fromEntries(data.map(d => [d.date, d])); // array → lookup object
        setDays(lookup);
        /* If the selected day is in this month, send its fresh notes to the side panel
        (e.g. "Today" pressed from another month, or notes added since it was picked) */
        const selected = selectedRef.current;
        if (selected?.startsWith(monthPrefix)) {
          onSelectRef.current?.(selected, lookup[selected]?.notes || []);
        }
      })
      .catch(() => { if (!ignore) { setDays({}); setError('Could not load calendar'); } })
      .finally(() => { if (!ignore) setLoading(false); });
    return () => { ignore = true; }; // cleanup runs before the next fetch
  }, [view]);

  const changeMonth = step => setView(({ year, month }) => {
    const d = new Date(year, month + step, 1); // Date handles Dec → Jan rollover
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const goToday = () => {
    selectedRef.current = todayKey; // so the fetch below fills in today's notes
    onSelectDay?.(todayKey, days[todayKey]?.notes || []); // select today now (corrected once the month loads)
    setView({ year: today.getFullYear(), month: today.getMonth() }); // new object, so the month always reloads
  };

  const selectDay = (key, info) => onSelectDay?.(key, info?.notes || [])

  const monthTotal = Object.values(days).reduce((sum, d) => sum + d.count, 0); // notes this month

  //======JSX RENDERING========
  return (
    <div id='calendarWrapper'>
      {/* ----- HEADER: month navigation ----- */}
      <div id='calenderHeadBlock'>
       <Stack gap={3} id='calendarHeadStack'>
       <div className="p-2" id='monthHead'>
          <h5 className='mb-0' id='calendarTitle'>{monthTitle(view.year, view.month)}</h5>
          <p id='monthNoteTotal' aria-live='polite'>{loading ? 'Loading…' : `${monthTotal} note${monthTotal === 1 ? '' : 's'} this month`}</p>
      </div>
      <div className="p-2" id='monthNavBlock'>
        <Button 
        variant='secondary' 
        id='prevMonthBtn' 
        type='button'
        size='sm' 
        onClick={() => changeMonth(-1)} 
        aria-label='Previous month'
        >
        <CalendarChevronsLeft  size={16} fontWeight={700} aria-hidden='true' focusable='false'/>
        </Button>
        <div id='monthBtnDiv'>
          <Button variant='primary' id='toTodayBtn' onClick={goToday}>Today</Button>
          <Button 
          variant='secondary' 
          id='nextMonthBtn'
          size='sm' 
          onClick={() => changeMonth(1)} 
          aria-label='Next month'
          >
          <CalendarChevronsRight  size={16} fontWeight={700} aria-hidden='true' focusable='false'/>
          </Button>
        </div>
      </div>
      
    </Stack>
        
      </div>

      {error && <Alert variant='danger' className='py-1'>{error}</Alert>}

      {/* ----- MONTH GRID ----- */}
      <Table bordered className='mb-0 calendarTable' aria-labelledby='calendarTitle'>
        <thead>
          <tr className='text-center'>
            {DAY_NAMES.map(n => <th key={n} className='small'>{n}</th>)}
          </tr>
        </thead>
        <tbody>
          {buildMonthGrid(view.year, view.month).map((week, w) => (
            <tr key={w}>
              {week.map((day, i) => {
                if (!day) return <td key={i} className='calendarBlank' />; // blank cell outside the month

                const key = toKey(view.year, view.month, day);
                const info = days[key];
                const isToday = key === todayKey;
                const isSelected = key === selectedDate;

                return (
                  <td
                    key={i}
                    role='button'
                    tabIndex={0} // keyboard accessible
                    aria-label={`${longDate(key)}${info ?`, ${info.count} note${info.count === 1 ? '' : 's'}` : ''}`}
                    aria-pressed={isSelected}
                    onClick={() => selectDay(key, info)}
                    onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), selectDay(key, info))}
                    className={`calendarDay${isSelected ? ' calendarSelected' : ''}`}
                  >
                    <div className='small fw-bold'>
                      {isToday ? <Badge bg='primary'>{day}</Badge> : day}
                    </div>

                    {info && (
                      <>
                        <Badge bg='success' className='d-md-none'>{info.count}</Badge> {/* mobile: count only */}
                        <div className='small d-none d-md-block'> {/* tablet/desktop: titles */}
                          {info.notes.slice(0, 2).map(n => (
                            <div key={n._id} className='text-truncate' title={n.title}>{n.title}</div> // first two titles
                          ))}
                          {info.count > 2 && <div className='text-muted'>+{info.count - 2} more</div>} {/* overflow hint */}
                        </div>
                      </>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  )
}
