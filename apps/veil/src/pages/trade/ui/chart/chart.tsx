import cn from 'clsx';
import { observer } from 'mobx-react-lite';
import {
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Text } from '@penumbra-zone/ui/Text';
import { DurationWindow, durationWindows } from '@/shared/utils/duration.ts';
import { BlockchainError } from '@/shared/ui/blockchain-error';
import { useInfiniteCandles } from '../../api/infinite-candles';
import { useLatestCandles } from '../../api/latest-candles';
import { ChartLoadingState } from './loading-chart';
import { useChartConfig } from './use-chart-config';
import { PriceContextMenu, PriceMenuItem } from './price-context-menu';
import { tradeFormStore } from '../order-form/store/OrderFormStore';
import { DepthOverlay } from './depth-overlay';
import { useOwnPositionLines } from './use-own-position-lines';
import { usePathSymbols } from '../../model/use-path';
import { useDrawings } from './drawings/use-drawings';
import { DrawingToolbar } from './drawings/toolbar';
import { DrawingsOverlay } from './drawings/drawings-overlay';
import type { ToolMode } from './drawings/types';
import { theme } from '@penumbra-zone/ui/theme';
import { HoverTooltip } from './hover-tooltip';

const VOLUME_RATIO_KEY = 'veil_chart_volume_ratio';

const readStoredVolumeRatio = (): number => {
  if (typeof window === 'undefined') return 0.2;
  const raw = window.localStorage.getItem(VOLUME_RATIO_KEY);
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) && n >= 0.05 && n <= 0.6 ? n : 0.2;
};

export const Chart = observer(() => {
  const [duration, setDuration] = useState<DurationWindow>('1d');
  const [volumeRatio, setVolumeRatioState] = useState(0.2);
  const containerRef = useRef<HTMLDivElement>(null);

  // we need two queries to avoid overfetching. if we leave only the infinite query, it will
  // be requested PAGE times on each block, causing many unnecessary requests.
  const { data: latestCandles } = useLatestCandles(duration);
  const { data: historyCandles, isLoading, error, fetchNextPage } = useInfiniteCandles(duration);

  const isFetching = useRef(false);
  const fetchNext = async () => {
    isFetching.current = true;
    await fetchNextPage();
    isFetching.current = false;
  };

  const {
    chartRef,
    setVolumeData,
    setCandlesData,
    setVolumeRatio,
    priceAtY,
    yAtPrice,
    xAtTime,
    setOwnPositionLines,
    subscribeRedraw,
    subscribeHover,
    subscribeChartClick,
  } = useChartConfig(fetchNext, isFetching);

  useOwnPositionLines(setOwnPositionLines);

  const { baseSymbol, quoteSymbol } = usePathSymbols();
  const {
    drawings,
    add: addDrawing,
    remove: removeDrawing,
    clearAll: clearDrawings,
  } = useDrawings(`${baseSymbol}/${quoteSymbol}`);
  const [tool, setTool] = useState<ToolMode>('none');

  const [menu, setMenu] = useState<{ x: number; y: number; price: number } | null>(null);

  useEffect(() => {
    const initial = readStoredVolumeRatio();
    setVolumeRatioState(initial);
    setVolumeRatio(initial);
  }, [setVolumeRatio]);

  useEffect(() => {
    if (!latestCandles?.length) {
      return;
    }
    setCandlesData(latestCandles);
  }, [latestCandles, setCandlesData]);

  useEffect(() => {
    if (!historyCandles?.pages.length) {
      return;
    }

    // pages need to be reversed, so that data is always in ASC order
    const candles = historyCandles.pages.toReversed().flat();
    setCandlesData(candles);
    setVolumeData(candles);
  }, [historyCandles, setCandlesData, setVolumeData]);

  const onDragStart = (e: ReactPointerEvent) => {
    e.preventDefault();
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const onMove = (ev: PointerEvent) => {
      const offset = ev.clientY - rect.top;
      // ratio = volume's share = portion below cursor
      const ratio = Math.min(0.6, Math.max(0.05, 1 - offset / rect.height));
      setVolumeRatioState(ratio);
      setVolumeRatio(ratio);
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      // Persist the final value by reading via the state setter (avoids a
      // dual-source-of-truth ref/state pair).
      setVolumeRatioState(current => {
        try {
          window.localStorage.setItem(VOLUME_RATIO_KEY, String(current));
        } catch {
          // ignore storage errors
        }
        return current;
      });
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const onContextMenu = (e: ReactMouseEvent) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const price = priceAtY(y);
    if (price === undefined) return;
    e.preventDefault();
    setMenu({ x: e.clientX - rect.left, y, price });
  };

  // Drawings click handling. lightweight-charts intercepts pointer events on
  // its canvas, so DOM onClick on the container doesn't fire reliably; route
  // through the chart's native subscribeClick. Refs prevent re-subscribing
  // on every tool/state change.
  const toolRef = useRef<ToolMode>(tool);
  useEffect(() => {
    toolRef.current = tool;
  }, [tool]);

  // Pending first anchor for two-click drawing tools (trend-line, rectangle).
  const pendingAnchorRef = useRef<{ time: number; price: number } | null>(null);

  // Inline text-input state for the text annotation tool.
  const [pendingText, setPendingText] = useState<{
    x: number;
    y: number;
    time: number;
    price: number;
  } | null>(null);
  const [pendingTextValue, setPendingTextValue] = useState('');

  useEffect(() => {
    return subscribeChartClick((point, price, time) => {
      const t = toolRef.current;
      if (t === 'text') {
        if (time === undefined) return;
        setPendingText({ x: point.x, y: point.y, time, price });
        setPendingTextValue('');
        return;
      }
      if (t === 'horizontal-line') {
        addDrawing({
          id: `hl-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          kind: 'horizontal-line',
          price,
          color: theme.color.primary.main,
          createdAt: Date.now(),
        });
        setTool('none');
        return;
      }
      if (t === 'trend-line' || t === 'rectangle') {
        if (time === undefined) return;
        if (pendingAnchorRef.current === null) {
          pendingAnchorRef.current = { time, price };
          return;
        }
        const a = pendingAnchorRef.current;
        addDrawing({
          id: `${t === 'trend-line' ? 'tl' : 'rc'}-${Date.now()}-${Math.floor(
            Math.random() * 1000,
          )}`,
          kind: t,
          time1: a.time,
          price1: a.price,
          time2: time,
          price2: price,
          color: theme.color.primary.main,
          createdAt: Date.now(),
        });
        pendingAnchorRef.current = null;
        setTool('none');
      }
    });
  }, [subscribeChartClick, addDrawing]);

  // Reset the pending anchor whenever the tool leaves a two-click mode
  // (e.g. user picks cursor mid-placement) so a stale half-shape doesn't
  // hang around.
  useEffect(() => {
    if (tool !== 'trend-line' && tool !== 'rectangle') pendingAnchorRef.current = null;
    if (tool !== 'text') {
      setPendingText(null);
      setPendingTextValue('');
    }
  }, [tool]);

  const commitPendingText = () => {
    if (!pendingText) return;
    const value = pendingTextValue.trim();
    if (value) {
      addDrawing({
        id: `tx-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        kind: 'text',
        time: pendingText.time,
        price: pendingText.price,
        text: value,
        color: theme.color.primary.main,
        createdAt: Date.now(),
      });
    }
    setPendingText(null);
    setPendingTextValue('');
    setTool('none');
  };

  const cancelPendingText = () => {
    setPendingText(null);
    setPendingTextValue('');
    setTool('none');
  };

  const formatPrice = (p: number): string => {
    if (p >= 1) return p.toFixed(4);
    if (p >= 0.01) return p.toFixed(5);
    if (p >= 0.0001) return p.toFixed(6);
    return p.toPrecision(4);
  };

  const buildMenuItems = (price: number): PriceMenuItem[] => {
    const priceStr = formatPrice(price);
    const applyLimit = (direction: 'buy' | 'sell') => () => {
      tradeFormStore.setWhichForm('Limit');
      tradeFormStore.limitForm.setDirection(direction);
      tradeFormStore.limitForm.setPriceInput(priceStr);
    };
    const applyLPBound = (which: 'lower' | 'upper') => () => {
      tradeFormStore.setWhichForm('SimpleLP');
      const setter =
        which === 'lower'
          ? tradeFormStore.simpleLPForm.setLowerPriceInput
          : tradeFormStore.simpleLPForm.setUpperPriceInput;
      setter(price);
    };
    return [
      { label: 'Buy at this price', tone: 'buy', onSelect: applyLimit('buy') },
      { label: 'Sell at this price', tone: 'sell', onSelect: applyLimit('sell') },
      { label: 'Set as LP lower bound', tone: 'neutral', onSelect: applyLPBound('lower') },
      { label: 'Set as LP upper bound', tone: 'neutral', onSelect: applyLPBound('upper') },
    ];
  };

  return (
    <div className='flex h-full min-h-0 flex-col'>
      <div className='flex border-b border-b-other-solid-stroke px-3'>
        {durationWindows.map(w => (
          <button
            key={w}
            type='button'
            className={cn(
              'flex items-center rounded px-1.5 py-3 transition-colors hover:bg-action-hover-overlay hover:text-text-primary',
              w === duration ? 'bg-action-active-overlay text-text-primary' : 'text-text-secondary',
            )}
            onClick={() => setDuration(w)}
          >
            <Text detail>{w}</Text>
          </button>
        ))}
      </div>

      <div
        className='relative flex min-h-0 grow items-center justify-center'
        ref={containerRef}
        onContextMenu={onContextMenu}
        style={tool !== 'none' ? { cursor: 'crosshair' } : undefined}
      >
        {error && <BlockchainError direction='column' />}
        {!error && isLoading && <ChartLoadingState />}
        {!error && !isLoading && historyCandles && (
          <>
            <div className='h-full w-full' ref={chartRef} />
            <DepthOverlay yAtPrice={yAtPrice} subscribeRedraw={subscribeRedraw} />
            <DrawingsOverlay
              drawings={drawings}
              yAtPrice={yAtPrice}
              xAtTime={xAtTime}
              subscribeRedraw={subscribeRedraw}
              onDelete={removeDrawing}
            />
            <DrawingToolbar
              tool={tool}
              onToolChange={setTool}
              onClearAll={clearDrawings}
              hasDrawings={drawings.length > 0}
            />
            <HoverTooltip subscribeHover={subscribeHover} quoteSymbol={quoteSymbol} />
            {pendingText && (
              <input
                autoFocus
                value={pendingTextValue}
                onChange={e => setPendingTextValue(e.target.value)}
                onBlur={commitPendingText}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    commitPendingText();
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    cancelPendingText();
                  }
                }}
                placeholder='Type and press Enter…'
                className='absolute z-30 rounded-sm border border-other-tonal-stroke bg-base-black px-2 py-1 text-xs text-text-primary shadow-md outline-none focus:border-text-primary'
                style={{
                  left: pendingText.x,
                  top: Math.max(0, pendingText.y - 12),
                  minWidth: 160,
                }}
              />
            )}
            <div
              role='separator'
              aria-orientation='horizontal'
              onPointerDown={onDragStart}
              className='absolute left-0 right-0 z-10 h-2 -translate-y-1/2 cursor-row-resize bg-transparent hover:bg-other-solid-stroke/40'
              style={{ top: `${(1 - volumeRatio) * 100}%` }}
            />
            {menu && (
              <PriceContextMenu
                x={menu.x}
                y={menu.y}
                price={formatPrice(menu.price)}
                items={buildMenuItems(menu.price)}
                onClose={() => setMenu(null)}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
});
