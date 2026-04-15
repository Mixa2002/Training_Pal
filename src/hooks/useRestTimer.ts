import { useState, useEffect, useRef, useCallback } from 'react';

interface UseRestTimerReturn {
  remaining: number;
  isActive: boolean;
  start: (durationSeconds: number) => void;
  cancel: () => void;
}

export function useRestTimer(onComplete: () => void): UseRestTimerReturn {
  const [endTime, setEndTime] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const rafRef = useRef(0);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const start = useCallback((durationSeconds: number) => {
    const end = Date.now() + durationSeconds * 1000;
    setEndTime(end);
    setRemaining(durationSeconds);
    setIsActive(true);
  }, []);

  const cancel = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    setEndTime(null);
    setIsActive(false);
    setRemaining(0);
  }, []);

  // RAF loop for live countdown
  useEffect(() => {
    if (!endTime) return;

    const tick = () => {
      const now = Date.now();
      const rem = Math.max(0, Math.ceil((endTime - now) / 1000));
      setRemaining(rem);

      if (rem <= 0) {
        setIsActive(false);
        setEndTime(null);
        onCompleteRef.current();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [endTime]);

  // Visibility API: re-sync when screen wakes
  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === 'visible' && endTime) {
        const now = Date.now();
        const rem = Math.max(0, Math.ceil((endTime - now) / 1000));
        setRemaining(rem);
        if (rem <= 0) {
          setIsActive(false);
          setEndTime(null);
          onCompleteRef.current();
        }
      }
    }
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [endTime]);

  return { remaining, isActive, start, cancel };
}
