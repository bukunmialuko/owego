import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

const STEP_MS = 1200;

export function useScoreCalculation(stepCount: number, onComplete: () => void, isRunning: boolean) {
  const [completedSteps, setCompletedSteps] = useState(0);
  const isCancelled = useRef(false);

  useEffect(() => {
    if (!isRunning) return;

    isCancelled.current = false;
    const timers: ReturnType<typeof setTimeout>[] = [];

    function schedule(callback: () => void, delay: number) {
      timers.push(
        setTimeout(() => {
          if (!isCancelled.current) callback();
        }, delay),
      );
    }

    void AccessibilityInfo.isReduceMotionEnabled().then((prefersReducedMotion) => {
      if (isCancelled.current) return;

      if (prefersReducedMotion) {
        setCompletedSteps(stepCount);
        onComplete();

        return;
      }

      for (let step = 1; step <= stepCount; step += 1) {
        schedule(() => {
          setCompletedSteps(step);
        }, STEP_MS * step);
      }

      schedule(onComplete, STEP_MS * (stepCount + 1));
    });

    return () => {
      isCancelled.current = true;
      timers.forEach(clearTimeout);
      setCompletedSteps(0);
    };
  }, [isRunning, onComplete, stepCount]);

  return { completedSteps };
}
