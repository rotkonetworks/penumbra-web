'use client';

import { useEffect, useRef } from 'react';
import { useMarketPrice } from './useMarketPrice';
import { usePathSymbols } from './use-path';

const formatPrice = (p: number): string => {
  if (p >= 1) return p.toFixed(4);
  if (p >= 0.01) return p.toFixed(5);
  if (p >= 0.0001) return p.toFixed(6);
  return p.toPrecision(4);
};

/**
 * Stamp the current pair's live mid-price into document.title so a trader
 * with several tabs open can read prices off the tab bar without switching
 * — the small QoL Binance/Coinbase/Hyperliquid have had forever.
 *
 * Restores whatever title the page had on mount when the trade route is
 * left, so the user doesn't end up with a stale price string in their tab
 * after navigating away.
 */
export const useLivePriceTitle = () => {
  const { baseSymbol, quoteSymbol } = usePathSymbols();
  const { marketPrice } = useMarketPrice();

  // Capture the title we found when this hook mounted; restore it on
  // unmount so navigating away doesn't leak the price string.
  const initialTitleRef = useRef<string | null>(null);
  useEffect(() => {
    initialTitleRef.current = document.title;
    return () => {
      if (initialTitleRef.current !== null) {
        document.title = initialTitleRef.current;
      }
    };
  }, []);

  useEffect(() => {
    const pair = `${baseSymbol}/${quoteSymbol}`;
    const priceStr = marketPrice != null ? formatPrice(marketPrice) : '—';
    document.title = `${priceStr} ${pair} · Veil`;
  }, [baseSymbol, quoteSymbol, marketPrice]);
};
