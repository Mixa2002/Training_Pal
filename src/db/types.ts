// ─── Exercise Types ──────────────────────────────────────────────

export interface StrengthSetTarget {
  weight: number;
  reps: number;
  rir: number; // 0, 1, or 2
}

export interface StrengthExercise {
  id: string;
  type: 'strength';
  name: string;
  sets: StrengthSetTarget[];
  restSeconds: number;
}

export interface CardioExercise {
  id: string;
  type: 'cardio';
  name: string;
  incline: number;
  speed: number;
  durationMinutes: number;
  restSeconds: number;
}

export type Exercise = StrengthExercise | CardioExercise;

// ─── Template ────────────────────────────────────────────────────

export interface Template {
  id: string;
  name: string;
  exercises: Exercise[];
  createdAt: number;
  updatedAt: number;
}

// ─── Program Cycle ───────────────────────────────────────────────

export interface ProgramCycle {
  id: string; // always "active"
  sequence: string[]; // template IDs in rotation order
  currentIndex: number;
  startDate: string; // YYYY-MM-DD
  lastCompletedDate: string | null;
}

// ─── Session ─────────────────────────────────────────────────────

export interface StrengthSet {
  setNumber: number;
  weight: number;
  reps: number;
  rir: number; // 0, 1, or 2
}

export interface CardioSet {
  setNumber: number;
  incline: number;
  speed: number;
  durationMinutes: number;
}

export type SessionSet = StrengthSet | CardioSet;

export interface SessionExercise {
  exerciseId: string;
  exerciseName: string;
  type: 'strength' | 'cardio';
  sets: SessionSet[];
}

export interface Session {
  id: string;
  templateId: string;
  templateName: string;
  date: string; // YYYY-MM-DD
  status: 'completed' | 'skipped' | 'abandoned';
  startedAt: number | null;
  finishedAt: number | null;
  durationSeconds: number | null;
  exerciseData: SessionExercise[];
}

// ─── Settings ────────────────────────────────────────────────────

export interface Settings {
  id: string; // always "prefs"
  soundEnabled: boolean;
  vibrationEnabled: boolean;
}
