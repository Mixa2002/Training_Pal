import { db } from '../db/database';
import type { SessionExercise } from '../db/types';

export async function getLastSessionExercises(
  templateId: string
): Promise<Map<string, SessionExercise>> {
  const sessions = await db.sessions
    .where('templateId')
    .equals(templateId)
    .filter((s) => s.status === 'completed')
    .reverse()
    .sortBy('date');

  const last = sessions[0];
  if (!last) return new Map();

  const map = new Map<string, SessionExercise>();
  for (const ex of last.exerciseData) {
    map.set(ex.exerciseId, ex);
  }
  return map;
}
