import type { Session, StrengthSet } from '../db/types';

export function sessionVolume(session: Session): number {
  let total = 0;
  for (const ex of session.exerciseData) {
    if (ex.type === 'strength') {
      for (const set of ex.sets) {
        const s = set as StrengthSet;
        total += s.weight * s.reps;
      }
    }
  }
  return total;
}

export function exerciseMaxWeight(session: Session, exerciseId: string): number | null {
  for (const ex of session.exerciseData) {
    if (ex.exerciseId === exerciseId && ex.type === 'strength') {
      let max = 0;
      for (const set of ex.sets) {
        const s = set as StrengthSet;
        if (s.weight > max) max = s.weight;
      }
      return max > 0 ? max : null;
    }
  }
  return null;
}
