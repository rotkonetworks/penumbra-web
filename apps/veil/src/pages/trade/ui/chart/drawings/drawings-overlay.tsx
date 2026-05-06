import { useEffect, useRef, useState } from 'react';
import { Text } from '@penumbra-zone/ui/Text';
import { useMarketPrice } from '../../../model/useMarketPrice';
import type { Drawing } from './types';

interface DrawingsOverlayProps {
  drawings: Drawing[];
  yAtPrice: (price: number) => number | undefined;
  xAtTime: (time: number) => number | undefined;
  /** Reverse mappers for drag-to-move support. */
  priceAtY: (y: number) => number | undefined;
  timeAtX: (x: number) => number | undefined;
  subscribeRedraw: (cb: () => void) => () => void;
  onDelete: (id: string) => void;
  /** Patch a drawing in place (used while dragging an endpoint). */
  onUpdate: (id: string, patch: Partial<Drawing>) => void;
}

interface PositionedHorizontalLine {
  id: string;
  y: number;
  price: number;
  color: string;
}

interface PositionedTrendLine {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  price1: number;
  price2: number;
  color: string;
}

interface PositionedRectangle {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  price1: number;
  price2: number;
  color: string;
}

interface PositionedText {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
}

const formatPrice = (p: number): string => {
  if (p >= 1) return p.toFixed(4);
  if (p >= 0.01) return p.toFixed(5);
  if (p >= 0.0001) return p.toFixed(6);
  return p.toPrecision(4);
};

/**
 * SVG overlay rendering user drawings positioned via the candle series's
 * priceToCoordinate. Right-click a drawing to delete it (left-click is
 * reserved for selection / chart pan).
 */
export const DrawingsOverlay = ({
  drawings,
  yAtPrice,
  xAtTime,
  priceAtY,
  timeAtX,
  subscribeRedraw,
  onDelete,
  onUpdate,
}: DrawingsOverlayProps) => {
  // Reserved for the upcoming trend-line / rectangle endpoint drag —
  // accepted as a prop now so callers don't have to re-thread it later.
  void timeAtX;

  const [hLines, setHLines] = useState<PositionedHorizontalLine[]>([]);
  const [tLines, setTLines] = useState<PositionedTrendLine[]>([]);
  const [rects, setRects] = useState<PositionedRectangle[]>([]);
  const [texts, setTexts] = useState<PositionedText[]>([]);
  // Live chain mid — used to annotate each horizontal-line drawing with
  // its current % gap from mid. The trader marks a level once and the
  // label keeps re-stamping the live distance as mid drifts, no more
  // manual mental arithmetic to gauge whether a level is within reach.
  const { marketPrice } = useMarketPrice();
  const [menu, setMenu] = useState<{
    x: number;
    y: number;
    id: string;
    label: string;
  } | null>(null);
  const containerRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (drawings.length === 0) {
      setHLines([]);
      setTLines([]);
      setRects([]);
      setTexts([]);
      return;
    }

    const recompute = () => {
      const nextH: PositionedHorizontalLine[] = [];
      const nextT: PositionedTrendLine[] = [];
      const nextR: PositionedRectangle[] = [];
      const nextTx: PositionedText[] = [];
      for (const d of drawings) {
        if (d.kind === 'horizontal-line') {
          const y = yAtPrice(d.price);
          if (y === undefined) continue;
          nextH.push({ id: d.id, y, price: d.price, color: d.color });
        } else if (d.kind === 'trend-line') {
          const x1 = xAtTime(d.time1);
          const y1 = yAtPrice(d.price1);
          const x2 = xAtTime(d.time2);
          const y2 = yAtPrice(d.price2);
          if (x1 === undefined || y1 === undefined || x2 === undefined || y2 === undefined) {
            continue;
          }
          nextT.push({
            id: d.id,
            x1,
            y1,
            x2,
            y2,
            price1: d.price1,
            price2: d.price2,
            color: d.color,
          });
        } else if (d.kind === 'rectangle') {
          const x1 = xAtTime(d.time1);
          const y1 = yAtPrice(d.price1);
          const x2 = xAtTime(d.time2);
          const y2 = yAtPrice(d.price2);
          if (x1 === undefined || y1 === undefined || x2 === undefined || y2 === undefined) {
            continue;
          }
          nextR.push({
            id: d.id,
            x: Math.min(x1, x2),
            y: Math.min(y1, y2),
            width: Math.abs(x2 - x1),
            height: Math.abs(y2 - y1),
            price1: d.price1,
            price2: d.price2,
            color: d.color,
          });
        } else if (d.kind === 'text') {
          const x = xAtTime(d.time);
          const y = yAtPrice(d.price);
          if (x === undefined || y === undefined) continue;
          nextTx.push({ id: d.id, x, y, text: d.text, color: d.color });
        }
      }
      setHLines(nextH);
      setTLines(nextT);
      setRects(nextR);
      setTexts(nextTx);
    };

    return subscribeRedraw(recompute);
  }, [drawings, yAtPrice, xAtTime, subscribeRedraw]);

  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', onKey);
    };
  }, [menu]);

  if (drawings.length === 0) return null;

  // Both left-click and right-click open the menu. Left-click is the
  // discoverable affordance; right-click is the legacy one (kept so
  // existing muscle memory still works). preventDefault() suppresses
  // the browser's native context menu on right-click.
  const openMenu = (id: string, label: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const svg = containerRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    setMenu({ x: e.clientX - rect.left, y: e.clientY - rect.top, id, label });
  };

  // Drag-or-click handler factory for horizontal lines. Pointer-down
  // starts tracking. If pointermove travels >= DRAG_THRESHOLD pixels,
  // we enter drag mode and feed live `price` updates to onUpdate (rAF-
  // coalesced). On release, no movement = click → open manage menu;
  // movement = commit drag (already feeding updates, so just stop).
  // The line stays painted during drag because each onUpdate triggers a
  // re-render with the new y from yAtPrice(price).
  const DRAG_THRESHOLD = 4;
  const startHLineDrag = (id: string, label: string) => (e: React.PointerEvent) => {
    if (e.button !== 0) return; // primary click only; right-click → onContextMenu
    const svg = containerRef.current;
    if (!svg) return;
    const startX = e.clientX;
    const startY = e.clientY;
    let dragging = false;
    let pendingPrice: number | null = null;
    let rafId = 0;
    const flush = () => {
      rafId = 0;
      if (pendingPrice === null) return;
      const next = pendingPrice;
      pendingPrice = null;
      onUpdate(id, { price: next });
    };
    const onMove = (ev: PointerEvent) => {
      if (!dragging) {
        if (Math.hypot(ev.clientX - startX, ev.clientY - startY) < DRAG_THRESHOLD) return;
        dragging = true;
      }
      const rect = svg.getBoundingClientRect();
      const p = priceAtY(ev.clientY - rect.top);
      if (p === undefined || !Number.isFinite(p) || p <= 0) return;
      pendingPrice = p;
      if (rafId) return;
      rafId = requestAnimationFrame(flush);
    };
    const onUp = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      if (rafId) {
        cancelAnimationFrame(rafId);
        flush();
      }
      // No drag → open manage menu (Delete / colour) at the release
      // position. Drag → drag committed live; nothing to do.
      if (!dragging) {
        const rect = svg.getBoundingClientRect();
        setMenu({
          x: ev.clientX - rect.left,
          y: ev.clientY - rect.top,
          id,
          label,
        });
      }
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  return (
    <>
      <svg
        ref={containerRef}
        aria-label='Chart drawings'
        className='pointer-events-none absolute inset-0 z-[6] h-full w-full'
        style={{ overflow: 'visible' }}
      >
        {hLines.map(line => {
          // % distance of this drawn level from the live chain mid. Hide
          // when sub-bp (visual noise) or when mid hasn't loaded.
          const deltaPct =
            marketPrice && marketPrice > 0
              ? ((line.price - marketPrice) / marketPrice) * 100
              : null;
          const showDelta = deltaPct !== null && Math.abs(deltaPct) >= 0.05;
          const deltaText = showDelta
            ? `${deltaPct! > 0 ? '+' : ''}${deltaPct!.toFixed(2)}%`
            : null;
          return (
            <g key={line.id} className='pointer-events-auto'>
              <line
                x1='0'
                x2='100%'
                y1={line.y}
                y2={line.y}
                stroke={line.color}
                strokeWidth='1'
                strokeDasharray='4 3'
              />
              {/* Wider invisible hit area. Pointer-down enters drag-or-
                  click mode: <4px movement = click → open manage menu;
                  drag = move the line live. Right-click also opens
                  the menu directly. */}
              <line
                x1='0'
                x2='100%'
                y1={line.y}
                y2={line.y}
                stroke='transparent'
                strokeWidth='8'
                style={{ cursor: 'ns-resize' }}
                onPointerDown={startHLineDrag(line.id, formatPrice(line.price))}
                onContextMenu={openMenu(line.id, formatPrice(line.price))}
              >
                <title>
                  Drag to move · click for menu · {formatPrice(line.price)}
                  {deltaText ? ` (${deltaText} from mid)` : ''}
                </title>
              </line>
              <rect
                x='0'
                y={line.y - 7}
                width='52'
                height='14'
                fill={line.color}
                opacity='0.85'
                style={{ cursor: 'ns-resize' }}
                onPointerDown={startHLineDrag(line.id, formatPrice(line.price))}
                onContextMenu={openMenu(line.id, formatPrice(line.price))}
              />
              <text
                x='4'
                y={line.y + 4}
                fill='#0d0d0d'
                fontSize='10'
                fontFamily='monospace'
                style={{ pointerEvents: 'none', userSelect: 'none' }}
              >
                {formatPrice(line.price)}
              </text>
              {/* Live mid-delta annotation, rendered to the right of the
                  price label so the price chunk stays the same width. */}
              {deltaText && (
                <text
                  x='56'
                  y={line.y + 4}
                  fill={line.color}
                  fontSize='10'
                  fontFamily='monospace'
                  opacity='0.85'
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                  {deltaText}
                </text>
              )}
            </g>
          );
        })}

        {tLines.map(line => {
          const dx = line.x2 - line.x1;
          const dy = line.y2 - line.y1;
          const len = Math.hypot(dx, dy);
          const slope =
            len > 0
              ? (((line.price2 - line.price1) / line.price1) * 100).toFixed(2) + '%'
              : '';
          return (
            <g key={line.id} className='pointer-events-auto'>
              <line
                x1={line.x1}
                y1={line.y1}
                x2={line.x2}
                y2={line.y2}
                stroke={line.color}
                strokeWidth='1.5'
              />
              {/* Wider invisible hit area. Left or right click opens the
                  manage menu. */}
              <line
                x1={line.x1}
                y1={line.y1}
                x2={line.x2}
                y2={line.y2}
                stroke='transparent'
                strokeWidth='10'
                style={{ cursor: 'pointer' }}
                onClick={openMenu(line.id, slope)}
                onContextMenu={openMenu(line.id, slope)}
              >
                <title>Click to delete · {slope}</title>
              </line>
              <circle cx={line.x1} cy={line.y1} r={3} fill={line.color} />
              <circle cx={line.x2} cy={line.y2} r={3} fill={line.color} />
            </g>
          );
        })}

        {rects.map(rect => {
          const lo = Math.min(rect.price1, rect.price2);
          const hi = Math.max(rect.price1, rect.price2);
          const label = `${formatPrice(lo)} – ${formatPrice(hi)}`;
          return (
            <g key={rect.id} className='pointer-events-auto'>
              <rect
                x={rect.x}
                y={rect.y}
                width={rect.width}
                height={rect.height}
                fill={rect.color}
                fillOpacity={0.12}
                stroke={rect.color}
                strokeWidth='1'
                strokeDasharray='4 3'
                style={{ cursor: 'pointer' }}
                onClick={openMenu(rect.id, label)}
                onContextMenu={openMenu(rect.id, label)}
              >
                <title>Click to delete · {label}</title>
              </rect>
              {/* Anchor dots at each picked corner so user sees their clicks */}
              <circle cx={rect.x} cy={rect.y} r={2.5} fill={rect.color} pointerEvents='none' />
              <circle
                cx={rect.x + rect.width}
                cy={rect.y + rect.height}
                r={2.5}
                fill={rect.color}
                pointerEvents='none'
              />
            </g>
          );
        })}

        {texts.map(t => {
          const padX = 4;
          const padY = 3;
          // crude width estimate so the bg rect grows with content; SVG can't
          // measure text without a render pass, so we approximate at 6.5px/char.
          const approxWidth = Math.max(20, t.text.length * 6.5 + padX * 2);
          return (
            <g key={t.id} className='pointer-events-auto'>
              <rect
                x={t.x}
                y={t.y - 11}
                width={approxWidth}
                height={18}
                fill={t.color}
                opacity={0.85}
                rx={2}
                style={{ cursor: 'pointer' }}
                onClick={openMenu(t.id, t.text)}
                onContextMenu={openMenu(t.id, t.text)}
              >
                <title>Click to delete · {t.text}</title>
              </rect>
              <text
                x={t.x + padX}
                y={t.y + padY}
                fill='#0d0d0d'
                fontSize='11'
                fontFamily='system-ui, sans-serif'
                style={{ pointerEvents: 'none', userSelect: 'none' }}
              >
                {t.text}
              </text>
            </g>
          );
        })}
      </svg>

      {menu && (
        <div
          role='menu'
          // stop bubble so the document mousedown listener doesn't immediately close
          onMouseDown={e => e.stopPropagation()}
          className='absolute z-30 min-w-[200px] overflow-hidden rounded-sm border border-other-tonalStroke bg-base-black shadow-lg'
          style={{ left: menu.x, top: menu.y }}
        >
          <div className='border-b border-b-other-tonalStroke px-3 py-2'>
            <Text detail color='text.secondary'>
              drawing
            </Text>
            <div className='font-mono text-sm text-text-primary'>{menu.label}</div>
          </div>
          <div className='border-b border-b-other-tonalStroke px-3 py-2'>
            <Text detail color='text.secondary'>
              color
            </Text>
            <div className='mt-1 flex gap-1.5'>
              {DRAWING_COLOR_PRESETS.map(c => (
                <button
                  key={c}
                  type='button'
                  aria-label={`Set drawing colour ${c}`}
                  onClick={() => {
                    onUpdate(menu.id, { color: c });
                    setMenu(null);
                  }}
                  className='h-5 w-5 rounded-sm border border-other-tonalStroke transition-transform hover:scale-110'
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>
          <button
            type='button'
            role='menuitem'
            onClick={() => {
              onDelete(menu.id);
              setMenu(null);
            }}
            className='flex w-full items-center px-3 py-2 text-left text-destructive-light transition-colors hover:bg-action-hover-overlay'
          >
            <Text detail>Delete drawing</Text>
          </button>
        </div>
      )}
    </>
  );
};

// Color presets matching the rest of veil's chart palette: orange
// (default), green/red (buy/sell hint), neutral light, plus a cool
// blue for trend lines. Stored on each Drawing as a hex string.
const DRAWING_COLOR_PRESETS = [
  '#f49c43', // primary.light — default
  '#55d383', // success.light — green
  '#f17878', // destructive.light — red
  '#7baaf7', // cool blue — for support/resistance trend lines
  '#d4d4d4', // neutral light — subtle marker
];
