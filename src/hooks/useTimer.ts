import { useState, useEffect, useRef } from 'react';

export function useTimer(initialTime: number, onTimeEnd: () => void) {
  const [timeRemaining, setTimeRemaining] = useState(initialTime);
  const timerRef = useRef<NodeJS.Timeout>();
  const processingRef = useRef(false);

  useEffect(() => {
    const updateTimer = () => {
      setTimeRemaining(prev => {
        // Only process when exactly hitting zero
        if (prev === 1 && !processingRef.current) {
          processingRef.current = true;
          onTimeEnd();
          processingRef.current = false;
          return initialTime;
        }
        return prev > 0 ? prev - 1 : initialTime;
      });
    };

    timerRef.current = setInterval(updateTimer, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [initialTime, onTimeEnd]);

  return timeRemaining;
}