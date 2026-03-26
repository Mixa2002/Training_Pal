import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../db/database';
import { generateId } from '../utils/uuid';
import type { Exercise, StrengthExercise, Template } from '../db/types';
import ExerciseFormRow from '../components/templates/ExerciseFormRow';
import Button from '../components/common/Button';
import styles from './TemplateEditorScreen.module.css';

function createDefaultExercise(): StrengthExercise {
  return {
    id: generateId(),
    type: 'strength',
    name: '',
    sets: [{ weight: 0, reps: 0, rir: 2 }],
    restSeconds: 90,
  };
}

export default function TemplateEditorScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id;

  const [name, setName] = useState('');
  const [exercises, setExercises] = useState<Exercise[]>([createDefaultExercise()]);
  const [loading, setLoading] = useState(!isNew);

  useEffect(() => {
    if (id) {
      db.templates.get(id).then((t) => {
        if (t) {
          setName(t.name);
          setExercises(t.exercises.length > 0 ? t.exercises : [createDefaultExercise()]);
        }
        setLoading(false);
      });
    }
  }, [id]);

  function updateExercise(index: number, updated: Exercise) {
    setExercises((prev) => prev.map((e, i) => (i === index ? updated : e)));
  }

  function removeExercise(index: number) {
    setExercises((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length > 0 ? next : [createDefaultExercise()];
    });
  }

  function moveExercise(from: number, to: number) {
    setExercises((prev) => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  }

  async function handleSave() {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    const validExercises = exercises.filter((e) => e.name.trim() !== '');
    if (validExercises.length === 0) return;

    const now = Date.now();
    if (isNew) {
      const template: Template = {
        id: generateId(),
        name: trimmedName,
        exercises: validExercises,
        createdAt: now,
        updatedAt: now,
      };
      await db.templates.add(template);
    } else {
      await db.templates.update(id!, {
        name: trimmedName,
        exercises: validExercises,
        updatedAt: now,
      });
    }
    navigate('/templates');
  }

  if (loading) return null;

  const isValid = name.trim() !== '' && exercises.some((e) => e.name.trim() !== '');

  return (
    <div className="page">
      <div className={styles.topBar}>
        <button className={styles.backBtn} onClick={() => navigate('/templates')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back
        </button>
        <h1 className={styles.title}>{isNew ? 'New Template' : 'Edit Template'}</h1>
      </div>

      <div className={styles.nameField}>
        <input
          type="text"
          placeholder="Template name (e.g. Upper A)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={styles.nameInput}
          autoFocus={isNew}
        />
      </div>

      <div className={styles.exerciseList}>
        {exercises.map((exercise, i) => (
          <ExerciseFormRow
            key={exercise.id}
            exercise={exercise}
            index={i}
            total={exercises.length}
            onChange={(updated) => updateExercise(i, updated)}
            onRemove={() => removeExercise(i)}
            onMoveUp={() => moveExercise(i, i - 1)}
            onMoveDown={() => moveExercise(i, i + 1)}
          />
        ))}
      </div>

      <button
        className={styles.addBtn}
        onClick={() => setExercises((prev) => [...prev, createDefaultExercise()])}
      >
        + Add Exercise
      </button>

      <div className={styles.saveArea}>
        <Button fullWidth onClick={handleSave} disabled={!isValid}>
          {isNew ? 'Create Template' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}
