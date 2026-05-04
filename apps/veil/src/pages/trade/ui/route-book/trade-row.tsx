import { Fragment, memo } from 'react';
import cn from 'clsx';
import { ChevronRight } from 'lucide-react';
import { getSymbolFromValueView } from '@penumbra-zone/getters/value-view';
import { Text } from '@penumbra-zone/ui/Text';
import { Trace } from '@/shared/api/server/book/types.ts';
import { pluralize } from '@/shared/utils/pluralize';
import { pnum } from '@penumbra-zone/types/pnum';

const SELL_BG_COLOR = 'rgba(175, 38, 38, 0.24)';

const TradeRowImpl = ({
  trace,
  isSell,
  relativeSize,
  onClick,
}: {
  trace: Trace;
  isSell: boolean;
  relativeSize: number;
  onClick?: (price: string) => void;
}) => {
  const bgColor = isSell ? SELL_BG_COLOR : 'rgba(28, 121, 63, 0.24)';
  const tokens = trace.hops.map(valueView => getSymbolFromValueView(valueView));
  const interactive = !!onClick;

  return (
    <div
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={onClick ? () => onClick(trace.price) : undefined}
      onKeyDown={
        onClick
          ? e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick(trace.price);
              }
            }
          : undefined
      }
      title={interactive ? `Click to ${isSell ? 'buy' : 'sell'} at this price` : undefined}
      style={{
        backgroundImage: `linear-gradient(to right, ${bgColor} ${relativeSize}%, transparent ${relativeSize}%)`,
      }}
      className={cn(
        'relative col-span-4 grid h-full grid-cols-subgrid items-center border-b border-other-tonal-fill15 px-4',
        'after:absolute after:right-0 after:left-0 after:hidden after:h-full after:bg-other-tonal-fill5 after:content-[""]',
        'group hover:after:block [&:hover>span:not(:last-child)]:invisible',
        'text-xs tabular-nums', // makes all numbers monospaced
        interactive && 'cursor-pointer',
      )}
    >
      <Text detailTechnical color={isSell ? 'destructive.light' : 'success.light'}>
        {pnum(trace.price).toFormattedString({
          commas: false,
          decimals: 7,
        })}
      </Text>
      <Text detailTechnical align='right' color='text.primary'>
        {pnum(trace.amount).toFormattedString({
          commas: false,
          decimals: 6,
        })}
      </Text>
      <Text detailTechnical align='right' color='text.primary'>
        {pnum(trace.total).toFormattedString({
          commas: false,
          decimals: 6,
        })}
      </Text>
      <Text
        tableItemSmall
        align='right'
        color={trace.hops.length <= 2 ? 'text.primary' : 'text.special'}
      >
        {trace.hops.length === 2 ? 'Direct' : pluralize(trace.hops.length - 2, 'Hop', 'Hops')}
      </Text>

      {/* Route display that shows on hover */}
      <div
        className='absolute right-0 left-0 z-30 hidden justify-center px-4 select-none group-hover:flex'
        style={{ visibility: 'visible' }}
      >
        <div className='flex items-center gap-1 py-2 text-xs'>
          {tokens.map((token, index) => (
            <Fragment key={index}>
              {index > 0 && <ChevronRight className='h-3 w-3 text-neutral-light' />}
              <Text tableItemSmall color='text.primary'>
                {token}
              </Text>
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * useBook re-fetches every block (~5s), and accumulate() in book.tsx
 * allocates a fresh `trace` object per row in cumulative mode. Without
 * memo, every row would re-render on every poll even when its visible
 * fields (price/amount/total/hops) didn't change. Custom equality
 * compares the primitive fields directly so allocation churn doesn't
 * bust the memo.
 */
export const TradeRow = memo(TradeRowImpl, (prev, next) => {
  if (
    prev.isSell !== next.isSell ||
    prev.relativeSize !== next.relativeSize ||
    prev.onClick !== next.onClick
  ) {
    return false;
  }
  const a = prev.trace;
  const b = next.trace;
  if (a.price !== b.price || a.amount !== b.amount || a.total !== b.total) {
    return false;
  }
  if (a.hops.length !== b.hops.length) return false;
  // Reference equality on hops is fine — the upstream serializer
  // re-uses ValueView instances when the hop structure is stable.
  for (let i = 0; i < a.hops.length; i++) {
    if (a.hops[i] !== b.hops[i]) return false;
  }
  return true;
});
