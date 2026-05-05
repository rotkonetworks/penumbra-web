import { ValueViewComponent } from '@penumbra-zone/ui/ValueView';
import { pnum } from '@penumbra-zone/types/pnum';
import { Skeleton } from '@penumbra-zone/ui/Skeleton';
import { DisplayPosition } from '../model/types';

export const PositionsCurrentValue = ({
  order,
  marketPrice,
}: {
  order: DisplayPosition['orders'][number];
  /** Live mid lifted from the parent table (which is already pair-scoped).
   *  The previous form called useMarketPrice() per row — on a 50-row
   *  positions table that mounted 50 hook stacks and 50 useBook
   *  subscriptions every render, even though React Query deduped the
   *  network call. One hook in the parent now serves every row. */
  marketPrice: number | undefined;
}) => {
  const { baseAsset, quoteAsset } = order;

  if (!marketPrice) {
    return (
      <div className='h-4 w-12'>
        <Skeleton />
      </div>
    );
  }

  if (order.direction === 'Buy') {
    return (
      <ValueViewComponent
        valueView={pnum(quoteAsset.amount.toNumber(), quoteAsset.exponent).toValueView(
          quoteAsset.asset,
        )}
      />
    );
  }

  const computedValue = baseAsset.amount.toNumber() * marketPrice;
  if (!Number.isFinite(computedValue)) {
    return (
      <div className='h-4 w-12'>
        <Skeleton />
      </div>
    );
  }

  return (
    <ValueViewComponent
      valueView={pnum(computedValue, quoteAsset.exponent).toValueView(quoteAsset.asset)}
    />
  );
};
