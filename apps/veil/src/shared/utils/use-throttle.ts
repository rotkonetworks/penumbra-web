import { useCallback, useRef } from 'react';

/**
 * Creates a function that fires only once in a given time frame.
 *
 * This hook adapts the function for React since the framework tends
 * to reset function's inner state on each re-render.
 *
 * The returned function is stable across renders (its identity only
 * changes when `limit` does) — calling code can put it in a useEffect
 * dep array without the effect re-running every render. The latest
 * `func` is always invoked via ref, so closures stay current. The
 * previous form listed `func` in useCallback deps, which meant any
 * caller passing an inline arrow (most of them) re-allocated the
 * throttled fn every render — and an IntersectionObserver or event
 * listener that depended on it would tear down + rebuild every time.
 */
export function useThrottle<T extends (...args: unknown[]) => void>(func: T, limit: number) {
  const lastCall = useRef(0);
  const funcRef = useRef(func);
  funcRef.current = func;

  return useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastCall.current >= limit) {
        lastCall.current = now;
        funcRef.current(...args);
      }
    },
    [limit],
  );
}
