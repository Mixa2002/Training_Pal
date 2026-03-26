import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
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
      await db.programCycle.update('active', {
        sequence: cycle.sequence.filter((id) => id !== deleteTarget),
      });
    }
    await db.templates.delete(deleteTarget);
    setDeleteTarget(null);
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
            <TemplateCard key={t.id} template={t} onDelete={setDeleteTarget} />
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
