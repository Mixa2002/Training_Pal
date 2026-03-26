import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import { generateId } from '../utils/uuid';
import { todayString } from '../utils/dates';
import { initAudio, playBeep } from '../utils/audio';
import { getLastSessionExercises } from '../utils/predictions';
import { useRestTimer } from '../hooks/useRestTimer';
import { useSettings } from '../hooks/useSettings';
import type {
  Exercise,
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

interface SetInput {
  weight: string;
  reps: string;
  rir: number | null;
  incline: string;
  speed: string;
  durationMinutes: string;
}

const emptyInput: SetInput = {
  weight: '',
  reps: '',
  rir: null,
  incline: '',
  speed: '',
  durationMinutes: '',
};

export default function LiveWorkoutScreen() {
  const navigate = useNavigate();
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
  const [startedAt] = useState(Date.now());
  const [showAbandon, setShowAbandon] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const activeSetRef = useRef<HTMLDivElement>(null);

  const handleTimerComplete = useCallback(() => {
    if (settings.vibrationEnabled && navigator.vibrate) {
      navigator.vibrate([200, 100, 200]);
    }
    if (settings.soundEnabled) {
      playBeep();
    }
  }, [settings.soundEnabled, settings.vibrationEnabled]);

  const timer = useRestTimer(handleTimerComplete);

  // Load template and predictions on mount
  useEffect(() => {
    async function load() {
      const c = await db.programCycle.get('active');
      if (!c || c.sequence.length === 0) {
        navigate('/');
        return;
      }
      const tId = c.sequence[c.currentIndex];
      const template = await db.templates.get(tId);
      if (!template || template.exercises.length === 0) {
        navigate('/');
        return;
      }

      setTemplateId(tId);
      setTemplateName(template.name);
      setExercises(template.exercises);

      const preds = await getLastSessionExercises(tId);
      setPredictions(preds);

      // Prefill first set
      const firstEx = template.exercises[0];
      const firstPred = preds.get(firstEx.id);
      if (firstPred && firstPred.sets.length > 0 && firstPred.type === firstEx.type) {
        prefillFromPrediction(firstPred.sets[0], firstEx.type);
      }

      initAudio();
      setLoaded(true);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function prefillFromPrediction(predSet: SessionSet, type: 'strength' | 'cardio') {
    if (type === 'strength') {
      const s = predSet as StrengthSet;
      setInput({
        ...emptyInput,
        weight: String(s.weight),
        reps: String(s.reps),
        rir: s.rir,
      });
    } else {
      const c = predSet as CardioSet;
      setInput({
        ...emptyInput,
        incline: String(c.incline),
        speed: String(c.speed),
        durationMinutes: String(c.durationMinutes),
      });
    }
  }

  const currentEx = exercises[currentExIndex];
  const exCompletedSets = completedSets.get(currentEx?.id ?? '') ?? [];
  const totalSetsForEx = currentEx?.type === 'strength' ? currentEx.sets : 1;
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

    // Prefill next set from prediction
    const predSets = currentPred?.sets ?? [];
    const nextPred = predSets[nextSetNum - 1]; // 0-indexed
    if (nextPred && currentPred?.type === currentEx.type) {
      prefillFromPrediction(nextPred, currentEx.type);
    } else {
      setInput({ ...emptyInput });
    }

    // Start rest timer if not last set
    if (nextSetNum <= totalSetsForEx) {
      const restSecs = currentEx.type === 'strength'
        ? currentEx.restSeconds
        : currentEx.restSeconds;
      if (restSecs > 0) {
        timer.start(restSecs);
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

    const nextEx = exercises[nextIdx];
    const pred = predictions.get(nextEx.id);
    if (pred && pred.sets.length > 0 && pred.type === nextEx.type) {
      prefillFromPrediction(pred.sets[0], nextEx.type);
    } else {
      setInput({ ...emptyInput });
    }
  }

  async function finishWorkout() {
    timer.cancel();
    const now = Date.now();
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
      date: todayString(),
      status: 'completed',
      startedAt,
      finishedAt: now,
      durationSeconds: Math.round((now - startedAt) / 1000),
      exerciseData,
    });

    if (cycle) {
      const nextIndex = (cycle.currentIndex + 1) % cycle.sequence.length;
      await db.programCycle.update('active', {
        currentIndex: nextIndex,
        lastCompletedDate: todayString(),
      });
    }

    navigate('/');
  }

  function handleAbandon() {
    timer.cancel();
    navigate('/');
  }

  if (!loaded || !currentEx) return null;

  const canSave = currentEx.type === 'strength'
    ? input.weight !== '' && input.reps !== '' && input.rir !== null
    : input.incline !== '' && input.speed !== '' && input.durationMinutes !== '';

  return (
    <div className={styles.page}>
      <div className={styles.header}>
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
            ? `${totalSetsForEx} working set${totalSetsForEx !== 1 ? 's' : ''}${currentEx.repMin != null ? ` · ${currentEx.repMin}${currentEx.repMax ? `-${currentEx.repMax}` : ''} reps` : ''}`
            : 'Cardio'}
        </span>
      </div>

      <div className={styles.setsList}>
        {/* Completed sets */}
        {exCompletedSets.map((set, i) => (
          <CompletedSetRow key={i} setNumber={i + 1} set={set} type={currentEx.type} />
        ))}

        {/* Rest timer */}
        {timer.isActive && (
          <RestTimerDisplay remaining={timer.remaining} onSkip={timer.cancel} />
        )}

        {/* Active set input */}
        {!allSetsDone && (
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
                <div className={styles.inputRow}>
                  <NumberInput
                    label="Weight (kg)"
                    value={input.weight}
                    onChange={(v) => setInput((p) => ({ ...p, weight: v }))}
                    decimal
                    placeholder="0"
                  />
                  <NumberInput
                    label="Reps"
                    value={input.reps}
                    onChange={(v) => setInput((p) => ({ ...p, reps: v }))}
                    placeholder="0"
                  />
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
              Save Set
            </Button>
          </div>
        )}

        {/* Pending sets */}
        {!allSetsDone &&
          Array.from({ length: totalSetsForEx - exCompletedSets.length - 1 }, (_, i) => {
            const futureSetNum = currentSetNum + 1 + i;
            const predSet =
              currentPred?.type === currentEx.type
                ? currentPred.sets[futureSetNum - 1]
                : null;
            return (
              <PendingSetRow
                key={futureSetNum}
                setNumber={futureSetNum}
                prediction={predSet}
                type={currentEx.type}
              />
            );
          })}
      </div>

      {/* Next / Finish buttons */}
      {allSetsDone && (
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
