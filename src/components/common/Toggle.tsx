import styles from './Toggle.module.css';

interface ToggleProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export default function Toggle({ label, description, checked, onChange }: ToggleProps) {
  return (
    <button
      className={styles.row}
      onClick={() => onChange(!checked)}
      role="switch"
      aria-checked={checked}
    >
      <div className={styles.info}>
        <span className={styles.label}>{label}</span>
        {description && <span className={styles.description}>{description}</span>}
      </div>
      <div className={`${styles.track} ${checked ? styles.on : ''}`}>
        <div className={styles.thumb} />
      </div>
    </button>
  );
}
