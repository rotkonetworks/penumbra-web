import { useCallback, useEffect, useMemo, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { Loader2 } from 'lucide-react';
import { Text } from '@penumbra-zone/ui/Text';
import { BlockchainError } from '@/shared/ui/blockchain-error';
import { useBook } from '../../api/book';
import { usePathSymbols } from '../../model/use-path';
import { tradeFormStore } from '../order-form/store/OrderFormStore';
import { buildDepthData } from './depth-data';
import { formatDepthPrice, useDepthChart, type DepthHover } from './use-depth-chart';

const formatVolume = (v: number): string => {
  if (!Number.isFinite(v)) return '-';
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(2)}K`;
  if (v >= 1) return v.toFixed(4);
  return v.toPrecision(4);
};

// Click on the bid side → user wants to SELL at that bid (mirrors route-book).
// Click on the ask side → user wants to BUY at that ask.
const prefillFromDepthClick = (price: string, side: 'bid' | 'ask') => {
  tradeFormStore.setWhichForm('Limit');
  tradeFormStore.limitForm.setDirection(side === 'bid' ? 'sell' : 'buy');
  tradeFormStore.limitForm.setPriceInput(price);
};

export const RouteDepth = observer(() => {
  const { data, isLoading, error } = useBook();
  const { baseSymbol, quoteSymbol } = usePathSymbols();

  const depth = useMemo(() => {
    if (!data?.multiHops) return undefined;
    return buildDepthData(data.multiHops.buy, data.multiHops.sell);
  }, [data]);

  const [hover, setHover] = useState<DepthHover | null>(null);

  const handleClick = useCallback((price: number, side: 'bid' | 'ask') => {
    prefillFromDepthClick(formatDepthPrice(price), side);
  }, []);

  const { containerRef, setData } = useDepthChart(setHover, handleClick);

  useEffect(() => {
    setData(depth);
  }, [depth, setData]);

  if (error) {
    return (
      <div className='flex h-full w-full items-center justify-center p-4'>
        <BlockchainError direction='column' />
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className='flex h-full w-full items-center justify-center'>
        <Loader2 className='size-6 animate-spin text-text-secondary' />
      </div>
    );
  }

  if (!depth) {
    return (
      <div className='flex h-full w-full items-center justify-center p-4'>
        <Text small color='text.secondary'>
          Not enough liquidity to build a depth chart
        </Text>
      </div>
    );
  }

  return (
    <div className='relative flex h-full min-h-0 w-full flex-col'>
      <div className='flex items-center justify-between gap-2 border-b border-b-other-tonal-stroke px-4 py-2 text-xs text-text-secondary'>
        <span>
          Mid:{' '}
          <span className='text-text-primary'>{formatDepthPrice(depth.mid)}</span>{' '}
          {quoteSymbol}/{baseSymbol}
        </span>
        <span className='hidden sm:inline'>Click chart to set limit price</span>
      </div>

      <div className='relative flex-1'>
        <div className='absolute inset-0' ref={containerRef} />
        {hover && <DepthTooltip hover={hover} quoteSymbol={quoteSymbol} mid={depth.mid} />}
      </div>
    </div>
  );
});

const DepthTooltip = ({
  hover,
  quoteSymbol,
  mid,
}: {
  hover: DepthHover;
  quoteSymbol: string;
  mid: number;
}) => {
  const isBid = hover.side === 'bid';
  const value = isBid ? hover.bidValue : hover.askValue;
  // Position the tooltip so it stays inside the chart bounds.
  const offsetX = hover.x > 200 ? -180 : 12;
  const style = {
    left: `${hover.x + offsetX}px`,
    top: `${Math.max(8, hover.y - 56)}px`,
  };
  const pctFromMid = mid > 0 ? ((hover.price - mid) / mid) * 100 : 0;
  return (
    <div
      className='pointer-events-none absolute z-10 rounded-sm border border-other-tonal-stroke bg-other-tonal-fill5 px-3 py-2 text-xs shadow-md backdrop-blur'
      style={style}
    >
      <div className={isBid ? 'text-success-light' : 'text-destructive-light'}>
        {isBid ? 'Bid' : 'Ask'} side
      </div>
      <div className='mt-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 tabular-nums'>
        <span className='text-text-secondary'>Price</span>
        <span className='text-text-primary'>{formatDepthPrice(hover.price)}</span>
        <span className='text-text-secondary'>Depth</span>
        <span className='text-text-primary'>
          {value !== undefined ? `${formatVolume(value)} ${quoteSymbol}` : '—'}
        </span>
        <span className='text-text-secondary'>From mid</span>
        <span className='text-text-primary'>
          {pctFromMid >= 0 ? '+' : ''}
          {pctFromMid.toFixed(2)}%
        </span>
      </div>
    </div>
  );
};
