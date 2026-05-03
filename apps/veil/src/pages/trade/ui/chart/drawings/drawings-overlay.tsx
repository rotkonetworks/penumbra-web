import { useEffect, useRef, useState } from 'react';
import { Text } from '@penumbra-zone/ui/Text';
import { theme } from '@penumbra-zone/ui/theme';
import type { Drawing } from './types';

interface DrawingsOverlayProps {
  drawings: Drawing[];
  yAtPrice: (price: number) => number | undefined;
  xAtTime: (time: number) => number | undefined;
  subscribeRedraw: (cb: () => void) => () => void;
  onDelete: (id: string) => void;
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
  subscribeRedraw,
  onDelete,
}: DrawingsOverlayProps) => {
  const [hLines, setHLines] = useState<PositionedHorizontalLine[]>([]);
  const [tLines, setTLines] = useState<PositionedTrendLine[]>([]);
  const [rects, setRects] = useState<PositionedRectangle[]>([]);
  const [texts, setTexts] = useState<PositionedText[]>([]);
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

  const openMenu = (id: string, label: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const svg = containerRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    setMenu({ x: e.clientX - rect.left, y: e.clientY - rect.top, id, label });
  };

  return (
    <>
      <svg
        ref={containerRef}
        aria-label='Chart drawings'
        className='pointer-events-none absolute inset-0 z-[6] h-full w-full'
        style={{ overflow: 'visible' }}
      >
        {hLines.map(line => (
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
            {/* Wider invisible hit area for easier right-clicking */}
            <line
              x1='0'
              x2='100%'
              y1={line.y}
              y2={line.y}
              stroke='transparent'
              strokeWidth='8'
              style={{ cursor: 'pointer' }}
              onContextMenu={openMenu(line.id, formatPrice(line.price))}
            >
              <title>Right-click to delete · {formatPrice(line.price)}</title>
            </line>
            <rect
              x='0'
              y={line.y - 7}
              width='52'
              height='14'
              fill={line.color}
              opacity='0.85'
              style={{ cursor: 'pointer' }}
              onContextMenu={openMenu(line.id, formatPrice(line.price))}
            />
            <text
              x='4'
              y={line.y + 4}
              fill={theme.color.base.black}
              fontSize='10'
              fontFamily='monospace'
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              {formatPrice(line.price)}
            </text>
          </g>
        ))}

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
              {/* Wider invisible hit area for easier right-clicking */}
              <line
                x1={line.x1}
                y1={line.y1}
                x2={line.x2}
                y2={line.y2}
                stroke='transparent'
                strokeWidth='10'
                style={{ cursor: 'pointer' }}
                onContextMenu={openMenu(line.id, slope)}
              >
                <title>Right-click to delete · {slope}</title>
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
                onContextMenu={openMenu(rect.id, label)}
              >
                <title>Right-click to delete · {label}</title>
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
                onContextMenu={openMenu(t.id, t.text)}
              >
                <title>Right-click to delete · {t.text}</title>
              </rect>
              <text
                x={t.x + padX}
                y={t.y + padY}
                fill={theme.color.base.black}
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
          className='absolute z-30 min-w-[180px] overflow-hidden rounded-sm border border-other-tonalStroke bg-base-black shadow-lg'
          style={{ left: menu.x, top: menu.y }}
        >
          <div className='border-b border-b-other-tonalStroke px-3 py-2'>
            <Text detail color='text.secondary'>
              drawing
            </Text>
            <div className='font-mono text-sm text-text-primary'>{menu.label}</div>
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
