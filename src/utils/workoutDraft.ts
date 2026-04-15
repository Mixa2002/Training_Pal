import type { Exercise, SessionExercise, SessionSet } from '../db/types';
import { toDateString } from './dates';

const STORAGE_KEY = 'training-pal:workout-draft';

export interface WorkoutDraftInput {
  weight: string;
  reps: string;
  rir: number | null;
  incline: string;
  speed: string;
  durationMinutes: string;
}

export interface WorkoutDraft {
  version: 1;
  mode: 'today' | 'manual';
  sessionDate?: string;
  manualDate: string | null;
  manualTemplateId: string | null;
  templateId: string;
  templateName: string;
  exercises: Exercise[];
  predictions: Array<[string, SessionExercise]>;
  completedSets: Array<[string, SessionSet[]]>;
  currentExIndex: number;
  currentSetNum: number;
  input: WorkoutDraftInput;
  startedAt: number;
  weightStep: 1 | 1.25;
  savedAt: number;
}

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function loadWorkoutDraft(): WorkoutDraft | null {
  if (!canUseStorage()) return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as WorkoutDraft;
    if (parsed.version !== 1) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function getWorkoutDraftDate(draft: WorkoutDraft): string {
  return draft.sessionDate ?? toDateString(new Date(draft.savedAt));
}

export function saveWorkoutDraft(draft: WorkoutDraft): void {
  if (!canUseStorage()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
}

export function clearWorkoutDraft(): void {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(STORAGE_KEY);
}
