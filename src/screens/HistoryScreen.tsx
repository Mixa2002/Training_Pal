import { useState, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import type { Session } from '../db/types';
import CalendarView from '../components/history/CalendarView';
import ConsistencyStats from '../components/history/ConsistencyStats';
import EmptyState from '../components/common/EmptyState';

const ExerciseChart = lazy(() => import('../components/history/ExerciseChart'));
const VolumeChart = lazy(() => import('../components/history/VolumeChart'));
import styles from './HistoryScreen.module.css';

interface ExerciseOption {
  id: string;
  name: string;
}

function getUniqueExercises(sessions: Session[]): ExerciseOption[] {
  const seen = new Map<string, string>();
  for (const s of sessions) {
    if (s.status !== 'completed') continue;
    for (const ex of s.exerciseData) {
      if (ex.type === 'strength' && !seen.has(ex.exerciseId)) {
        seen.set(ex.exerciseId, ex.exerciseName);
      }
    }
  }
  return Array.from(seen, ([id, name]) => ({ id, name })).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
}

export default function HistoryScreen() {
  const navigate = useNavigate();
  const sessions = useLiveQuery(() => db.sessions.toArray());
  const [selectedExercise, setSelectedExercise] = useState<ExerciseOption | null>(null);

  if (!sessions) return null;

  const exerciseOptions = getUniqueExercises(sessions);

  // Auto-select first exercise if none selected
  if (!selectedExercise && exerciseOptions.length > 0) {
    // Use timeout to avoid setting state during render
    setTimeout(() => setSelectedExercise(exerciseOptions[0]), 0);
  }

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

        {exerciseOptions.length > 0 && (
          <div className={styles.chartSection}>
            <div className={styles.exercisePicker}>
              <label className={styles.pickerLabel}>Exercise</label>
              <select
                value={selectedExercise?.id ?? ''}
                onChange={(e) => {
                  const opt = exerciseOptions.find((o) => o.id === e.target.value);
                  setSelectedExercise(opt ?? null);
                }}
                className={styles.select}
              >
                {exerciseOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedExercise && (
              <Suspense fallback={null}>
                <ExerciseChart
                  sessions={sessions}
                  exerciseId={selectedExercise.id}
                  exerciseName={selectedExercise.name}
                />
              </Suspense>
            )}
          </div>
        )}

        <Suspense fallback={null}>
          <VolumeChart sessions={sessions} />
        </Suspense>
      </div>
    </div>
  );
}
