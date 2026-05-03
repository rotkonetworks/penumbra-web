import { useEffect, useState } from 'react';

interface HoverInfo {
  time: number;
  candle: { open: number; high: number; low: number; close: number };
  volume: number | undefined;
  point: { x: number; y: number };
}

interface HoverTooltipProps {
  subscribeHover: (cb: (info: HoverInfo | null) => void) => () => void;
  quoteSymbol: string;
}

const formatPrice = (p: number): string => {
  if (!Number.isFinite(p)) return '-';
  if (p >= 1) return p.toFixed(4);
  if (p >= 0.01) return p.toFixed(5);
  if (p >= 0.0001) return p.toFixed(6);
  return p.toPrecision(4);
};

const formatVolume = (v: number): string => {
  if (!Number.isFinite(v)) return '-';
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(2)}K`;
  return v.toFixed(4);
};

const formatTime = (s: number): string => {
  const d = new Date(s * 1000);
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const HoverTooltip = ({ subscribeHover, quoteSymbol }: HoverTooltipProps) => {
  const [info, setInfo] = useState<HoverInfo | null>(null);

  useEffect(() => {
    return subscribeHover(setInfo);
  }, [subscribeHover]);

  if (!info) return null;

  const isUp = info.candle.close >= info.candle.open;
  const directionColor = isUp ? 'text-success-light' : 'text-destructive-light';
  // Approximation: candle direction = bias proxy. Real buy/sell split needs
  // per-trade data which the candle endpoint doesn't carry.
  const directionLabel = isUp ? 'Buy-bias' : 'Sell-bias';

  return (
    <div
      className='pointer-events-none absolute top-12 left-3 z-30 min-w-[200px] rounded-sm border border-other-tonal-stroke bg-base-black/85 p-2.5 text-xs shadow-md backdrop-blur'
    >
      <div className='mb-1.5 text-text-secondary'>{formatTime(info.time)}</div>
      <div className='grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 tabular-nums'>
        <span className='text-text-secondary'>Open</span>
        <span className='text-text-primary'>{formatPrice(info.candle.open)}</span>
        <span className='text-text-secondary'>High</span>
        <span className='text-text-primary'>{formatPrice(info.candle.high)}</span>
        <span className='text-text-secondary'>Low</span>
        <span className='text-text-primary'>{formatPrice(info.candle.low)}</span>
        <span className='text-text-secondary'>Close</span>
        <span className={directionColor}>{formatPrice(info.candle.close)}</span>
        {info.volume !== undefined && (
          <>
            <span className='text-text-secondary'>Volume</span>
            <span className='text-text-primary'>
              {formatVolume(info.volume)} {quoteSymbol}
            </span>
            <span className='text-text-secondary'>Bias</span>
            <span className={directionColor}>{directionLabel}</span>
          </>
        )}
      </div>
    </div>
  );
};
