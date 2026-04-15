import { db } from '../db/database';
import type { Exercise, Session, SessionExercise } from '../db/types';

export function isHandledSession(session: Session): boolean {
  return session.status === 'completed' || session.status === 'skipped';
}

export function buildSessionExerciseSnapshot(exercises: Exercise[]): SessionExercise[] {
  return exercises.map((exercise) => ({
    exerciseId: exercise.id,
    exerciseName: exercise.name,
    type: exercise.type,
    sets: [],
  }));
}

export async function getLatestHandledDate(): Promise<string | null> {
  const sessions = await db.sessions.orderBy('date').reverse().toArray();
  return sessions.find(isHandledSession)?.date ?? null;
}

export async function syncProgramCycleLastCompletedDate(): Promise<void> {
  const cycle = await db.programCycle.get('active');
  if (!cycle) return;

  const latestHandledDate = await getLatestHandledDate();
  await db.programCycle.update('active', {
    lastCompletedDate: latestHandledDate,
  });
}
