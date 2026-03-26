import styles from './RestTimerDisplay.module.css';

interface RestTimerDisplayProps {
  remaining: number;
  onSkip: () => void;
}

export default function RestTimerDisplay({ remaining, onSkip }: RestTimerDisplayProps) {
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const display = minutes > 0
    ? `${minutes}:${seconds.toString().padStart(2, '0')}`
    : `${seconds}`;

  return (
    <div className={styles.container}>
      <div className={styles.label}>Rest</div>
      <div className={styles.time}>{display}</div>
      <button className={styles.skipBtn} onClick={onSkip}>
        Skip Rest
      </button>
    </div>
  );
}
