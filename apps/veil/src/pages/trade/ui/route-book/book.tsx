import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { BlockchainError } from '@/shared/ui/blockchain-error';
import { pnum } from '@penumbra-zone/types/pnum';
import { usePathSymbols } from '../../model/use-path';
import { useBook } from '../../api/book';
import type { Trace } from '@/shared/api/server/book/types';
import { calculateRelativeSizes } from './utils';
import { RouteBookLoadingRow } from './loading-row';
import { TradeRow } from './trade-row';
import { SpreadRow } from './spread-row';
import { RouteBookHeader } from './header-row';
import { tradeFormStore } from '../order-form/store/OrderFormStore';

const CUMULATIVE_KEY = 'veil-route-book-cumulative';

const readCumulativePref = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(CUMULATIVE_KEY) === '1';
};

// Click on a sell row → user wants to buy at the asking price.
// Click on a buy row  → user wants to sell into that bid.
// Mirrors TradingView / Binance behavior.
const prefillFromBookRow = (price: string, isSell: boolean) => {
  tradeFormStore.setWhichForm('Limit');
  tradeFormStore.limitForm.setDirection(isSell ? 'buy' : 'sell');
  tradeFormStore.limitForm.setPriceInput(price);
};

/**
 * Walk levels in display order and replace each row's `total` with the
 * cumulative sum from the touch outward. Sell rows are rendered top-down
 * with worst-price first; we accumulate from the *last* row (closest to
 * the spread) up. Buy rows are rendered top-down with best bid first; we
 * accumulate from the *first* row down.
 */
const accumulate = (rows: Trace[], side: 'sell' | 'buy'): Trace[] => {
  const out = new Array<Trace>(rows.length);
  let running = 0;
  if (side === 'sell') {
    for (let i = rows.length - 1; i >= 0; i--) {
      const r = rows[i]!;
      running += pnum(r.total).toNumber();
      out[i] = { ...r, total: running.toString() };
    }
  } else {
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]!;
      running += pnum(r.total).toNumber();
      out[i] = { ...r, total: running.toString() };
    }
  }
  return out;
};

export const RouteBook = observer(() => {
  const { data, isLoading, error: bookErr } = useBook();
  const [cumulative, setCumulative] = useState(false);

  useEffect(() => {
    setCumulative(readCumulativePref());
  }, []);

  const toggleCumulative = () => {
    setCumulative(c => {
      const next = !c;
      try {
        window.localStorage.setItem(CUMULATIVE_KEY, next ? '1' : '0');
      } catch {
        // ignore storage errors
      }
      return next;
    });
  };

  const multiHops = data?.multiHops;
  const pair = usePathSymbols();

  const sellRows = useMemo(
    () => (multiHops ? (cumulative ? accumulate(multiHops.sell, 'sell') : multiHops.sell) : []),
    [multiHops, cumulative],
  );
  const buyRows = useMemo(
    () => (multiHops ? (cumulative ? accumulate(multiHops.buy, 'buy') : multiHops.buy) : []),
    [multiHops, cumulative],
  );

  // Width of the gradient bar follows whichever totals we're rendering.
  // Memoize on the row arrays — useBook polls every block (~5s), so on
  // pairs with deep books this iterates 30+ rows twice per refetch. The
  // map identity also matters: stable references mean child <TradeRow>
  // memoization doesn't bust on every block.
  const sellRelativeSizes = useMemo(() => calculateRelativeSizes(sellRows), [sellRows]);
  const buyRelativeSizes = useMemo(() => calculateRelativeSizes(buyRows), [buyRows]);

  // Stable click handlers — without useCallback these would be fresh
  // function references on every render, busting any future memo() on
  // <TradeRow>. The handlers don't depend on any state inside the
  // component, so empty deps are safe.
  const onSellClick = useCallback((price: string) => prefillFromBookRow(price, true), []);
  const onBuyClick = useCallback((price: string) => prefillFromBookRow(price, false), []);

  if (bookErr) {
    return (
      <div className='flex min-h-[600px] items-center justify-center p-4'>
        <BlockchainError
          message='An error occurred while loading data from the blockchain'
          direction='column'
        />
      </div>
    );
  }

  if (isLoading || !multiHops) {
    return (
      <div className='mt-2 grid w-full auto-rows-[32px] grid-cols-[1fr_1fr_1fr_1fr] gap-x-2'>
        <RouteBookHeader
          quote={pair.quoteSymbol}
          base={pair.baseSymbol}
          cumulative={cumulative}
          onToggleCumulative={toggleCumulative}
        />
        {Array(17)
          .fill(1)
          .map((_, i) => (
            <RouteBookLoadingRow isSpread={i === 8} key={i} />
          ))}
      </div>
    );
  }

  return (
    <div className='mt-2 grid w-full auto-rows-[32px] grid-cols-[1fr_1fr_1fr_1fr] items-center gap-x-2'>
      <RouteBookHeader
        quote={pair.quoteSymbol}
        base={pair.baseSymbol}
        cumulative={cumulative}
        onToggleCumulative={toggleCumulative}
      />

      {sellRows.map((trace, idx) => (
        // Use idx as the key, not price+idx. The Nth sell row stays
        // the Nth sell row across book updates even when its price
        // moves — keying on price would unmount/remount the entire
        // row DOM subtree on every level shift, killing CSS
        // transitions and triggering paint thrash on each block.
        <TradeRow
          key={`sell-${idx}`}
          trace={trace}
          isSell={true}
          relativeSize={sellRelativeSizes.get(trace.total) ?? 0}
          onClick={onSellClick}
        />
      ))}

      <SpreadRow sellOrders={multiHops.sell} buyOrders={multiHops.buy} />

      {buyRows.map((trace, idx) => (
        <TradeRow
          key={`buy-${idx}`}
          trace={trace}
          isSell={false}
          relativeSize={buyRelativeSizes.get(trace.total) ?? 0}
          onClick={onBuyClick}
        />
      ))}
    </div>
  );
});
