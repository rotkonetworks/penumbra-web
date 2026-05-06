import { useCallback, useMemo, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { round } from '@penumbra-zone/types/round';
import { Button } from '@penumbra-zone/ui/Button';
import { Text } from '@penumbra-zone/ui/Text';
import { Slider as PenumbraSlider } from '@penumbra-zone/ui/Slider';
import { connectionStore } from '@/shared/model/connection';
import { ConnectButton } from '@/features/connect/connect-button';
import { OrderInput } from './order-input';
import { SelectGroup } from './select-group';
import { InfoRow } from './info-row';
import { InfoRowGasFee } from './info-row-gas-fee';
import { OrderFormStore } from './store/OrderFormStore';
import {
  MAX_POSITION_COUNT,
  MIN_POSITION_COUNT,
  UpperBoundOptions,
  LowerBoundOptions,
  FeeTierOptions,
} from './store/RangeOrderFormStore';
import { ConfirmInfoRow, ConfirmOrderModal, ConfirmWarning } from './confirm-order-modal';

export const RangeLiquidityOrderForm = observer(
  ({ parentStore }: { parentStore: OrderFormStore }) => {
    const { connected } = connectionStore;
    const { defaultDecimals, rangeForm: store } = parentStore;
    const [confirmOpen, setConfirmOpen] = useState(false);

    const baseSym = store.baseAsset?.symbol ?? '';
    const quoteSym = store.quoteAsset?.symbol ?? '';
    const decimals = store.quoteAsset?.exponent ?? defaultDecimals;
    const lo = store.lowerPrice;
    const hi = store.upperPrice;
    const mid = parentStore.marketPrice;
    const rangeCoversMid = mid != null && lo != null && hi != null && mid >= lo && mid <= hi;
    const positionCount = store.positionCount;

    const confirmRows = useMemo<ConfirmInfoRow[]>(() => {
      const rows: ConfirmInfoRow[] = [];
      if (mid != null) {
        rows.push({
          label: 'Mid price',
          value: `${round({ value: mid, decimals: 6 })} ${quoteSym}`,
        });
      }
      if (lo != null && hi != null) {
        rows.push({
          label: 'Range',
          value: `${round({ value: lo, decimals })} → ${round({ value: hi, decimals })} ${quoteSym}`,
        });
        if (mid != null && mid > 0) {
          const lowerPct = ((mid - lo) / mid) * 100;
          const upperPct = ((hi - mid) / mid) * 100;
          const symmetric = Math.abs(lowerPct - upperPct) < 0.05;
          rows.push({
            label: 'Range width',
            value: symmetric
              ? `±${Math.abs(lowerPct).toFixed(2)}%`
              : `-${lowerPct.toFixed(2)}% / +${upperPct.toFixed(2)}%`,
          });
        }
      }
      rows.push({
        label: 'Positions',
        value: positionCount !== undefined ? String(positionCount) : '—',
      });
      rows.push({
        label: 'Fee tier',
        value: `${store.feeTierPercentInput}%`,
      });
      if (store.baseAssetAmount) {
        rows.push({
          label: `${baseSym || 'Base'} amount`,
          value: store.baseAssetAmount,
        });
      }
      if (store.quoteAssetAmount) {
        rows.push({
          label: `${quoteSym || 'Quote'} amount`,
          value: store.quoteAssetAmount,
        });
      }
      rows.push({
        label: 'Gas fee',
        value: `${parentStore.gasFee.display} ${parentStore.gasFee.symbol}`,
      });
      return rows;
    }, [
      mid,
      lo,
      hi,
      decimals,
      baseSym,
      quoteSym,
      positionCount,
      store.feeTierPercentInput,
      store.baseAssetAmount,
      store.quoteAssetAmount,
      parentStore.gasFee.display,
      parentStore.gasFee.symbol,
    ]);

    const confirmWarnings = useMemo<ConfirmWarning[]>(() => {
      if (mid == null || lo == null || hi == null) return [];
      if (rangeCoversMid) return [];
      const aboveMid = mid > hi;
      return [
        {
          key: 'range-warning',
          message: aboveMid
            ? "Mid above range — fully ASK side, won't fill bids until price drops in"
            : "Mid below range — fully BID side, won't fill asks until price rises in",
        },
      ];
    }, [mid, lo, hi, rangeCoversMid]);

    const actionLabel = useMemo(() => {
      const count = positionCount ?? 'Several';
      if (lo == null || hi == null) {
        return `Open ${count} LP positions`;
      }
      return `Open ${count} LP positions between ${round({
        value: lo,
        decimals,
      })} and ${round({ value: hi, decimals })} ${quoteSym}`;
    }, [lo, hi, decimals, quoteSym, positionCount]);

    const openConfirm = useCallback(() => setConfirmOpen(true), []);
    const closeConfirm = useCallback(() => setConfirmOpen(false), []);
    const handleConfirm = useCallback(() => {
      setConfirmOpen(false);
      void parentStore.submit();
    }, [parentStore]);

    return (
      <div className='p-4'>
        <div className='mb-4'>
          <div className='mb-1'>
            <OrderInput
              round
              label='Liquidity Target'
              value={store.liquidityTargetInput}
              decimals={store.quoteAsset?.exponent ?? defaultDecimals}
              onChange={store.setLiquidityTargetInput}
              denominator={store.quoteAsset?.symbol}
            />
          </div>
          <div className='flex w-full flex-row flex-wrap items-start justify-between py-1'>
            <div className='leading-6'>
              <Text small color='text.secondary'>
                Available Balances
              </Text>
            </div>
            <div className='flex flex-col flex-wrap items-end'>
              <div>
                <Text small color='text.primary' whitespace='nowrap'>
                  {store.baseAsset?.formatBalance() ?? `-- ${store.baseAsset?.symbol}`}
                </Text>
              </div>
              <button
                type='button'
                onClick={() => {
                  const target = store.quoteAsset?.balance?.toString();
                  if (target) {
                    store.setLiquidityTargetInput(target);
                  }
                }}
              >
                <Text small color='text.primary' whitespace='nowrap'>
                  {store.quoteAsset?.formatBalance() ?? `-- ${store.quoteAsset?.symbol}`}
                </Text>
              </button>
            </div>
          </div>
        </div>
        <div className='mb-4'>
          <div className='mb-2'>
            <OrderInput
              round
              label='Upper Price Bound'
              value={store.upperPriceInput}
              decimals={store.quoteAsset?.exponent ?? defaultDecimals}
              onChange={price => store.setUpperPriceInput(price)}
              denominator={store.quoteAsset?.symbol}
            />
          </div>
          <SelectGroup
            options={Object.values(UpperBoundOptions)}
            value={store.upperPriceInputOption}
            onChange={option => store.setUpperPriceInputOption(option as UpperBoundOptions)}
          />
        </div>
        <div className='mb-4'>
          <div className='mb-2'>
            <OrderInput
              round
              label='Lower Price Bound'
              value={store.lowerPriceInput}
              decimals={store.quoteAsset?.exponent ?? defaultDecimals}
              onChange={price => store.setLowerPriceInput(price)}
              denominator={store.quoteAsset?.symbol}
            />
          </div>
          <SelectGroup
            options={Object.values(LowerBoundOptions)}
            value={store.lowerPriceInputOption}
            onChange={option => store.setLowerPriceInputOption(option as LowerBoundOptions)}
          />
        </div>
        <div className='mb-4'>
          <div className='mb-2'>
            <OrderInput
              label='Fee tier'
              value={store.feeTierPercentInput}
              onChange={amount => store.setFeeTierPercentInput(amount)}
              denominator='%'
            />
          </div>
          <SelectGroup
            options={Object.values(FeeTierOptions)}
            value={store.feeTierPercentInputOption}
            onChange={option => store.setFeeTierPercentInputOption(option as FeeTierOptions)}
          />
        </div>
        <div className='mb-4'>
          <OrderInput
            label='Number of positions'
            value={store.positionCountInput}
            onChange={store.setPositionCountInput}
          />
          <PenumbraSlider
            min={MIN_POSITION_COUNT}
            max={MAX_POSITION_COUNT}
            step={1}
            value={store.positionCountSlider}
            showValue={false}
            onChange={store.setPositionCountSlider}
            showTrackGaps={true}
            trackGapBackground='base.black'
            showFill={true}
          />
        </div>
        <div className='mb-4'>
          <InfoRow
            label='Number of positions'
            value={store.positionCount}
            toolTip='Each position will have an equal amount of liquidity allocated to it, as the price varies.'
          />
          <InfoRow
            label='Base asset amount'
            value={store.baseAssetAmount}
            toolTip={`The amount of ${store.baseAsset?.symbol} provided as liquidity.`}
          />
          <InfoRow
            label='Quote asset amount'
            value={store.quoteAssetAmount}
            toolTip={`The amount of ${store.quoteAsset?.symbol} provided as liquidity`}
          />
          <InfoRowGasFee
            gasFee={parentStore.gasFee.display}
            symbol={parentStore.gasFee.symbol}
            isLoading={parentStore.gasFeeLoading}
          />
        </div>
        <div className='mb-4'>
          {connected ? (
            <Button
              actionType='accent'
              disabled={!parentStore.canSubmit}
              onClick={openConfirm}
            >
              Open {store.positionCount ?? 'Several'} Positions
            </Button>
          ) : (
            <ConnectButton actionType='default' />
          )}
        </div>
        <ConfirmOrderModal
          isOpen={confirmOpen}
          actionLabel={actionLabel}
          rows={confirmRows}
          warnings={confirmWarnings}
          confirmDisabled={!parentStore.canSubmit}
          confirmLabel={`Open ${positionCount ?? 'Several'} Positions`}
          onConfirm={handleConfirm}
          onCancel={closeConfirm}
        />
        {parentStore.marketPrice && (
          <div className='flex justify-center p-1'>
            <Text small color='text.secondary'>
              1 {store.baseAsset?.symbol} ={' '}
              <Text small color='text.primary'>
                {store.quoteAsset?.formatDisplayAmount(parentStore.marketPrice)}
              </Text>
            </Text>
          </div>
        )}
      </div>
    );
  },
);
