import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import { formatDate, formatDuration } from '../utils/dates';
import type { StrengthSet, CardioSet } from '../db/types';
import Button from '../components/common/Button';
import styles from './SessionDetailScreen.module.css';

export default function SessionDetailScreen() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const session = useLiveQuery(() =>
    sessionId ? db.sessions.get(sessionId) : undefined,
    [sessionId]
  );

  if (!session) {
    return (
      <div className="page">
        <button className={styles.backBtn} onClick={() => navigate('/history')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back
        </button>
        <p style={{ color: 'var(--text-muted)', marginTop: 20 }}>Session not found.</p>
      </div>
    );
  }

  return (
    <div className="page">
      <button className={styles.backBtn} onClick={() => navigate('/history')}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back
      </button>

      <div className={styles.header}>
        <h1 className={styles.title}>{session.templateName}</h1>
        <div className={styles.meta}>
          <span>{formatDate(session.date)}</span>
          {session.durationSeconds && (
            <span>{formatDuration(session.durationSeconds)}</span>
          )}
          <span className={`${styles.badge} ${styles[session.status]}`}>
            {session.status}
          </span>
        </div>
      </div>

      <div className={styles.actions}>
        <Button variant="secondary" onClick={() => navigate(`/history/${session.id}/edit`)}>
          Edit Session
        </Button>
      </div>

      <div className={styles.exercises}>
        {session.exerciseData.map((ex) => (
          <div key={ex.exerciseId} className={styles.exerciseCard}>
            <div className={styles.exHeader}>
              <h3 className={styles.exName}>{ex.exerciseName}</h3>
              <span className={styles.exType}>{ex.type}</span>
            </div>

            {ex.sets.length === 0 ? (
              <p className={styles.noSets}>No sets recorded</p>
            ) : (
              <div className={styles.setsTable}>
                <div className={styles.tableHeader}>
                  <span>Set</span>
                  {ex.type === 'strength' ? (
                    <>
                      <span>Weight</span>
                      <span>Reps</span>
                      <span>RIR</span>
                    </>
                  ) : (
                    <>
                      <span>Incline</span>
                      <span>Speed</span>
                      <span>Duration</span>
                    </>
                  )}
                </div>
                {ex.sets.map((set, i) => (
                  <div key={i} className={styles.tableRow}>
                    <span>{i + 1}</span>
                    {ex.type === 'strength' ? (
                      <>
                        <span>{(set as StrengthSet).weight} kg</span>
                        <span>{(set as StrengthSet).reps}</span>
                        <span>{(set as StrengthSet).rir}</span>
                      </>
                    ) : (
                      <>
                        <span>{(set as CardioSet).incline}</span>
                        <span>{(set as CardioSet).speed}</span>
                        <span>{(set as CardioSet).durationMinutes}m</span>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
