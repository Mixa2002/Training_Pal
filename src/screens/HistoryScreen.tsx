import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import CalendarView from '../components/history/CalendarView';
import ConsistencyStats from '../components/history/ConsistencyStats';
import EmptyState from '../components/common/EmptyState';
import styles from './HistoryScreen.module.css';

export default function HistoryScreen() {
  const navigate = useNavigate();
  const sessions = useLiveQuery(() => db.sessions.toArray());

  if (!sessions) return null;

  if (sessions.length === 0) {
    return (
      <div className="page">
        <h1 className="page-title">History</h1>
        <EmptyState
          title="No history yet"
          description="Complete your first workout to see your training history."
        />
      </div>
    );
  }

  return (
    <div className="page">
      <h1 className="page-title">History</h1>

      <div className={styles.sections}>
        <CalendarView
          sessions={sessions}
          onSelectDate={(sessionId) => navigate(`/history/${sessionId}`)}
        />

        <ConsistencyStats sessions={sessions} />
      </div>
    </div>
  );
}
