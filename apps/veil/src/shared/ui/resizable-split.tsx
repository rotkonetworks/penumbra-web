'use client';

import { ReactNode, useEffect, useRef, useState } from 'react';
import cn from 'clsx';

interface ResizableSplitProps {
  /**
   * Anchor side: the resized child has fixed width (or height); the other
   * fills the remaining space. We anchor on `right` for column splits so
   * the form panel keeps its size as the chart area grows.
   */
  anchor?: 'right' | 'bottom';
  /** Children: [stretching-side, anchored-side]. */
  children: [ReactNode, ReactNode];
  /** Default size of the anchored side in px (used until localStorage loads). */
  defaultSize: number;
  /** Min/max for the anchored side in px. */
  min: number;
  max: number;
  /** localStorage key for persisting the chosen size. */
  storageKey: string;
  /** Outer container class — usually pass through wrapper styling here. */
  className?: string;
}

const readStored = (key: string, fallback: number, min: number, max: number): number => {
  if (typeof window === 'undefined') return fallback;
  const raw = window.localStorage.getItem(key);
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) && n >= min && n <= max ? n : fallback;
};

export const ResizableSplit = ({
  anchor = 'right',
  children,
  defaultSize,
  min,
  max,
  storageKey,
  className,
}: ResizableSplitProps) => {
  const [size, setSize] = useState<number>(defaultSize);
  const containerRef = useRef<HTMLDivElement>(null);
  const isHorizontal = anchor === 'right';

  useEffect(() => {
    setSize(readStored(storageKey, defaultSize, min, max));
  }, [storageKey, defaultSize, min, max]);

  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();

    const onMove = (ev: PointerEvent) => {
      const next = isHorizontal ? rect.right - ev.clientX : rect.bottom - ev.clientY;
      setSize(Math.min(max, Math.max(min, next)));
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      // Persist the latest size by reading from the React state via setter.
      setSize(current => {
        try {
          window.localStorage.setItem(storageKey, String(current));
        } catch {
          // storage may be disabled; ignore
        }
        return current;
      });
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        'flex min-h-0 min-w-0',
        isHorizontal ? 'flex-row' : 'flex-col',
        className,
      )}
    >
      <div className={cn('min-h-0 min-w-0', isHorizontal ? 'flex-1' : 'flex-1')}>
        {children[0]}
      </div>
      <div
        role='separator'
        aria-orientation={isHorizontal ? 'vertical' : 'horizontal'}
        onPointerDown={onPointerDown}
        className={cn(
          'group relative shrink-0 transition-colors hover:bg-other-solid-stroke/40',
          isHorizontal ? 'w-1 cursor-col-resize' : 'h-1 cursor-row-resize',
        )}
        title={isHorizontal ? 'Drag to resize columns' : 'Drag to resize rows'}
      />
      <div
        className='shrink-0 overflow-hidden'
        style={isHorizontal ? { width: size } : { height: size }}
      >
        {children[1]}
      </div>
    </div>
  );
};
