import type { SessionSet, StrengthSet, CardioSet } from '../../db/types';
import styles from './SetRow.module.css';

interface CompletedSetRowProps {
  setNumber: number;
  set: SessionSet;
  type: 'strength' | 'cardio';
}

export function CompletedSetRow({ setNumber, set, type }: CompletedSetRowProps) {
  const summary =
    type === 'strength'
      ? `${(set as StrengthSet).weight}kg × ${(set as StrengthSet).reps} @ RIR ${(set as StrengthSet).rir}`
      : `Incline ${(set as CardioSet).incline} · Speed ${(set as CardioSet).speed} · ${(set as CardioSet).durationMinutes}min`;

  return (
    <div className={styles.completed}>
      <div className={styles.checkmark}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="3">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
      <span className={styles.setNum}>Set {setNumber}</span>
      <span className={styles.summary}>{summary}</span>
    </div>
  );
}

interface PendingSetRowProps {
  setNumber: number;
  prediction?: SessionSet | null;
  type: 'strength' | 'cardio';
}

export function PendingSetRow({ setNumber, prediction, type }: PendingSetRowProps) {
  let hint = '';
  if (prediction) {
    if (type === 'strength') {
      const p = prediction as StrengthSet;
      hint = `${p.weight}kg × ${p.reps} @ RIR ${p.rir}`;
    } else {
      const p = prediction as CardioSet;
      hint = `Incline ${p.incline} · Speed ${p.speed} · ${p.durationMinutes}min`;
    }
  }

  return (
    <div className={styles.pending}>
      <span className={styles.setNum}>Set {setNumber}</span>
      {hint && <span className={styles.hint}>{hint}</span>}
    </div>
  );
}
