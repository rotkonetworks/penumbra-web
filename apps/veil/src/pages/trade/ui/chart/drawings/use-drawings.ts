import { useCallback, useEffect, useRef, useState } from 'react';
import type { Drawing } from './types';

/**
 * Drawings state with localStorage persistence and undo/redo history.
 *
 * Storage key is `veil-chart-drawings:<base>/<quote>`. Drawings are stored
 * in chart coordinates (price), so panning/zooming the chart leaves them
 * anchored to the data, not the viewport.
 *
 * Undo/redo uses past[] and future[] stacks of full Drawing[] snapshots.
 * Snapshot is cheap because Drawing is small (a handful of numbers and
 * strings) and per-pair counts are tiny. Capped at HISTORY_LIMIT to bound
 * memory if a power user spams 10k drawings.
 */
const HISTORY_LIMIT = 200;

export const useDrawings = (pairKey: string) => {
  const storageKey = `veil-chart-drawings:${pairKey}`;
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const pastRef = useRef<Drawing[][]>([]);
  const futureRef = useRef<Drawing[][]>([]);
  // Tick to surface canUndo/canRedo through React state (refs don't trigger
  // rerenders).
  const [, setHistoryTick] = useState(0);

  // Load on mount / pair change. Switching pairs resets history — undoing
  // back into a previous pair would be confusing.
  useEffect(() => {
    pastRef.current = [];
    futureRef.current = [];
    setHistoryTick(t => t + 1);
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

  // Mutate with history: push the current state to past, clear redo stack.
  const mutate = useCallback(
    (compute: (curr: Drawing[]) => Drawing[]) => {
      setDrawings(curr => {
        const next = compute(curr);
        if (next === curr) return curr;
        pastRef.current = [...pastRef.current, curr].slice(-HISTORY_LIMIT);
        futureRef.current = [];
        persist(next);
        return next;
      });
      setHistoryTick(t => t + 1);
    },
    [persist],
  );

  const add = useCallback((d: Drawing) => mutate(curr => [...curr, d]), [mutate]);

  const remove = useCallback(
    (id: string) => mutate(curr => curr.filter(d => d.id !== id)),
    [mutate],
  );

  const clearAll = useCallback(() => mutate(() => []), [mutate]);

  const undo = useCallback(() => {
    setDrawings(curr => {
      const prev = pastRef.current.pop();
      if (prev === undefined) return curr;
      futureRef.current = [curr, ...futureRef.current].slice(0, HISTORY_LIMIT);
      persist(prev);
      return prev;
    });
    setHistoryTick(t => t + 1);
  }, [persist]);

  const redo = useCallback(() => {
    setDrawings(curr => {
      const next = futureRef.current.shift();
      if (next === undefined) return curr;
      pastRef.current = [...pastRef.current, curr].slice(-HISTORY_LIMIT);
      persist(next);
      return next;
    });
    setHistoryTick(t => t + 1);
  }, [persist]);

  const canUndo = pastRef.current.length > 0;
  const canRedo = futureRef.current.length > 0;

  return { drawings, add, remove, clearAll, undo, redo, canUndo, canRedo };
};
