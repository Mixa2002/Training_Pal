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
import { sessionVolume } from '../../utils/volume';
import styles from './VolumeChart.module.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

interface VolumeChartProps {
  sessions: Session[];
}

export default function VolumeChart({ sessions }: VolumeChartProps) {
  const completed = sessions
    .filter((s) => s.status === 'completed')
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-20);

  if (completed.length < 2) {
    return <div className={styles.empty}>Not enough data for volume trend yet.</div>;
  }

  const labels = completed.map((s) => {
    const dt = new Date(s.date + 'T00:00:00');
    return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  });

  const data = {
    labels,
    datasets: [
      {
        data: completed.map((s) => sessionVolume(s)),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: 4,
        pointBackgroundColor: '#3b82f6',
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
          label: (ctx: any) =>
            `${ctx.parsed.y.toLocaleString()} kg total`,
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
      <h3 className={styles.title}>Volume Trend</h3>
      <div className={styles.chart}>
        <Line data={data} options={options} />
      </div>
    </div>
  );
}
