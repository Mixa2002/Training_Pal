import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import type {
  Session,
  SessionExercise,
  StrengthSet,
  CardioSet,
  Template,
} from '../db/types';
import { syncProgramCycleLastCompletedDate } from '../utils/sessions';
import Button from '../components/common/Button';
import NumberInput from '../components/common/NumberInput';
import styles from './SessionEditorScreen.module.css';

function cloneSessionExercises(exercises: SessionExercise[]): SessionExercise[] {
  return exercises.map((exercise) => ({
    ...exercise,
    sets: exercise.sets.map((set) => ({ ...set })),
  }));
}

function buildExercises(session: Session, template?: Template): SessionExercise[] {
  if (session.exerciseData.length > 0) {
    return cloneSessionExercises(session.exerciseData);
  }

  if (!template) return [];

  return template.exercises.map((exercise) => ({
    exerciseId: exercise.id,
    exerciseName: exercise.name,
    type: exercise.type,
    sets: [],
  }));
}

export default function SessionEditorScreen() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const payload = useLiveQuery(async () => {
    if (!sessionId) return null;

    const session = await db.sessions.get(sessionId);
    if (!session) return { session: null, template: undefined };

    const template = await db.templates.get(session.templateId);
    return { session, template };
  }, [sessionId]);

  if (!payload) return null;

  if (!payload.session) {
    return (
      <div className="page">
        <button className={styles.backBtn} onClick={() => navigate('/history')}>
          Back
        </button>
        <p className={styles.emptyText}>Session not found.</p>
      </div>
    );
  }

  return (
    <SessionEditorForm
      key={payload.session.id}
      session={payload.session}
      template={payload.template}
    />
  );
}

interface SessionEditorFormProps {
  session: Session;
  template?: Template;
}

function SessionEditorForm({ session, template }: SessionEditorFormProps) {
  const navigate = useNavigate();
  const [date, setDate] = useState(session.date);
  const [status, setStatus] = useState<Session['status']>(session.status);
  const [exerciseData, setExerciseData] = useState<SessionExercise[]>(
    () => buildExercises(session, template)
  );

  const templateMissing = !template && exerciseData.length === 0;

  function updateExercise(exerciseIndex: number, updater: (exercise: SessionExercise) => SessionExercise) {
    setExerciseData((prev) =>
      prev.map((exercise, index) => (index === exerciseIndex ? updater(exercise) : exercise))
    );
  }

  function updateStrengthSet(
    exerciseIndex: number,
    setIndex: number,
    patch: Partial<StrengthSet>,
  ) {
    updateExercise(exerciseIndex, (exercise) => ({
      ...exercise,
      sets: exercise.sets.map((set, index) =>
        index === setIndex ? { ...(set as StrengthSet), ...patch } : set
      ),
    }));
  }

  function updateCardioSet(
    exerciseIndex: number,
    setIndex: number,
    patch: Partial<CardioSet>,
  ) {
    updateExercise(exerciseIndex, (exercise) => ({
      ...exercise,
      sets: exercise.sets.map((set, index) =>
        index === setIndex ? { ...(set as CardioSet), ...patch } : set
      ),
    }));
  }

  function addSet(exerciseIndex: number) {
    updateExercise(exerciseIndex, (exercise) => {
      const nextSetNumber = exercise.sets.length + 1;
      const nextSet =
        exercise.type === 'strength'
          ? { setNumber: nextSetNumber, weight: 0, reps: 0, rir: 2 }
          : { setNumber: nextSetNumber, incline: 0, speed: 0, durationMinutes: 0 };

      return {
        ...exercise,
        sets: [...exercise.sets, nextSet],
      };
    });
  }

  function removeSet(exerciseIndex: number, setIndex: number) {
    updateExercise(exerciseIndex, (exercise) => ({
      ...exercise,
      sets: exercise.sets
        .filter((_, index) => index !== setIndex)
        .map((set, index) => ({ ...set, setNumber: index + 1 })),
    }));
  }

  async function handleSave() {
    const nextExerciseData =
      status === 'completed'
        ? exerciseData.map((exercise) => ({
            ...exercise,
            sets: exercise.sets
              .filter((set) =>
                exercise.type === 'strength'
                  ? !Number.isNaN((set as StrengthSet).weight) &&
                    !Number.isNaN((set as StrengthSet).reps) &&
                    !Number.isNaN((set as StrengthSet).rir)
                  : !Number.isNaN((set as CardioSet).incline) &&
                    !Number.isNaN((set as CardioSet).speed) &&
                    !Number.isNaN((set as CardioSet).durationMinutes)
              )
              .map((set, index) => ({ ...set, setNumber: index + 1 })),
          }))
        : [];

    await db.sessions.update(session.id, {
      date,
      status,
      exerciseData: nextExerciseData,
    });
    await syncProgramCycleLastCompletedDate();

    navigate(`/history/${session.id}`);
  }

  return (
    <div className="page">
      <div className={styles.topBar}>
        <button className={styles.backBtn} onClick={() => navigate(`/history/${session.id}`)}>
          Back
        </button>
        <h1 className={styles.title}>Edit Session</h1>
      </div>

      <div className={styles.metaCard}>
        <div className={styles.field}>
          <label className={styles.label}>Date</label>
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className={styles.dateInput}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Status</label>
          <div className={styles.statusRow}>
            {(['completed', 'skipped', 'abandoned'] as const).map((option) => (
              <button
                key={option}
                className={`${styles.statusBtn} ${status === option ? styles.statusActive : ''}`}
                onClick={() => setStatus(option)}
                type="button"
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      </div>

      {status === 'completed' && templateMissing && (
        <p className={styles.emptyText}>
          The original template no longer exists, so there is nothing to edit for this session.
        </p>
      )}

      {status === 'completed' && !templateMissing && (
        <div className={styles.exerciseList}>
          {exerciseData.map((exercise, exerciseIndex) => (
            <div key={exercise.exerciseId} className={styles.exerciseCard}>
              <div className={styles.exerciseHeader}>
                <h3 className={styles.exerciseName}>{exercise.exerciseName}</h3>
                <span className={styles.exerciseType}>{exercise.type}</span>
              </div>

              <div className={styles.setList}>
                {exercise.sets.map((set, setIndex) => (
                  <div key={setIndex} className={styles.setCard}>
                    <span className={styles.setNumber}>Set {setIndex + 1}</span>

                    {exercise.type === 'strength' ? (
                      <>
                        <div className={styles.fields}>
                          <NumberInput
                            label="Weight"
                            value={(set as StrengthSet).weight}
                            onChange={(value) =>
                              updateStrengthSet(exerciseIndex, setIndex, {
                                weight: parseFloat(value) || 0,
                              })
                            }
                            decimal
                          />
                          <NumberInput
                            label="Reps"
                            value={(set as StrengthSet).reps}
                            onChange={(value) =>
                              updateStrengthSet(exerciseIndex, setIndex, {
                                reps: parseInt(value) || 0,
                              })
                            }
                          />
                        </div>
                        <div className={styles.rirRow}>
                          <span className={styles.rirLabel}>RIR</span>
                          <div className={styles.rirButtons}>
                            {[0, 1, 2].map((rir) => (
                              <button
                                key={rir}
                                type="button"
                                className={`${styles.rirBtn} ${(set as StrengthSet).rir === rir ? styles.rirActive : ''}`}
                                onClick={() =>
                                  updateStrengthSet(exerciseIndex, setIndex, { rir })
                                }
                              >
                                {rir}
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className={styles.fields}>
                        <NumberInput
                          label="Incline"
                          value={(set as CardioSet).incline}
                          onChange={(value) =>
                            updateCardioSet(exerciseIndex, setIndex, {
                              incline: parseFloat(value) || 0,
                            })
                          }
                          decimal
                        />
                        <NumberInput
                          label="Speed"
                          value={(set as CardioSet).speed}
                          onChange={(value) =>
                            updateCardioSet(exerciseIndex, setIndex, {
                              speed: parseFloat(value) || 0,
                            })
                          }
                          decimal
                        />
                        <NumberInput
                          label="Minutes"
                          value={(set as CardioSet).durationMinutes}
                          onChange={(value) =>
                            updateCardioSet(exerciseIndex, setIndex, {
                              durationMinutes: parseInt(value) || 0,
                            })
                          }
                        />
                      </div>
                    )}

                    <button
                      className={styles.removeBtn}
                      onClick={() => removeSet(exerciseIndex, setIndex)}
                      type="button"
                    >
                      Remove Set
                    </button>
                  </div>
                ))}
              </div>

              <Button variant="secondary" fullWidth onClick={() => addSet(exerciseIndex)}>
                + Add Set
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className={styles.actions}>
        <Button variant="secondary" fullWidth onClick={() => navigate(`/history/${session.id}`)}>
          Cancel
        </Button>
        <Button fullWidth onClick={() => void handleSave()} disabled={!date}>
          Save Session
        </Button>
      </div>
    </div>
  );
}
