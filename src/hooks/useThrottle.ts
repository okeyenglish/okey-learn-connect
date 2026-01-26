import { useCallback, useRef, useEffect } from 'react';

/**
 * Hook that returns a throttled version of a function.
 * The function will be called at most once per `delay` milliseconds.
 * Includes trailing call to ensure the last invocation is captured.
 */
export function useThrottle<T extends (...args: any[]) => void>(
  fn: T,
  delay: number
): T {
  const lastCallRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastArgsRef = useRef<Parameters<T> | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      lastArgsRef.current = args;

      // If enough time has passed since last call, execute immediately
      if (now - lastCallRef.current >= delay) {
        lastCallRef.current = now;
        fn(...args);
      } else {
        // Schedule trailing call to capture the last invocation
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        const remaining = delay - (now - lastCallRef.current);
        timeoutRef.current = setTimeout(() => {
          lastCallRef.current = Date.now();
          if (lastArgsRef.current) {
            fn(...lastArgsRef.current);
          }
        }, remaining);
      }
    },
    [fn, delay]
  ) as T;
}
