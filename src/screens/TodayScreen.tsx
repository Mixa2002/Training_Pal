import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import { addDays, compareDateStrings, todayString, formatDate, formatDuration } from '../utils/dates';
import { generateId } from '../utils/uuid';
import { clearWorkoutDraft, getWorkoutDraftDate, loadWorkoutDraft } from '../utils/workoutDraft';
import { buildSessionExerciseSnapshot, isHandledSession } from '../utils/sessions';
import type { Session } from '../db/types';
import Button from '../components/common/Button';
import EmptyState from '../components/common/EmptyState';
import ConfirmDialog from '../components/common/ConfirmDialog';
import styles from './TodayScreen.module.css';

export default function TodayScreen() {
  const navigate = useNavigate();
  const [isSyncingMissedDays, setIsSyncingMissedDays] = useState(false);
  const [showSkipOptions, setShowSkipOptions] = useState(false);
  const [showDiscardDraft, setShowDiscardDraft] = useState(false);
  const cycle = useLiveQuery(() => db.programCycle.get('active'));
  const templates = useLiveQuery(() => db.templates.toArray());
  const todaySessions = useLiveQuery(() =>
    db.sessions.where('date').equals(todayString()).toArray()
  );
  const lastHandledDate = useLiveQuery(async () => {
    const sessions = await db.sessions.orderBy('date').reverse().toArray();
    return sessions.find(isHandledSession)?.date ?? null;
  });

  const templateMap = new Map(templates?.map((t) => [t.id, t]) ?? []);
  const currentTemplateId = cycle?.sequence?.[cycle.currentIndex];
  const currentTemplate = currentTemplateId ? templateMap.get(currentTemplateId) : null;
  const draft = loadWorkoutDraft();
  const today = todayString();
  const draftDate = draft ? getWorkoutDraftDate(draft) : null;
  const resumableDraft =
    draft?.mode === 'today' &&
    draftDate === today &&
    draft.templateId === currentTemplateId
      ? draft
      : null;
  const handledTodaySessions = todaySessions?.filter(isHandledSession) ?? [];

  const doneToday = handledTodaySessions.length > 0;
  const todayOutcome =
    handledTodaySessions.find((session) => session.status === 'completed') ??
    handledTodaySessions[handledTodaySessions.length - 1] ??
    null;

  useEffect(() => {
    let cancelled = false;

    async function syncMissedDays() {
      if (!cycle || cycle.sequence.length === 0 || !templates || lastHandledDate === undefined) return;

      if (
        draft?.mode === 'today' &&
        draftDate &&
        (compareDateStrings(draftDate, today) < 0 || draft.templateId !== currentTemplateId)
      ) {
        clearWorkoutDraft();
      }

      const firstUnhandledDate = addDays(lastHandledDate ?? addDays(cycle.startDate, -1), 1);
      if (compareDateStrings(firstUnhandledDate, today) >= 0) {
        return;
      }

      if (!cancelled) {
        setIsSyncingMissedDays(true);
      }

      const lastMissedDate = addDays(today, -1);
      const existingSessions = await db.sessions
        .where('date')
        .between(firstUnhandledDate, lastMissedDate, true, true)
        .sortBy('date');

      const handledDates = new Set(
        existingSessions.filter(isHandledSession).map((session) => session.date)
      );
      const templateById = new Map(templates.map((template) => [template.id, template]));
      const skippedSessions: Session[] = [];
      let nextIndex = cycle.currentIndex;

      for (
        let date = firstUnhandledDate;
        compareDateStrings(date, today) < 0;
        date = addDays(date, 1)
      ) {
        const templateId = cycle.sequence[nextIndex];

        if (!handledDates.has(date)) {
          const template = templateById.get(templateId);
          skippedSessions.push({
            id: generateId(),
            templateId,
            templateName: template?.name ?? 'Unknown',
            date,
            status: 'skipped' as const,
            startedAt: null,
            finishedAt: null,
            durationSeconds: null,
            exerciseData: template ? buildSessionExerciseSnapshot(template.exercises) : [],
          });
        }

        nextIndex = (nextIndex + 1) % cycle.sequence.length;
      }

      await db.transaction('rw', db.sessions, db.programCycle, async () => {
        if (skippedSessions.length > 0) {
          await db.sessions.bulkAdd(skippedSessions);
        }

        await db.programCycle.update('active', {
          currentIndex: nextIndex,
          lastCompletedDate: lastMissedDate,
        });
      });

      if (!cancelled) {
        setIsSyncingMissedDays(false);
      }
    }

    void syncMissedDays().finally(() => {
      if (!cancelled) {
        setIsSyncingMissedDays(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [cycle, currentTemplateId, draft, draftDate, lastHandledDate, templates, today]);

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

  async function handleSkip(advance: boolean) {
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
      exerciseData: currentTemplate ? buildSessionExerciseSnapshot(currentTemplate.exercises) : [],
    });
    await db.programCycle.update('active', {
      currentIndex: advance
        ? (cycle.currentIndex + 1) % cycle.sequence.length
        : cycle.currentIndex,
      lastCompletedDate: todayString(),
    });
    setShowSkipOptions(false);
  }

  function discardDraft() {
    clearWorkoutDraft();
    setShowDiscardDraft(false);
  }

  if (isSyncingMissedDays) {
    return null;
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
          <h2 className={styles.doneTitle}>
            {todayOutcome?.status === 'skipped' ? 'Today is handled' : "You're done for today"}
          </h2>
          {todayOutcome && (
            <p className={styles.doneMeta}>
              {todayOutcome.status === 'completed'
                ? `Completed ${todayOutcome.templateName}${todayOutcome.durationSeconds ? ` in ${formatDuration(todayOutcome.durationSeconds)}` : ''}`
                : `Skipped ${todayOutcome.templateName}`}
            </p>
          )}
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
        {resumableDraft && (
          <div className={styles.resumeBanner}>
            <span className={styles.resumeTitle}>Workout in progress</span>
            <span className={styles.resumeMeta}>Pick up where you left off.</span>
          </div>
        )}
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
                    ? `${ex.sets.length} set${ex.sets.length !== 1 ? 's' : ''}`
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
        {resumableDraft ? (
          <>
            <Button fullWidth onClick={() => navigate('/workout')}>
              Resume Workout
            </Button>
            <Button variant="secondary" fullWidth onClick={() => setShowDiscardDraft(true)}>
              Discard In-Progress Workout
            </Button>
          </>
        ) : (
          <>
            <Button fullWidth onClick={() => navigate('/workout')}>
              Start Workout
            </Button>
            {showSkipOptions ? (
              <div className={styles.skipOptions}>
                <Button variant="secondary" fullWidth onClick={() => handleSkip(true)}>
                  Skip And Advance
                </Button>
                <Button variant="secondary" fullWidth onClick={() => handleSkip(false)}>
                  Skip, Keep This Workout Next
                </Button>
                <Button variant="ghost" fullWidth onClick={() => setShowSkipOptions(false)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <Button variant="secondary" fullWidth onClick={() => setShowSkipOptions(true)}>
                Skip Options
              </Button>
            )}
          </>
        )}
      </div>

      {showDiscardDraft && (
        <ConfirmDialog
          title="Discard Workout?"
          message="This will remove your in-progress workout so you can start fresh."
          confirmLabel="Discard"
          danger
          onConfirm={discardDraft}
          onCancel={() => setShowDiscardDraft(false)}
        />
      )}
    </div>
  );
}
