import { useState } from 'react';
import { getDaysInMonth, getFirstDayOfMonth } from '../../utils/dates';
import type { Session } from '../../db/types';
import styles from './CalendarView.module.css';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface CalendarViewProps {
  sessions: Session[];
  onSelectDate: (sessionId: string) => void;
}

export default function CalendarView({ sessions, onSelectDate }: CalendarViewProps) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  // Build date -> session lookup
  const sessionMap = new Map<string, Session>();
  for (const s of sessions) {
    // For a given day, prefer completed over skipped
    const existing = sessionMap.get(s.date);
    if (!existing || (s.status === 'completed' && existing.status !== 'completed')) {
      sessionMap.set(s.date, s);
    }
  }

  function prevMonth() {
    if (month === 0) { setYear((y) => y - 1); setMonth(11); }
    else setMonth((m) => m - 1);
  }

  function nextMonth() {
    if (month === 11) { setYear((y) => y + 1); setMonth(0); }
    else setMonth((m) => m + 1);
  }

  const monthLabel = new Date(year, month).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className={styles.container}>
      <div className={styles.nav}>
        <button className={styles.navBtn} onClick={prevMonth}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span className={styles.monthLabel}>{monthLabel}</span>
        <button className={styles.navBtn} onClick={nextMonth}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="9 6 15 12 9 18" />
          </svg>
        </button>
      </div>

      <div className={styles.grid}>
        {WEEKDAYS.map((d) => (
          <div key={d} className={styles.weekday}>{d}</div>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} className={styles.cell} />;
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const session = sessionMap.get(dateStr);
          const isToday =
            day === now.getDate() && month === now.getMonth() && year === now.getFullYear();

          return (
            <button
              key={dateStr}
              className={`${styles.cell} ${styles.dayCell} ${isToday ? styles.today : ''}`}
              onClick={() => session?.status === 'completed' && onSelectDate(session.id)}
              disabled={!session || session.status !== 'completed'}
            >
              <span className={styles.dayNum}>{day}</span>
              {session && (
                <span
                  className={`${styles.dot} ${
                    session.status === 'completed' ? styles.dotGreen : styles.dotYellow
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
