import styles from './ExerciseProgress.module.css';

interface ExerciseProgressProps {
  current: number;
  total: number;
}

export default function ExerciseProgress({ current, total }: ExerciseProgressProps) {
  const pct = ((current + 1) / total) * 100;
  return (
    <div className={styles.container}>
      <span className={styles.text}>
        Exercise {current + 1} of {total}
      </span>
      <div className={styles.bar}>
        <div className={styles.fill} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
