import type { Exercise } from '../../db/types';
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
        restSeconds: exercise.type === 'strength' ? exercise.restSeconds : 60,
      });
    } else {
      onChange({
        id: exercise.id,
        type: 'strength',
        name: exercise.name,
        sets: 3,
        restSeconds: exercise.type === 'cardio' ? exercise.restSeconds : 90,
      });
    }
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
        <div className={styles.fields}>
          <NumberInput
            label="Sets"
            value={exercise.sets}
            onChange={(v) => update({ sets: Math.max(1, parseInt(v) || 1) })}
            min={1}
            max={20}
          />
          <NumberInput
            label="Rep Min"
            value={exercise.repMin ?? ''}
            onChange={(v) => update({ repMin: v === '' ? undefined : parseInt(v) || 0 })}
            placeholder="-"
          />
          <NumberInput
            label="Rep Max"
            value={exercise.repMax ?? ''}
            onChange={(v) => update({ repMax: v === '' ? undefined : parseInt(v) || 0 })}
            placeholder="-"
          />
          <NumberInput
            label="Rest (s)"
            value={exercise.restSeconds}
            onChange={(v) => update({ restSeconds: Math.max(0, parseInt(v) || 0) })}
            min={0}
          />
        </div>
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
          <NumberInput
            label="Rest (s)"
            value={exercise.restSeconds}
            onChange={(v) => update({ restSeconds: Math.max(0, parseInt(v) || 0) })}
            min={0}
          />
        </div>
      )}
    </div>
  );
}
