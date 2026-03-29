import { useState, useEffect } from 'react';

export function useStopwatch(startTime: number): number {
  const [elapsed, setElapsed] = useState(() =>
    Math.floor((Date.now() - startTime) / 1000)
  );

  useEffect(() => {
    const sync = () => setElapsed(Math.floor((Date.now() - startTime) / 1000));

    const id = setInterval(sync, 1000);

    function handleVisibility() {
      if (document.visibilityState === 'visible') {
        sync();
      }
    }
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [startTime]);

  return elapsed;
}

export function formatStopwatch(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
