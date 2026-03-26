import { useNavigate } from 'react-router-dom';
import type { Template } from '../../db/types';
import styles from './TemplateCard.module.css';

interface TemplateCardProps {
  template: Template;
  onDelete: (id: string) => void;
}

export default function TemplateCard({ template, onDelete }: TemplateCardProps) {
  const navigate = useNavigate();
  const exerciseCount = template.exercises.length;
  const strengthCount = template.exercises.filter((e) => e.type === 'strength').length;
  const cardioCount = template.exercises.filter((e) => e.type === 'cardio').length;

  const summary = [
    strengthCount > 0 ? `${strengthCount} strength` : '',
    cardioCount > 0 ? `${cardioCount} cardio` : '',
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <div className={styles.card} onClick={() => navigate(`/templates/${template.id}`)}>
      <div className={styles.info}>
        <h3 className={styles.name}>{template.name}</h3>
        <p className={styles.meta}>
          {exerciseCount} exercise{exerciseCount !== 1 ? 's' : ''}
          {summary ? ` · ${summary}` : ''}
        </p>
      </div>
      <button
        className={styles.deleteBtn}
        onClick={(e) => {
          e.stopPropagation();
          onDelete(template.id);
        }}
        aria-label="Delete template"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
      </button>
    </div>
  );
}
