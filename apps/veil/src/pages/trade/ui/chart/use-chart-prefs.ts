'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * Per-user toggle state for chart overlays — persisted to localStorage so
 * the trader's preferences ride across sessions, like Binance/TradingView.
 *
 * Keep keys boolean so the storage payload stays parseable even when the
 * shape grows (new overlay types append, existing keys default to true if
 * absent in storage so users opting in once don't lose their chart on
 * release of new overlays).
 */
export interface ChartPrefs {
  depth: boolean;
  midPrice: boolean;
  ownPositions: boolean;
  // wired up in subsequent passes
  ownTrades: boolean;
  openOrders: boolean;
}

const DEFAULTS: ChartPrefs = {
  // Chart-edge depth heat overlay is OFF by default — the route-book panel
  // beside the chart already shows route depth per-row as red/green bars
  // (MEXC/Binance-style). Users who want the heat shape can opt in via the
  // settings menu.
  depth: false,
  midPrice: true,
  ownPositions: true,
  ownTrades: false,
  openOrders: false,
};

const STORAGE_KEY = 'veil_chart_prefs';

const read = (): ChartPrefs => {
  if (typeof window === 'undefined') return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<ChartPrefs>;
    return { ...DEFAULTS, ...parsed };
  } catch {
    return DEFAULTS;
  }
};

const write = (prefs: ChartPrefs) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // ignore storage errors
  }
};

export const useChartPrefs = () => {
  // Start at defaults on the server (and during the first client render so
  // hydration matches), then hydrate from localStorage in an effect.
  const [prefs, setPrefs] = useState<ChartPrefs>(DEFAULTS);

  useEffect(() => {
    setPrefs(read());
  }, []);

  const toggle = useCallback((key: keyof ChartPrefs) => {
    setPrefs(prev => {
      const next = { ...prev, [key]: !prev[key] };
      write(next);
      return next;
    });
  }, []);

  return { prefs, toggle };
};
