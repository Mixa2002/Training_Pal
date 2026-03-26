import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
} from 'chart.js';
import type { Session } from '../../db/types';
import { exerciseMaxWeight } from '../../utils/volume';
import styles from './ExerciseChart.module.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

interface ExerciseChartProps {
  sessions: Session[];
  exerciseId: string;
  exerciseName: string;
}

export default function ExerciseChart({ sessions, exerciseId, exerciseName }: ExerciseChartProps) {
  const dataPoints: { date: string; weight: number }[] = [];

  for (const s of sessions) {
    if (s.status !== 'completed') continue;
    const max = exerciseMaxWeight(s, exerciseId);
    if (max !== null) {
      dataPoints.push({ date: s.date, weight: max });
    }
  }

  dataPoints.sort((a, b) => a.date.localeCompare(b.date));
  const last20 = dataPoints.slice(-20);

  if (last20.length < 2) {
    return (
      <div className={styles.empty}>
        Not enough data for {exerciseName} yet.
      </div>
    );
  }

  const labels = last20.map((d) => {
    const dt = new Date(d.date + 'T00:00:00');
    return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  });

  const data = {
    labels,
    datasets: [
      {
        data: last20.map((d) => d.weight),
        borderColor: '#22c55e',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: 4,
        pointBackgroundColor: '#22c55e',
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      tooltip: {
        callbacks: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          label: (ctx: any) => `${ctx.parsed.y} kg`,
        },
      },
    },
    scales: {
      x: {
        ticks: { color: '#5a5a6a', font: { size: 10 } },
        grid: { display: false },
      },
      y: {
        ticks: { color: '#5a5a6a', font: { size: 10 } },
        grid: { color: 'rgba(42, 42, 53, 0.5)' },
      },
    },
  };

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>{exerciseName} — Max Weight</h3>
      <div className={styles.chart}>
        <Line data={data} options={options} />
      </div>
    </div>
  );
}
