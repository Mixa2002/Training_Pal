import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import { generateId } from '../utils/uuid';
import { todayString } from '../utils/dates';
import { initAudio, playBeep } from '../utils/audio';
import { getLastSessionExercises } from '../utils/predictions';
import { useRestTimer } from '../hooks/useRestTimer';
import { useStopwatch, formatStopwatch } from '../hooks/useStopwatch';
import { useSettings } from '../hooks/useSettings';
import {
  clearWorkoutDraft,
  getWorkoutDraftDate,
  loadWorkoutDraft,
  saveWorkoutDraft,
  type WorkoutDraftInput,
} from '../utils/workoutDraft';
import type {
  Exercise,
  StrengthExercise,
  SessionExercise,
  SessionSet,
  StrengthSet,
  CardioSet,
} from '../db/types';
import ExerciseProgress from '../components/workout/ExerciseProgress';
import { CompletedSetRow, PendingSetRow } from '../components/workout/SetRow';
import RirSelector from '../components/workout/RirSelector';
import RestTimerDisplay from '../components/workout/RestTimerDisplay';
import NumberInput from '../components/common/NumberInput';
import Button from '../components/common/Button';
import ConfirmDialog from '../components/common/ConfirmDialog';
import styles from './LiveWorkoutScreen.module.css';

type SetInput = WorkoutDraftInput;

const emptyInput: WorkoutDraftInput = {
  weight: '',
  reps: '',
  rir: null,
  incline: '',
  speed: '',
  durationMinutes: '',
};

export default function LiveWorkoutScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const manualDate = searchParams.get('date');
  const manualTemplateId = searchParams.get('templateId');
  const isManualLog = Boolean(manualDate && manualTemplateId);
  const settings = useSettings();
  const cycle = useLiveQuery(() => db.programCycle.get('active'));

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [templateId, setTemplateId] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [predictions, setPredictions] = useState<Map<string, SessionExercise>>(new Map());
  const [currentExIndex, setCurrentExIndex] = useState(0);
  const [completedSets, setCompletedSets] = useState<Map<string, SessionSet[]>>(new Map());
  const [currentSetNum, setCurrentSetNum] = useState(1);
  const [input, setInput] = useState<SetInput>({ ...emptyInput });
  const [startedAt, setStartedAt] = useState(Date.now());
  const [showAbandon, setShowAbandon] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [weightStep, setWeightStep] = useState<1 | 1.25>(1);
  const activeSetRef = useRef<HTMLDivElement>(null);

  const handleTimerComplete = useCallback(() => {
    if (settings.vibrationEnabled && navigator.vibrate) {
      navigator.vibrate([300, 150, 300, 150, 300]);
    }
    if (settings.soundEnabled) {
      playBeep();
    }
  }, [settings.soundEnabled, settings.vibrationEnabled]);

  const timer = useRestTimer(handleTimerComplete);
  const elapsedSeconds = useStopwatch(startedAt);

  // Prefill logic: use last session data if available, otherwise fall back to template targets
  function prefillSet(ex: Exercise, setIndex: number, preds: Map<string, SessionExercise>) {
    const pred = preds.get(ex.id);
    const predSet = pred?.type === ex.type ? pred.sets[setIndex] : null;

    if (ex.type === 'strength') {
      // Priority: last session > template target
      if (predSet) {
        const s = predSet as StrengthSet;
        setInput({ ...emptyInput, weight: String(s.weight), reps: String(s.reps), rir: s.rir });
      } else {
        const target = (ex as StrengthExercise).sets[setIndex];
        if (target) {
          setInput({ ...emptyInput, weight: String(target.weight || ''), reps: String(target.reps || ''), rir: target.rir });
        } else {
          setInput({ ...emptyInput });
        }
      }
    } else {
      if (predSet) {
        const c = predSet as CardioSet;
        setInput({ ...emptyInput, incline: String(c.incline), speed: String(c.speed), durationMinutes: String(c.durationMinutes) });
      } else {
        setInput({ ...emptyInput });
      }
    }
  }

  // Load template and predictions on mount
  useEffect(() => {
    async function load() {
      const draft = loadWorkoutDraft();
      let draftMatches = false;

      if (draft) {
        if (isManualLog) {
          draftMatches =
            draft.mode === 'manual' &&
            draft.manualDate === (manualDate ?? null) &&
            draft.manualTemplateId === (manualTemplateId ?? null);
        } else {
          const c = await db.programCycle.get('active');
          const expectedTemplateId = c?.sequence[c.currentIndex];
          draftMatches =
            draft.mode === 'today' &&
            getWorkoutDraftDate(draft) === todayString() &&
            draft.templateId === expectedTemplateId;

          if (!draftMatches && draft.mode === 'today') {
            clearWorkoutDraft();
          }
        }
      }

      if (draftMatches) {
        const activeDraft = draft!;
        setTemplateId(activeDraft.templateId);
        setTemplateName(activeDraft.templateName);
        setExercises(activeDraft.exercises);
        setPredictions(new Map(activeDraft.predictions));
        setCompletedSets(new Map(activeDraft.completedSets));
        setCurrentExIndex(activeDraft.currentExIndex);
        setCurrentSetNum(activeDraft.currentSetNum);
        setInput(activeDraft.input);
        setStartedAt(activeDraft.startedAt);
        setWeightStep(activeDraft.weightStep);
        initAudio();
        setLoaded(true);
        return;
      }

      let tId: string;

      if (isManualLog) {
        tId = manualTemplateId!;
      } else {
        const c = await db.programCycle.get('active');
        if (!c || c.sequence.length === 0) {
          navigate('/');
          return;
        }
        tId = c.sequence[c.currentIndex];
      }

      const template = await db.templates.get(tId);
      if (!template || template.exercises.length === 0) {
        navigate(manualDate ? '/history' : '/');
        return;
      }

      setTemplateId(tId);
      setTemplateName(template.name);
      setExercises(template.exercises);

      const preds = await getLastSessionExercises(tId);
      setPredictions(preds);

      // Prefill first set of first exercise
      prefillSet(template.exercises[0], 0, preds);

      initAudio();
      setLoaded(true);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loaded || !templateId) return;

    saveWorkoutDraft({
      version: 1,
      mode: isManualLog ? 'manual' : 'today',
      sessionDate: isManualLog ? manualDate! : todayString(),
      manualDate: manualDate ?? null,
      manualTemplateId: manualTemplateId ?? null,
      templateId,
      templateName,
      exercises,
      predictions: Array.from(predictions.entries()),
      completedSets: Array.from(completedSets.entries()),
      currentExIndex,
      currentSetNum,
      input,
      startedAt,
      weightStep,
      savedAt: Date.now(),
    });
  }, [
    loaded,
    templateId,
    templateName,
    exercises,
    predictions,
    completedSets,
    currentExIndex,
    currentSetNum,
    input,
    startedAt,
    weightStep,
    isManualLog,
    manualDate,
    manualTemplateId,
  ]);

  const currentEx = exercises[currentExIndex];
  const exCompletedSets = completedSets.get(currentEx?.id ?? '') ?? [];
  const totalSetsForEx = currentEx?.type === 'strength' ? currentEx.sets.length : 1;
  const allSetsDone = exCompletedSets.length >= totalSetsForEx;
  const isLastExercise = currentExIndex === exercises.length - 1;
  const currentPred = currentEx ? predictions.get(currentEx.id) : null;

  function saveSet() {
    if (!currentEx) return;

    let set: SessionSet;
    if (currentEx.type === 'strength') {
      const weight = parseFloat(input.weight);
      const reps = parseInt(input.reps);
      if (isNaN(weight) || isNaN(reps) || input.rir === null) return;
      set = { setNumber: currentSetNum, weight, reps, rir: input.rir };
    } else {
      const incline = parseFloat(input.incline);
      const speed = parseFloat(input.speed);
      const dur = parseInt(input.durationMinutes);
      if (isNaN(incline) || isNaN(speed) || isNaN(dur)) return;
      set = { setNumber: currentSetNum, incline, speed, durationMinutes: dur };
    }

    const key = currentEx.id;
    setCompletedSets((prev) => {
      const next = new Map(prev);
      next.set(key, [...(next.get(key) ?? []), set]);
      return next;
    });

    const nextSetNum = currentSetNum + 1;
    setCurrentSetNum(nextSetNum);

    // Prefill next set or start rest timer after last set
    if (nextSetNum <= totalSetsForEx) {
      prefillSet(currentEx, nextSetNum - 1, predictions);

      // Start rest timer between sets
      if (currentEx.restSeconds > 0) {
        timer.start(currentEx.restSeconds);
      }
    } else {
      // All sets done — start rest timer before next exercise (strength only)
      if (currentEx.type === 'strength' && currentEx.restSeconds > 0 && !isLastExercise) {
        timer.start(currentEx.restSeconds);
      }
    }

    // Auto-scroll to active set
    setTimeout(() => {
      activeSetRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  }

  function nextExercise() {
    timer.cancel();
    const nextIdx = currentExIndex + 1;
    setCurrentExIndex(nextIdx);
    setCurrentSetNum(1);
    prefillSet(exercises[nextIdx], 0, predictions);
  }

  async function finishWorkout() {
    timer.cancel();
    const now = Date.now();
    const sessionDate = isManualLog ? manualDate! : todayString();

    const exerciseData: SessionExercise[] = exercises.map((ex) => ({
      exerciseId: ex.id,
      exerciseName: ex.name,
      type: ex.type,
      sets: completedSets.get(ex.id) ?? [],
    }));

    await db.sessions.add({
      id: generateId(),
      templateId,
      templateName,
      date: sessionDate,
      status: 'completed',
      startedAt: isManualLog ? null : startedAt,
      finishedAt: isManualLog ? null : now,
      durationSeconds: isManualLog ? null : Math.round((now - startedAt) / 1000),
      exerciseData,
    });

    if (!isManualLog) {
      // Update template targets with what was actually performed.
      const updatedExercises = exercises.map((ex) => {
        const done = completedSets.get(ex.id);
        if (!done || done.length === 0) return ex;

        if (ex.type === 'strength') {
          return {
            ...ex,
            sets: done.map((s) => ({
              weight: (s as StrengthSet).weight,
              reps: (s as StrengthSet).reps,
              rir: (s as StrengthSet).rir,
            })),
          };
        }
        const c = done[0] as CardioSet;
        return {
          ...ex,
          incline: c.incline,
          speed: c.speed,
          durationMinutes: c.durationMinutes,
        };
      });

      await db.templates.update(templateId, {
        exercises: updatedExercises,
        updatedAt: Date.now(),
      });
    }

    if (!isManualLog && cycle) {
      const nextIndex = (cycle.currentIndex + 1) % cycle.sequence.length;
      await db.programCycle.update('active', {
        currentIndex: nextIndex,
        lastCompletedDate: sessionDate,
      });
    }

    clearWorkoutDraft();
    navigate(isManualLog ? '/history' : '/');
  }

  function handleAbandon() {
    timer.cancel();
    clearWorkoutDraft();
    navigate(isManualLog ? '/history' : '/');
  }

  if (!loaded || !currentEx) return null;

  const canSave = currentEx.type === 'strength'
    ? input.weight !== '' && input.reps !== '' && input.rir !== null
    : input.incline !== '' && input.speed !== '' && input.durationMinutes !== '';

  // Build pending set hints from template targets or predictions
  function getPendingHint(setIndex: number): SessionSet | null {
    // Try last session first
    const predSet = currentPred?.type === currentEx.type ? currentPred.sets[setIndex] : null;
    if (predSet) return predSet;
    // Fall back to template target for strength
    if (currentEx.type === 'strength') {
      const target = (currentEx as StrengthExercise).sets[setIndex];
      if (target) return { setNumber: setIndex + 1, weight: target.weight, reps: target.reps, rir: target.rir };
    }
    return null;
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.stopwatch}>{formatStopwatch(elapsedSeconds)}</div>
        <ExerciseProgress current={currentExIndex} total={exercises.length} />
        <div className={styles.headerRow}>
          <h1 className={styles.exName}>{currentEx.name}</h1>
          <button className={styles.abandonBtn} onClick={() => setShowAbandon(true)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <span className={styles.exType}>
          {currentEx.type === 'strength'
            ? `${totalSetsForEx} working set${totalSetsForEx !== 1 ? 's' : ''} · Rest ${currentEx.restSeconds}s`
            : 'Cardio'}
        </span>
      </div>

      <div className={styles.setsList}>
        {/* Completed sets */}
        {exCompletedSets.map((set, i) => (
          <CompletedSetRow key={i} setNumber={i + 1} set={set} type={currentEx.type} />
        ))}

        {/* Rest timer — blocks next set/exercise until done */}
        {timer.isActive && (
          <RestTimerDisplay remaining={timer.remaining} onSkip={timer.cancel} />
        )}

        {/* Active set input — hidden while timer is running */}
        {!allSetsDone && !timer.isActive && (
          <div className={styles.activeSet} ref={activeSetRef}>
            {/* Prediction hint */}
            {currentPred && currentPred.type === currentEx.type && currentPred.sets[currentSetNum - 1] && (
              <div className={styles.predHint}>
                {currentEx.type === 'strength'
                  ? (() => {
                      const p = currentPred.sets[currentSetNum - 1] as StrengthSet;
                      return `Last: ${p.weight}kg × ${p.reps} @ RIR ${p.rir}`;
                    })()
                  : (() => {
                      const p = currentPred.sets[currentSetNum - 1] as CardioSet;
                      return `Last: Incline ${p.incline} · Speed ${p.speed} · ${p.durationMinutes}min`;
                    })()}
              </div>
            )}

            <div className={styles.setLabel}>Set {currentSetNum}</div>

            {currentEx.type === 'strength' ? (
              <>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Weight (kg)</label>
                  <div className={styles.fieldRow}>
                    <button className={styles.incBtn} onClick={() => {
                      const cur = parseFloat(input.weight) || 0;
                      setInput((p) => ({ ...p, weight: String(Math.max(0, +(cur - weightStep).toFixed(2))) }));
                    }}>−</button>
                    <NumberInput
                      value={input.weight}
                      onChange={(v) => setInput((p) => ({ ...p, weight: v }))}
                      decimal
                      placeholder="0"
                    />
                    <button className={styles.incBtn} onClick={() => {
                      const cur = parseFloat(input.weight) || 0;
                      setInput((p) => ({ ...p, weight: String(+(cur + weightStep).toFixed(2)) }));
                    }}>+</button>
                    <button
                      className={`${styles.stepToggle} ${weightStep === 1 ? styles.stepActive1 : styles.stepActive125}`}
                      onClick={() => setWeightStep((s) => (s === 1 ? 1.25 : 1))}
                    >
                      {weightStep === 1 ? '1' : '1.25'}
                    </button>
                  </div>
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Reps</label>
                  <div className={styles.fieldRow}>
                    <button className={styles.incBtn} onClick={() => {
                      const cur = parseInt(input.reps) || 0;
                      setInput((p) => ({ ...p, reps: String(Math.max(0, cur - 1)) }));
                    }}>−</button>
                    <NumberInput
                      value={input.reps}
                      onChange={(v) => setInput((p) => ({ ...p, reps: v }))}
                      placeholder="0"
                    />
                    <button className={styles.incBtn} onClick={() => {
                      const cur = parseInt(input.reps) || 0;
                      setInput((p) => ({ ...p, reps: String(cur + 1) }));
                    }}>+</button>
                  </div>
                </div>
                <RirSelector
                  value={input.rir}
                  onChange={(v) => setInput((p) => ({ ...p, rir: v }))}
                />
              </>
            ) : (
              <div className={styles.inputRow}>
                <NumberInput
                  label="Incline"
                  value={input.incline}
                  onChange={(v) => setInput((p) => ({ ...p, incline: v }))}
                  decimal
                  placeholder="0"
                />
                <NumberInput
                  label="Speed"
                  value={input.speed}
                  onChange={(v) => setInput((p) => ({ ...p, speed: v }))}
                  decimal
                  placeholder="0"
                />
                <NumberInput
                  label="Min"
                  value={input.durationMinutes}
                  onChange={(v) => setInput((p) => ({ ...p, durationMinutes: v }))}
                  placeholder="0"
                />
              </div>
            )}

            <Button fullWidth onClick={saveSet} disabled={!canSave}>
              Finished
            </Button>
          </div>
        )}

        {/* Pending sets — hidden while timer is running */}
        {!allSetsDone && !timer.isActive &&
          Array.from({ length: totalSetsForEx - exCompletedSets.length - 1 }, (_, i) => {
            const futureSetNum = currentSetNum + 1 + i;
            return (
              <PendingSetRow
                key={futureSetNum}
                setNumber={futureSetNum}
                prediction={getPendingHint(futureSetNum - 1)}
                type={currentEx.type}
              />
            );
          })}
      </div>

      {/* Next / Finish buttons */}
      {allSetsDone && !timer.isActive && (
        <div className={styles.nextArea}>
          {isLastExercise ? (
            <Button fullWidth onClick={finishWorkout}>
              Finish Workout
            </Button>
          ) : (
            <Button fullWidth onClick={nextExercise}>
              Next Exercise
            </Button>
          )}
        </div>
      )}

      {showAbandon && (
        <ConfirmDialog
          title="Abandon Workout?"
          message="Your progress for this session will be lost."
          confirmLabel="Abandon"
          danger
          onConfirm={handleAbandon}
          onCancel={() => setShowAbandon(false)}
        />
      )}
    </div>
  );
}
