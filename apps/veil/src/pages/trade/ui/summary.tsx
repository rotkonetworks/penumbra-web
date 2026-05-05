import { ReactNode } from 'react';
import cn from 'clsx';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import { Text } from '@penumbra-zone/ui/Text';
import { Tooltip } from '@penumbra-zone/ui/Tooltip';
import { Skeleton } from '@/shared/ui/skeleton';
import { useSummary } from '../api/use-summary';
import { useMarketPrice } from '../model/useMarketPrice';
import { useTickDirection } from '../model/use-tick-direction';
import { ValueViewComponent } from '@penumbra-zone/ui/ValueView';
import { round } from '@penumbra-zone/types/round';
import { Density } from '@penumbra-zone/ui/Density';
import { BlockchainError } from '@/shared/ui/blockchain-error';
import { useGetMetadata } from '@/shared/api/assets';
import { convertPriceToDisplay } from '@/shared/math/price';
import { toValueView } from '@/shared/utils/value-view';

const SummaryCard = ({
  title,
  loading,
  children,
}: {
  title: string;
  loading?: boolean;
  children: ReactNode;
}) => {
  const [parent] = useAutoAnimate();

  return (
    <div ref={parent} className='flex flex-col gap-[2px]'>
      {loading ? (
        <>
          <div className='h-4 w-10'>
            <Skeleton />
          </div>
          <div className='h-4 w-18'>
            <Skeleton />
          </div>
        </>
      ) : (
        <>
          <Text detail color='text.secondary' whitespace='nowrap'>
            {title}
          </Text>
          {children}
        </>
      )}
    </div>
  );
};

export const Summary = () => {
  const { data, isPending: isLoading, error } = useSummary('1d');
  const getMetadata = useGetMetadata();
  const { marketPrice } = useMarketPrice();
  const midDirection = useTickDirection(marketPrice);

  if (error) {
    return (
      <SummaryCard title=''>
        <BlockchainError />
      </SummaryCard>
    );
  }

  return (
    <div className='flex flex-wrap items-center gap-x-4 gap-y-2 text-text-primary'>
      {/* Live midprice off the on-chain liquidity-position route book —
          what the DEX would actually clear a marginal swap at right now,
          regardless of when the last trade landed. Distinct from 'Last
          price' which can be hours stale on quiet pairs. */}
      <SummaryCard title='Mid price' loading={isLoading && marketPrice == null}>
        <Tooltip message='Average of the best bid and best ask on the on-chain route book — the price the DEX would clear a marginal swap at right now.'>
          <div className='flex items-center gap-1'>
            <Text
              detail
              color={
                midDirection === 'up'
                  ? 'success.light'
                  : midDirection === 'down'
                    ? 'destructive.light'
                    : 'text.primary'
              }
            >
              {midDirection === 'up' ? '▲ ' : midDirection === 'down' ? '▼ ' : ''}
              {marketPrice != null ? round({ value: marketPrice, decimals: 6 }) : '-'}
            </Text>
          </div>
        </Tooltip>
      </SummaryCard>
      <SummaryCard title='Last price' loading={isLoading}>
        <Tooltip message='Most recent fill on this pair. Lags the mid price on quiet pairs.'>
          <Text detail color='text.primary'>
            {data?.price ? round({ value: data.price, decimals: 6 }) : '-'}
          </Text>
        </Tooltip>
      </SummaryCard>
      <SummaryCard title='24h Change' loading={isLoading}>
        {data && (
          <div className={cn('flex items-center gap-1', getColor(data.priceDelta, false))}>
            <Text detail>{round({ value: data.priceDelta, decimals: 6 })}</Text>
            <span
              className={cn(
                'flex h-4 rounded-full px-1 text-success-dark',
                getColor(data.priceChangePercent, true),
              )}
            >
              <Text detail>
                {getTextSign(data.priceChangePercent)}
                {data.priceChangePercent.toFixed(2)}%
              </Text>
            </span>
          </div>
        )}
      </SummaryCard>
      <SummaryCard title='24h High' loading={isLoading}>
        <Text detail color='text.primary'>
          {data
            ? round({ value: convertPriceToDisplay(data.high, data.start, data.end), decimals: 6 })
            : '-'}
        </Text>
      </SummaryCard>
      <SummaryCard title='24h Low' loading={isLoading}>
        <Text detail color='text.primary'>
          {data
            ? round({ value: convertPriceToDisplay(data.low, data.start, data.end), decimals: 6 })
            : '-'}
        </Text>
      </SummaryCard>
      <SummaryCard title='24h Volume' loading={isLoading}>
        {data ? (
          <Density compact>
            <ValueViewComponent
              valueView={toValueView({ value: data.volume, getMetadata })}
              context='table'
              abbreviate
            />
          </Density>
        ) : (
          <Text detail color='text.primary'>
            -
          </Text>
        )}
      </SummaryCard>
    </div>
  );
};

const getTextSign = (x: number) => {
  if (x > 0.0) {
    return '+';
  }
  if (x < 0.0) {
    return '-';
  }
  return '';
};

const getColor = (x: number, isBg = false): string => {
  if (x > 0.0) {
    return isBg ? 'bg-success-light' : 'text-success-light';
  }
  if (x < 0.0) {
    return isBg ? 'bg-destructive-light' : 'text-destructive-light';
  }
  return isBg ? 'bg-neutral-light' : 'text-neutral-light';
};
