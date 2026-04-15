import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import { generateId } from '../utils/uuid';
import { cloneExercises, copyTemplateName } from '../utils/templates';
import TemplateCard from '../components/templates/TemplateCard';
import EmptyState from '../components/common/EmptyState';
import ConfirmDialog from '../components/common/ConfirmDialog';
import Button from '../components/common/Button';
import styles from './TemplatesListScreen.module.css';

export default function TemplatesListScreen() {
  const navigate = useNavigate();
  const templates = useLiveQuery(() => db.templates.toArray());
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  async function handleDelete() {
    if (!deleteTarget) return;
    const cycle = await db.programCycle.get('active');
    if (cycle) {
      const removedBeforeCurrent = cycle.sequence
        .slice(0, cycle.currentIndex)
        .filter((id) => id === deleteTarget).length;
      const nextSequence = cycle.sequence.filter((id) => id !== deleteTarget);
      const nextIndex = nextSequence.length === 0
        ? 0
        : Math.min(cycle.currentIndex - removedBeforeCurrent, nextSequence.length - 1);

      await db.programCycle.update('active', {
        sequence: nextSequence,
        currentIndex: Math.max(0, nextIndex),
      });
    }
    await db.templates.delete(deleteTarget);
    setDeleteTarget(null);
  }

  async function handleDuplicate(templateId: string) {
    const template = templates?.find((item) => item.id === templateId);
    if (!template) return;

    const now = Date.now();
    await db.templates.add({
      id: generateId(),
      name: copyTemplateName(template.name),
      exercises: cloneExercises(template.exercises),
      createdAt: now,
      updatedAt: now,
    });
  }

  return (
    <div className="page">
      <div className={styles.header}>
        <h1 className="page-title">Templates</h1>
        <Button variant="secondary" onClick={() => navigate('/program')}>
          Cycle
        </Button>
      </div>

      {templates && templates.length > 0 ? (
        <div className={styles.list}>
          {templates.map((t) => (
            <TemplateCard
              key={t.id}
              template={t}
              onDelete={setDeleteTarget}
              onDuplicate={handleDuplicate}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No templates yet"
          description="Create your first workout template to get started."
        />
      )}

      <div className={styles.fab}>
        <Button fullWidth onClick={() => navigate('/templates/new')}>
          + New Template
        </Button>
      </div>

      {deleteTarget && (
        <ConfirmDialog
          title="Delete Template"
          message="This will permanently delete this template. Any references in your program cycle will be removed."
          confirmLabel="Delete"
          danger
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
