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
import { useOwnFillMarkers } from './use-own-fill-markers';
import { usePathSymbols } from '../../model/use-path';
import { useDrawings } from './drawings/use-drawings';
import { DrawingToolbar } from './drawings/toolbar';
import { DrawingsOverlay } from './drawings/drawings-overlay';
import type { ToolMode } from './drawings/types';
import { theme } from '@penumbra-zone/ui/theme';
import { HoverTooltip } from './hover-tooltip';
import { useChartPrefs } from './use-chart-prefs';
import { ChartSettingsMenu } from './chart-settings-menu';
import { connectionStore } from '@/shared/model/connection';
import { useMarketPrice } from '../../model/useMarketPrice';
import { usePriceAlerts } from './alerts/use-price-alerts';
import { useAlertWatcher } from './alerts/use-alert-watcher';
import { AlertsMenu } from './alerts/alerts-menu';

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
    setOwnFillMarkers,
    chartReady,
    resetView,
    timeAtX,
    subscribeRedraw,
    subscribeHover,
    subscribeChartClick,
  } = useChartConfig(fetchNext, isFetching);

  const { prefs, toggle } = useChartPrefs();

  // Gate per-overlay data feeds behind the user's preference. The hooks
  // still mount (so the queries they own can settle), but we hand each a
  // no-op setter when disabled so nothing is pushed to the chart.
  const noopSetter = (_: unknown) => {};
  useOwnPositionLines(prefs.ownPositions ? setOwnPositionLines : (noopSetter as typeof setOwnPositionLines));
  useOwnFillMarkers(prefs.ownTrades ? setOwnFillMarkers : (noopSetter as typeof setOwnFillMarkers));

  const { baseSymbol, quoteSymbol } = usePathSymbols();
  const { marketPrice } = useMarketPrice();
  const pairKey = `${baseSymbol}/${quoteSymbol}`;
  const {
    alerts: pairAlerts,
    add: addAlert,
    remove: removeAlert,
    markTriggered: markAlertTriggered,
  } = usePriceAlerts(pairKey);
  useAlertWatcher({ marketPrice, alerts: pairAlerts, onFire: markAlertTriggered });
  const {
    drawings,
    add: addDrawing,
    remove: removeDrawing,
    clearAll: clearDrawings,
    undo: undoDrawing,
    redo: redoDrawing,
    canUndo,
    canRedo,
  } = useDrawings(`${baseSymbol}/${quoteSymbol}`);

  // Cmd/Ctrl-Z and Cmd/Ctrl-Shift-Z while the chart is the active subtree.
  // Listening on the document so the shortcuts work regardless of which
  // chart sub-element has focus, but we ignore events that bubble out of
  // an editable input/textarea so the user's text-annotation typing isn't
  // hijacked.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key.toLowerCase() !== 'z') return;
      e.preventDefault();
      if (e.shiftKey) redoDrawing();
      else undoDrawing();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [undoDrawing, redoDrawing]);
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

  // Single click-handling routine used by both the lightweight-charts native
  // subscribeClick (when it fires) and the DOM click-capture overlay above
  // (which is the reliable path while a tool is selected).
  const handleDrawingClick = (
    point: { x: number; y: number },
    price: number,
    time: number | undefined,
  ) => {
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
  };

  useEffect(() => {
    return subscribeChartClick(handleDrawingClick);
    // chartReady listed so the effect re-runs once createChart has actually
    // mounted — first run at mount sees an empty chart and the inner subscribe
    // would short-circuit otherwise.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- handleDrawingClick is a stable closure over refs
  }, [subscribeChartClick, addDrawing, chartReady]);

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
    const setAlertHere = () => {
      addAlert({
        pair: pairKey,
        targetPrice: price,
        direction:
          marketPrice == null ? 'above' : price >= marketPrice ? 'above' : 'below',
        browser:
          typeof window !== 'undefined' &&
          'Notification' in window &&
          Notification.permission === 'granted',
        ntfyTopic: '',
      });
    };

    // Buy makes sense only below the current mid (you'd be paying above
    // mid to buy, which is a market order — caller should use the chart
    // body for that, not a contextual click). Sell similarly only above.
    // If we don't yet know the mid, show both (legacy behaviour).
    const showBuy = marketPrice == null || price < marketPrice;
    const showSell = marketPrice == null || price > marketPrice;

    const items: PriceMenuItem[] = [];
    if (showBuy) {
      items.push({ label: 'Buy at this price', tone: 'buy', onSelect: applyLimit('buy') });
    }
    if (showSell) {
      items.push({ label: 'Sell at this price', tone: 'sell', onSelect: applyLimit('sell') });
    }
    items.push(
      { label: 'Set as LP lower bound', tone: 'neutral', onSelect: applyLPBound('lower') },
      { label: 'Set as LP upper bound', tone: 'neutral', onSelect: applyLPBound('upper') },
      {
        label:
          marketPrice != null && price >= marketPrice
            ? 'Alert when price goes above'
            : 'Alert when price drops below',
        tone: 'neutral',
        onSelect: setAlertHere,
      },
      { label: 'Reset chart view', tone: 'neutral', onSelect: resetView },
    );
    return items;
  };

  return (
    <div className='flex h-full min-h-0 flex-col'>
      <div className='flex items-center justify-between border-b border-b-other-solid-stroke px-3'>
        <div className='flex'>
          {durationWindows.map(w => (
            <button
              key={w}
              type='button'
              className={cn(
                'flex items-center rounded px-1.5 py-3 transition-colors hover:bg-action-hover-overlay hover:text-text-primary',
                w === duration
                  ? 'bg-action-active-overlay text-text-primary'
                  : 'text-text-secondary',
              )}
              onClick={() => setDuration(w)}
            >
              <Text detail>{w}</Text>
            </button>
          ))}
        </div>
        <div className='flex items-center gap-1'>
          <AlertsMenu
            pair={pairKey}
            marketPrice={marketPrice}
            alerts={pairAlerts}
            onAdd={addAlert}
            onRemove={removeAlert}
          />
          <ChartSettingsMenu
            prefs={prefs}
            onToggle={toggle}
            walletConnected={connectionStore.connected}
          />
        </div>
      </div>

      <div
        className='relative flex min-h-0 grow items-center justify-center'
        ref={containerRef}
        onContextMenu={onContextMenu}
        style={tool !== 'none' ? { cursor: 'crosshair' } : undefined}
      >
        {/* Click-capture overlay shown only while a drawing tool is active.
            lightweight-charts' own subscribeClick has been unreliable here
            (chart eats some clicks for pan/zoom), so we route the drawing
            placement through a real DOM event instead. */}
        {tool !== 'none' && historyCandles && (
          <div
            className='absolute inset-0 z-[5] cursor-crosshair'
            onClick={e => {
              const container = containerRef.current;
              if (!container) return;
              const rect = container.getBoundingClientRect();
              const x = e.clientX - rect.left;
              const y = e.clientY - rect.top;
              const price = priceAtY(y);
              const time = timeAtX(x);
              if (price === undefined) return;
              handleDrawingClick({ x, y }, price, time);
            }}
          />
        )}
        {error && <BlockchainError direction='column' />}
        {!error && isLoading && <ChartLoadingState />}
        {!error && !isLoading && historyCandles && (
          <>
            <div className='h-full w-full' ref={chartRef} />
            {prefs.depth && <DepthOverlay yAtPrice={yAtPrice} subscribeRedraw={subscribeRedraw} />}
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
              onUndo={undoDrawing}
              onRedo={redoDrawing}
              canUndo={canUndo}
              canRedo={canRedo}
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
