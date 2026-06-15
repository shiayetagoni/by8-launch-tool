import { useEffect, useRef, useState } from "react";

/**
 * Returns a number that slowly drifts within [min, max] at random intervals.
 * Single setTimeout chain — no setInterval. Cleanup on unmount.
 */
export function useDriftingCounter(
  min: number,
  max: number,
  intervalMs = 30_000,
  maxDelta = 5,
): number {
  const [value, setValue] = useState(() =>
    Math.floor(min + Math.random() * (max - min + 1)),
  );
  // Use a ref for the current value to avoid excessive re-renders
  const valueRef = useRef(value);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    function scheduleNext() {
      const jitter =
        intervalMs < 8000
          ? 4000 + Math.random() * 4000
          : intervalMs + (Math.random() * 4000 - 2000);
      timeoutId = setTimeout(() => {
        const bounded =
          maxDelta > 5
            ? Math.floor(Math.random() * (maxDelta * 2 + 1)) - maxDelta
            : Math.floor(Math.random() * 41) - 20;
        const next = Math.min(max, Math.max(min, valueRef.current + bounded));
        // Only trigger re-render if value changed by more than 0.5%
        const threshold = Math.max(1, Math.abs(valueRef.current) * 0.005);
        if (Math.abs(next - valueRef.current) >= threshold) {
          valueRef.current = next;
          setValue(next);
        }
        scheduleNext();
      }, jitter);
    }

    scheduleNext();
    return () => clearTimeout(timeoutId);
  }, [min, max, intervalMs, maxDelta]);

  return value;
}

/**
 * Returns a number that increments by +1 every `intervalMs`.
 * Uses setInterval with proper cleanup.
 */
export function useIncrementingCounter(
  initialValue: number,
  intervalMs = 45_000,
): number {
  const [value, setValue] = useState(initialValue);
  const valueRef = useRef(initialValue);
  useEffect(() => {
    const id = setInterval(() => {
      valueRef.current += 1;
      setValue(valueRef.current);
    }, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return value;
}

/**
 * Returns a SOL value that increments slowly at random intervals.
 */
export function useIncrementingSol(
  initialValue: number,
  amounts: number[],
  intervalMs = 55_000,
): number {
  const [value, setValue] = useState(initialValue);
  const valueRef = useRef(initialValue);
  const amountsRef = useRef(amounts);
  amountsRef.current = amounts;

  useEffect(() => {
    const id = setInterval(() => {
      const arr = amountsRef.current;
      const bump = arr[Math.floor(Math.random() * arr.length)];
      valueRef.current = Number((valueRef.current + bump).toFixed(2));
      setValue(valueRef.current);
    }, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return value;
}
