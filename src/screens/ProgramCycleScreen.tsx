import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import { todayString } from '../utils/dates';
import type { Template } from '../db/types';
import Button from '../components/common/Button';
import EmptyState from '../components/common/EmptyState';
import styles from './ProgramCycleScreen.module.css';

export default function ProgramCycleScreen() {
  const navigate = useNavigate();
  const templates = useLiveQuery(() => db.templates.toArray());
  const cycle = useLiveQuery(() => db.programCycle.get('active'));
  const [showPicker, setShowPicker] = useState(false);

  const templateMap = new Map<string, Template>();
  templates?.forEach((t) => templateMap.set(t.id, t));

  const sequence = cycle?.sequence ?? [];

  async function addToSequence(templateId: string) {
    const newSeq = [...sequence, templateId];
    if (cycle) {
      await db.programCycle.update('active', { sequence: newSeq });
    } else {
      await db.programCycle.put({
        id: 'active',
        sequence: newSeq,
        currentIndex: 0,
        startDate: todayString(),
        lastCompletedDate: null,
      });
    }
    setShowPicker(false);
  }

  async function removeFromSequence(index: number) {
    const newSeq = sequence.filter((_, i) => i !== index);
    const newIndex = cycle!.currentIndex >= newSeq.length
      ? Math.max(0, newSeq.length - 1)
      : cycle!.currentIndex;
    await db.programCycle.update('active', {
      sequence: newSeq,
      currentIndex: newIndex,
    });
  }

  async function moveInSequence(from: number, to: number) {
    const newSeq = [...sequence];
    const [item] = newSeq.splice(from, 1);
    newSeq.splice(to, 0, item);
    await db.programCycle.update('active', { sequence: newSeq });
  }

  async function resetCycle() {
    if (cycle) {
      await db.programCycle.update('active', {
        currentIndex: 0,
        startDate: todayString(),
        lastCompletedDate: null,
      });
    }
  }

  if (!templates) return null;

  return (
    <div className="page">
      <div className={styles.topBar}>
        <button className={styles.backBtn} onClick={() => navigate('/templates')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back
        </button>
        <h1 className={styles.title}>Program Cycle</h1>
      </div>

      {cycle && sequence.length > 0 && (
        <div className={styles.statusBar}>
          <span className={styles.statusText}>
            Day {cycle.currentIndex + 1} of {sequence.length}
          </span>
          <button className={styles.resetBtn} onClick={resetCycle}>
            Reset Position
          </button>
        </div>
      )}

      {sequence.length > 0 ? (
        <div className={styles.sequenceList}>
          {sequence.map((templateId, i) => {
            const tmpl = templateMap.get(templateId);
            const isCurrent = cycle?.currentIndex === i;
            return (
              <div
                key={`${templateId}-${i}`}
                className={`${styles.sequenceItem} ${isCurrent ? styles.current : ''}`}
              >
                <span className={styles.dayNum}>{i + 1}</span>
                <span className={styles.templateName}>
                  {tmpl?.name ?? 'Deleted Template'}
                </span>
                {isCurrent && <span className={styles.currentBadge}>Next</span>}
                <div className={styles.itemActions}>
                  <button
                    className={styles.moveBtn}
                    onClick={() => moveInSequence(i, i - 1)}
                    disabled={i === 0}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="18 15 12 9 6 15" />
                    </svg>
                  </button>
                  <button
                    className={styles.moveBtn}
                    onClick={() => moveInSequence(i, i + 1)}
                    disabled={i === sequence.length - 1}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                  <button className={styles.removeBtn} onClick={() => removeFromSequence(i)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title="No cycle defined"
          description="Add workout templates to your rotation. They will repeat in order."
        />
      )}

      {showPicker ? (
        <div className={styles.picker}>
          <p className={styles.pickerLabel}>Choose a template:</p>
          {templates.length === 0 ? (
            <p className={styles.pickerEmpty}>
              No templates created yet.{' '}
              <button className={styles.linkBtn} onClick={() => navigate('/templates/new')}>
                Create one
              </button>
            </p>
          ) : (
            <div className={styles.pickerList}>
              {templates.map((t) => (
                <button
                  key={t.id}
                  className={styles.pickerItem}
                  onClick={() => addToSequence(t.id)}
                >
                  {t.name}
                  <span className={styles.pickerMeta}>
                    {t.exercises.length} exercise{t.exercises.length !== 1 ? 's' : ''}
                  </span>
                </button>
              ))}
            </div>
          )}
          <Button variant="ghost" fullWidth onClick={() => setShowPicker(false)}>
            Cancel
          </Button>
        </div>
      ) : (
        <div className={styles.addArea}>
          <button className={styles.addBtn} onClick={() => setShowPicker(true)}>
            + Add to Cycle
          </button>
        </div>
      )}
    </div>
  );
}
