import type { Session } from '../../db/types';
import { getWeekRange, getMonthRange } from '../../utils/dates';
import styles from './ConsistencyStats.module.css';

interface ConsistencyStatsProps {
  sessions: Session[];
}

export default function ConsistencyStats({ sessions }: ConsistencyStatsProps) {
  const week = getWeekRange();
  const month = getMonthRange();

  const weekSessions = sessions.filter((s) => s.date >= week.start && s.date <= week.end);
  const monthSessions = sessions.filter((s) => s.date >= month.start && s.date <= month.end);

  const weekCompleted = weekSessions.filter((s) => s.status === 'completed').length;
  const weekSkipped = weekSessions.filter((s) => s.status === 'skipped').length;
  const monthCompleted = monthSessions.filter((s) => s.status === 'completed').length;
  const monthSkipped = monthSessions.filter((s) => s.status === 'skipped').length;

  return (
    <div className={styles.container}>
      <div className={styles.row}>
        <span className={styles.label}>This week</span>
        <span className={styles.value}>
          <span className={styles.completed}>{weekCompleted}</span> completed
          {weekSkipped > 0 && (
            <>, <span className={styles.skipped}>{weekSkipped}</span> skipped</>
          )}
        </span>
      </div>
      <div className={styles.row}>
        <span className={styles.label}>This month</span>
        <span className={styles.value}>
          <span className={styles.completed}>{monthCompleted}</span> completed
          {monthSkipped > 0 && (
            <>, <span className={styles.skipped}>{monthSkipped}</span> skipped</>
          )}
        </span>
      </div>
    </div>
  );
}
