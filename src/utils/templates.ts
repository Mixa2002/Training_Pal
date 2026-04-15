import type { Exercise } from '../db/types';
import { generateId } from './uuid';

export function cloneExercise(exercise: Exercise): Exercise {
  if (exercise.type === 'strength') {
    return {
      ...exercise,
      id: generateId(),
      sets: exercise.sets.map((set) => ({ ...set })),
    };
  }

  return {
    ...exercise,
    id: generateId(),
  };
}

export function cloneExercises(exercises: Exercise[]): Exercise[] {
  return exercises.map(cloneExercise);
}

export function copyTemplateName(name: string): string {
  return `${name} Copy`;
}
