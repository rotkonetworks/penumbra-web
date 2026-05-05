import { useEffect, useState } from 'react';

// theme.ts is a typing stub — most fields resolve to ''.
// Use the actual hex values from theme.css so the line and label render.
const LINE_COLOR = '#f49c43';
const LABEL_TEXT = '#0d0d0d';

interface MidPriceOverlayProps {
  /** Mid-price from the order book; undefined while the book is loading. */
  marketPrice: number | undefined;
  yAtPrice: (price: number) => number | undefined;
  subscribeRedraw: (cb: () => void) => () => void;
  quoteSymbol: string;
}

const formatPrice = (p: number): string => {
  if (p >= 1) return p.toFixed(4);
  if (p >= 0.01) return p.toFixed(5);
  if (p >= 0.0001) return p.toFixed(6);
  return p.toPrecision(4);
};

/**
 * Renders the live mid-price as a thin dotted horizontal line over the candle
 * canvas, with a small label on the right edge. Implemented as a DOM overlay
 * (not a lightweight-charts price line) so the render path can't take down the
 * chart if the API changes or the line ref desyncs across rerenders.
 */
export const MidPriceOverlay = ({
  marketPrice,
  yAtPrice,
  subscribeRedraw,
  quoteSymbol,
}: MidPriceOverlayProps) => {
  const [y, setY] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (marketPrice === undefined || !Number.isFinite(marketPrice) || marketPrice <= 0) {
      setY(undefined);
      return;
    }
    const recompute = () => setY(yAtPrice(marketPrice));
    return subscribeRedraw(recompute);
  }, [marketPrice, yAtPrice, subscribeRedraw]);

  if (y === undefined || marketPrice === undefined) return null;

  return (
    <div
      aria-label='Mid price'
      className='pointer-events-none absolute left-0 right-0 z-[6]'
      style={{ top: y - 1, height: 2 }}
    >
      <div
        className='absolute left-0'
        style={{
          right: 56,
          top: 0,
          height: 1,
          borderTop: `1px dotted ${LINE_COLOR}`,
          opacity: 0.85,
        }}
      />
      <div
        className='absolute -translate-y-1/2 rounded-sm px-1 py-px text-[10px] leading-tight'
        style={{
          right: 0,
          top: 1,
          background: LINE_COLOR,
          color: LABEL_TEXT,
        }}
      >
        {formatPrice(marketPrice)} {quoteSymbol}
      </div>
    </div>
  );
};
