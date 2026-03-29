import type { Exercise, StrengthExercise, StrengthSetTarget } from '../../db/types';
import NumberInput from '../common/NumberInput';
import styles from './ExerciseFormRow.module.css';

interface ExerciseFormRowProps {
  exercise: Exercise;
  index: number;
  total: number;
  onChange: (updated: Exercise) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

const defaultSet: StrengthSetTarget = { weight: 0, reps: 0, rir: 2 };

export default function ExerciseFormRow({
  exercise,
  index,
  total,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
}: ExerciseFormRowProps) {
  const isStrength = exercise.type === 'strength';

  function update(patch: Record<string, unknown>) {
    onChange({ ...exercise, ...patch } as Exercise);
  }

  function toggleType() {
    if (isStrength) {
      onChange({
        id: exercise.id,
        type: 'cardio',
        name: exercise.name,
        incline: 0,
        speed: 0,
        durationMinutes: 30,
        restSeconds: 0,
      });
    } else {
      onChange({
        id: exercise.id,
        type: 'strength',
        name: exercise.name,
        sets: [{ ...defaultSet }],
        restSeconds: exercise.restSeconds,
      });
    }
  }

  // Strength set helpers
  function updateSet(setIndex: number, patch: Partial<StrengthSetTarget>) {
    if (exercise.type !== 'strength') return;
    const newSets = exercise.sets.map((s, i) =>
      i === setIndex ? { ...s, ...patch } : s
    );
    update({ sets: newSets });
  }

  function addSet() {
    if (exercise.type !== 'strength') return;
    const lastSet = exercise.sets[exercise.sets.length - 1] ?? defaultSet;
    update({ sets: [...exercise.sets, { ...lastSet }] });
  }

  function removeSet(setIndex: number) {
    if (exercise.type !== 'strength') return;
    const newSets = exercise.sets.filter((_, i) => i !== setIndex);
    update({ sets: newSets.length > 0 ? newSets : [{ ...defaultSet }] });
  }

  return (
    <div className={styles.row}>
      <div className={styles.header}>
        <span className={styles.number}>{index + 1}</span>
        <div className={styles.reorder}>
          <button
            className={styles.moveBtn}
            onClick={onMoveUp}
            disabled={index === 0}
            aria-label="Move up"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="18 15 12 9 6 15" />
            </svg>
          </button>
          <button
            className={styles.moveBtn}
            onClick={onMoveDown}
            disabled={index === total - 1}
            aria-label="Move down"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        </div>
        <button className={styles.removeBtn} onClick={onRemove} aria-label="Remove exercise">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div className={styles.nameRow}>
        <input
          type="text"
          placeholder="Exercise name"
          value={exercise.name}
          onChange={(e) => update({ name: e.target.value })}
          className={styles.nameInput}
        />
        <button
          className={`${styles.typeToggle} ${isStrength ? styles.strength : styles.cardio}`}
          onClick={toggleType}
        >
          {isStrength ? 'Strength' : 'Cardio'}
        </button>
      </div>

      {isStrength ? (
        <>
          <div className={styles.restRow}>
            <NumberInput
              label="Rest between sets (seconds)"
              value={exercise.restSeconds}
              onChange={(v) => update({ restSeconds: Math.max(0, parseInt(v) || 0) })}
              min={0}
            />
          </div>

          <div className={styles.setsSection}>
            <div className={styles.setsHeader}>
              <span className={styles.setsLabel}>Sets</span>
            </div>
            {(exercise as StrengthExercise).sets.map((set, si) => (
              <div key={si} className={styles.setRow}>
                <span className={styles.setNum}>{si + 1}</span>
                <NumberInput
                  label="kg"
                  value={set.weight || ''}
                  onChange={(v) => updateSet(si, { weight: parseFloat(v) || 0 })}
                  decimal
                  placeholder="0"
                />
                <NumberInput
                  label="Reps"
                  value={set.reps || ''}
                  onChange={(v) => updateSet(si, { reps: parseInt(v) || 0 })}
                  placeholder="0"
                />
                <div className={styles.rirField}>
                  <label className={styles.rirLabel}>RIR</label>
                  <div className={styles.rirBtns}>
                    {[0, 1, 2].map((n) => (
                      <button
                        key={n}
                        type="button"
                        className={`${styles.rirBtn} ${set.rir === n ? styles.rirActive : ''}`}
                        onClick={() => updateSet(si, { rir: n })}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  className={styles.removeSetBtn}
                  onClick={() => removeSet(si)}
                  aria-label="Remove set"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ))}
            <button className={styles.addSetBtn} onClick={addSet}>
              + Add Set
            </button>
          </div>
        </>
      ) : (
        <div className={styles.fields}>
          <NumberInput
            label="Incline"
            value={exercise.incline}
            onChange={(v) => update({ incline: parseFloat(v) || 0 })}
            decimal
          />
          <NumberInput
            label="Speed"
            value={exercise.speed}
            onChange={(v) => update({ speed: parseFloat(v) || 0 })}
            decimal
          />
          <NumberInput
            label="Duration (min)"
            value={exercise.durationMinutes}
            onChange={(v) => update({ durationMinutes: parseInt(v) || 0 })}
          />
        </div>
      )}
    </div>
  );
}
