import styles from './RirSelector.module.css';

interface RirSelectorProps {
  value: number | null;
  onChange: (value: number) => void;
}

export default function RirSelector({ value, onChange }: RirSelectorProps) {
  return (
    <div className={styles.container}>
      <label className={styles.label}>RIR</label>
      <div className={styles.buttons}>
        {[0, 1, 2].map((n) => (
          <button
            key={n}
            className={`${styles.btn} ${value === n ? styles.selected : ''}`}
            onClick={() => onChange(n)}
            type="button"
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}
