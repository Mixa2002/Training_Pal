import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import { todayString } from '../utils/dates';
import CalendarView from '../components/history/CalendarView';
import ConsistencyStats from '../components/history/ConsistencyStats';
import EmptyState from '../components/common/EmptyState';
import Button from '../components/common/Button';
import styles from './HistoryScreen.module.css';

export default function HistoryScreen() {
  const navigate = useNavigate();
  const sessions = useLiveQuery(() => db.sessions.toArray());
  const templates = useLiveQuery(() => db.templates.toArray());
  const [showLogPicker, setShowLogPicker] = useState(false);
  const [logDate, setLogDate] = useState(todayString());
  const [logTemplateId, setLogTemplateId] = useState('');

  if (!sessions) return null;

  function startManualLog() {
    if (!logDate || !logTemplateId) return;
    navigate(`/workout?date=${logDate}&templateId=${logTemplateId}`);
  }

  return (
    <div className="page">
      <div className={styles.headerRow}>
        <h1 className={styles.title}>History</h1>
        <Button variant="secondary" onClick={() => setShowLogPicker((v) => !v)}>
          + Log
        </Button>
      </div>

      {showLogPicker && (
        <div className={styles.logPicker}>
          <h3 className={styles.logPickerTitle}>Log Past Workout</h3>
          <div className={styles.logField}>
            <label className={styles.logLabel}>Date</label>
            <input
              type="date"
              value={logDate}
              onChange={(e) => setLogDate(e.target.value)}
              max={todayString()}
              className={styles.dateInput}
            />
          </div>
          <div className={styles.logField}>
            <label className={styles.logLabel}>Template</label>
            <select
              value={logTemplateId}
              onChange={(e) => setLogTemplateId(e.target.value)}
              className={styles.select}
            >
              <option value="">Select template...</option>
              {templates?.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div className={styles.logActions}>
            <Button variant="ghost" onClick={() => setShowLogPicker(false)}>
              Cancel
            </Button>
            <Button disabled={!logDate || !logTemplateId} onClick={startManualLog}>
              Start
            </Button>
          </div>
        </div>
      )}

      {sessions.length === 0 && !showLogPicker ? (
        <EmptyState
          title="No history yet"
          description="Complete your first workout to see your training history."
        />
      ) : (
        <div className={styles.sections}>
          <CalendarView
            sessions={sessions}
            onSelectDate={(sessionId) => navigate(`/history/${sessionId}`)}
          />

          <ConsistencyStats sessions={sessions} />
        </div>
      )}
    </div>
  );
}
