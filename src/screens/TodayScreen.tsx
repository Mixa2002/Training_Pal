import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import { todayString, formatDate, formatDuration } from '../utils/dates';
import { generateId } from '../utils/uuid';
import Button from '../components/common/Button';
import EmptyState from '../components/common/EmptyState';
import styles from './TodayScreen.module.css';

export default function TodayScreen() {
  const navigate = useNavigate();
  const cycle = useLiveQuery(() => db.programCycle.get('active'));
  const templates = useLiveQuery(() => db.templates.toArray());

  const templateMap = new Map(templates?.map((t) => [t.id, t]) ?? []);
  const currentTemplateId = cycle?.sequence?.[cycle.currentIndex];
  const currentTemplate = currentTemplateId ? templateMap.get(currentTemplateId) : null;

  const doneToday = cycle?.lastCompletedDate === todayString();

  const lastSession = useLiveQuery(async () => {
    if (!currentTemplateId) return null;
    const sessions = await db.sessions
      .where('templateId')
      .equals(currentTemplateId)
      .filter((s) => s.status === 'completed')
      .reverse()
      .sortBy('date');
    return sessions[0] ?? null;
  }, [currentTemplateId]);

  async function handleSkip() {
    if (!cycle || cycle.sequence.length === 0) return;
    await db.sessions.add({
      id: generateId(),
      templateId: cycle.sequence[cycle.currentIndex],
      templateName: currentTemplate?.name ?? 'Unknown',
      date: todayString(),
      status: 'skipped',
      startedAt: null,
      finishedAt: null,
      durationSeconds: null,
      exerciseData: [],
    });
    const nextIndex = (cycle.currentIndex + 1) % cycle.sequence.length;
    await db.programCycle.update('active', {
      currentIndex: nextIndex,
      lastCompletedDate: todayString(),
    });
  }

  // No program set up
  if (!cycle || cycle.sequence.length === 0) {
    return (
      <div className="page">
        <h1 className="page-title">Today</h1>
        <EmptyState
          title="No program set up"
          description="Create workout templates and set up your program cycle to get started."
          action={
            <Button onClick={() => navigate('/templates')}>
              Set Up Program
            </Button>
          }
        />
      </div>
    );
  }

  // Already trained today
  if (doneToday) {
    const nextTemplateId = cycle.sequence[cycle.currentIndex];
    const nextTemplate = templateMap.get(nextTemplateId);
    return (
      <div className="page">
        <h1 className="page-title">Today</h1>
        <div className={styles.doneCard}>
          <div className={styles.checkIcon}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <h2 className={styles.doneTitle}>You're done for today</h2>
          <p className={styles.doneNext}>
            Next up: <strong>{nextTemplate?.name ?? 'Unknown'}</strong>
          </p>
        </div>
      </div>
    );
  }

  // Show today's workout
  return (
    <div className="page">
      <h1 className="page-title">Today</h1>

      <div className={styles.workoutCard}>
        <h2 className={styles.workoutName}>{currentTemplate?.name ?? 'Unknown'}</h2>
        <p className={styles.workoutMeta}>
          {currentTemplate?.exercises.length ?? 0} exercise
          {(currentTemplate?.exercises.length ?? 0) !== 1 ? 's' : ''}
          {' · '}Day {cycle.currentIndex + 1} of {cycle.sequence.length}
        </p>

        {currentTemplate && (
          <div className={styles.exercisePreview}>
            {currentTemplate.exercises.map((ex, i) => (
              <div key={ex.id} className={styles.previewRow}>
                <span className={styles.previewNum}>{i + 1}</span>
                <span className={styles.previewName}>{ex.name}</span>
                <span className={styles.previewDetail}>
                  {ex.type === 'strength'
                    ? `${ex.sets} set${ex.sets !== 1 ? 's' : ''}`
                    : `${ex.durationMinutes}min`}
                </span>
              </div>
            ))}
          </div>
        )}

        {lastSession && (
          <div className={styles.lastSession}>
            <span className={styles.lastLabel}>Last session</span>
            <span className={styles.lastDate}>{formatDate(lastSession.date)}</span>
            {lastSession.durationSeconds && (
              <span className={styles.lastDuration}>
                {formatDuration(lastSession.durationSeconds)}
              </span>
            )}
          </div>
        )}
      </div>

      <div className={styles.actions}>
        <Button fullWidth onClick={() => navigate('/workout')}>
          Start Workout
        </Button>
        <Button variant="secondary" fullWidth onClick={handleSkip}>
          Skip Today
        </Button>
      </div>
    </div>
  );
}
