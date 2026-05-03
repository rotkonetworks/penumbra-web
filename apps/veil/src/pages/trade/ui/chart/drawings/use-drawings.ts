import { useCallback, useEffect, useState } from 'react';
import type { Drawing } from './types';

/**
 * Drawings state hook with localStorage persistence per trading pair.
 *
 * Storage key is `veil-chart-drawings:<base>/<quote>`. Drawings are stored
 * in chart coordinates (price), so panning/zooming the chart leaves them
 * anchored to the data, not the viewport.
 */
export const useDrawings = (pairKey: string) => {
  const storageKey = `veil-chart-drawings:${pairKey}`;
  const [drawings, setDrawings] = useState<Drawing[]>([]);

  // Load on mount / pair change.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as Drawing[];
        if (Array.isArray(parsed)) {
          setDrawings(parsed);
          return;
        }
      }
    } catch {
      // ignore corrupt storage
    }
    setDrawings([]);
  }, [storageKey]);

  const persist = useCallback(
    (next: Drawing[]) => {
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // ignore storage errors
      }
    },
    [storageKey],
  );

  const add = useCallback(
    (d: Drawing) => {
      setDrawings(curr => {
        const next = [...curr, d];
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const remove = useCallback(
    (id: string) => {
      setDrawings(curr => {
        const next = curr.filter(d => d.id !== id);
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const clearAll = useCallback(() => {
    setDrawings(() => {
      persist([]);
      return [];
    });
  }, [persist]);

  return { drawings, add, remove, clearAll };
};
