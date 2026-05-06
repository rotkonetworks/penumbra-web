'use client';

import { useCallback, useEffect, useState } from 'react';

export type BroadcastMode = 'veil' | 'wallet';

export const BROADCAST_MODE_STORAGE_KEY = 'veil:broadcast-mode';
export const DEFAULT_BROADCAST_MODE: BroadcastMode = 'veil';

const isBroadcastMode = (v: unknown): v is BroadcastMode => v === 'veil' || v === 'wallet';

export const readBroadcastMode = (): BroadcastMode => {
  if (typeof window === 'undefined') {
    return DEFAULT_BROADCAST_MODE;
  }
  try {
    const raw = window.localStorage.getItem(BROADCAST_MODE_STORAGE_KEY);
    if (raw && isBroadcastMode(raw)) {
      return raw;
    }
  } catch {
    /* empty */
  }
  return DEFAULT_BROADCAST_MODE;
};

const writeBroadcastMode = (mode: BroadcastMode) => {
  try {
    window.localStorage.setItem(BROADCAST_MODE_STORAGE_KEY, mode);
  } catch {
    /* empty */
  }
};

export const useBroadcastMode = () => {
  const [mode, setModeState] = useState<BroadcastMode>(DEFAULT_BROADCAST_MODE);

  useEffect(() => {
    setModeState(readBroadcastMode());
  }, []);

  const setMode = useCallback((next: BroadcastMode) => {
    setModeState(next);
    writeBroadcastMode(next);
  }, []);

  return { mode, setMode };
};
