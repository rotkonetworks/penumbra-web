import { useCallback, useMemo, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { round } from '@penumbra-zone/types/round';
import { Button } from '@penumbra-zone/ui/Button';
import { Text } from '@penumbra-zone/ui/Text';
import { connectionStore } from '@/shared/model/connection';
import { ConnectButton } from '@/features/connect/connect-button';
import { OrderInput } from './order-input';
import { SegmentedControl } from './segmented-control';
import { InfoRowTradingFee } from './info-row-trading-fee';
import { InfoRowGasFee } from './info-row-gas-fee';
import { InfoRow } from './info-row';
import { SelectGroup } from './select-group';
import { OrderFormStore } from './store/OrderFormStore';
import { BuyLimitOrderOptions, SellLimitOrderOptions } from './store/LimitOrderFormStore';
import { ConfirmInfoRow, ConfirmOrderModal, ConfirmWarning } from './confirm-order-modal';

export const LimitOrderForm = observer(({ parentStore }: { parentStore: OrderFormStore }) => {
  const { connected } = connectionStore;
  const { defaultDecimals, limitForm: store } = parentStore;
  const [confirmOpen, setConfirmOpen] = useState(false);

  const isBuy = store.direction === 'buy';
  const baseSym = store.baseAsset?.symbol ?? '';
  const quoteSym = store.quoteAsset?.symbol ?? '';
  const limitPrice = parseFloat(store.priceInput);
  const mid = parentStore.marketPrice;
  const deltaPct =
    Number.isFinite(limitPrice) && limitPrice > 0 && mid && mid > 0
      ? ((limitPrice - mid) / mid) * 100
      : null;
  // Crosses-at-touch: buy at or above mid (or sell at or below) hits the
  // resting book and executes as a taker, paying the taker fee instead
  // of resting as a maker.
  const wouldCross =
    deltaPct != null && (isBuy ? deltaPct >= 0 : deltaPct <= 0);

  const confirmRows = useMemo<ConfirmInfoRow[]>(() => {
    const rows: ConfirmInfoRow[] = [];
    rows.push({
      label: 'Limit price',
      value: Number.isFinite(limitPrice) ? `${limitPrice} ${quoteSym}` : '—',
    });
    if (mid != null) {
      rows.push({
        label: 'Mid price',
        value: `${round({ value: mid, decimals: 6 })} ${quoteSym}`,
      });
    }
    if (deltaPct != null) {
      rows.push({
        label: 'Distance from mid',
        value: `${deltaPct > 0 ? '+' : ''}${deltaPct.toFixed(2)}%`,
        valueColor: wouldCross ? 'error' : undefined,
      });
    }
    rows.push({
      label: isBuy ? 'You pay' : 'You receive',
      value: `${store.quoteInput || '—'} ${quoteSym}`,
    });
    rows.push({
      label: isBuy ? 'You receive' : 'You sell',
      value: `${store.baseInput || '—'} ${baseSym}`,
    });
    rows.push({
      label: 'Gas fee',
      value: `${parentStore.gasFee.display} ${parentStore.gasFee.symbol}`,
    });
    return rows;
  }, [
    limitPrice,
    mid,
    deltaPct,
    wouldCross,
    isBuy,
    baseSym,
    quoteSym,
    store.baseInput,
    store.quoteInput,
    parentStore.gasFee.display,
    parentStore.gasFee.symbol,
  ]);

  const confirmWarnings = useMemo<ConfirmWarning[]>(() => {
    if (!wouldCross) return [];
    return [
      {
        key: 'cross-spread',
        message: `${
          isBuy ? 'Buy ≥ mid' : 'Sell ≤ mid'
        } — will execute as taker, not maker.`,
      },
    ];
  }, [wouldCross, isBuy]);

  const actionLabel = useMemo(() => {
    if (!Number.isFinite(limitPrice) || limitPrice <= 0 || !store.baseInput) {
      return `${isBuy ? 'Buy' : 'Sell'} ${baseSym} as a limit order`;
    }
    return `${isBuy ? 'Buy' : 'Sell'} ${store.baseInput} ${baseSym} at ${round({
      value: limitPrice,
      decimals: 6,
    })} ${quoteSym}`;
  }, [isBuy, baseSym, quoteSym, limitPrice, store.baseInput]);

  const openConfirm = useCallback(() => setConfirmOpen(true), []);
  const closeConfirm = useCallback(() => setConfirmOpen(false), []);
  const handleConfirm = useCallback(() => {
    setConfirmOpen(false);
    void parentStore.submit();
  }, [parentStore]);

  return (
    <div className='p-4'>
      <SegmentedControl direction={store.direction} setDirection={store.setDirection} />
      <div className='mb-4'>
        <div className='mb-2'>
          <OrderInput
            round
            label={`When ${store.baseAsset?.symbol} is`}
            value={store.priceInput}
            decimals={store.quoteAsset?.exponent ?? defaultDecimals}
            onChange={price => store.setPriceInput(price)}
            denominator={store.quoteAsset?.symbol}
          />
        </div>
        <SelectGroup
          options={Object.values(isBuy ? BuyLimitOrderOptions : SellLimitOrderOptions)}
          value={store.priceInputOption}
          onChange={option =>
            store.setPriceInputOption(option as BuyLimitOrderOptions | SellLimitOrderOptions)
          }
        />
      </div>
      <div className='mb-4'>
        <OrderInput
          round
          label={isBuy ? 'Buy' : 'Sell'}
          value={store.baseInput}
          decimals={store.baseAsset?.exponent ?? defaultDecimals}
          onChange={store.setBaseInput}
          denominator={store.baseAsset?.symbol}
        />
      </div>
      <div className='mb-4'>
        <OrderInput
          round
          label={isBuy ? 'Pay with' : 'Receive'}
          value={store.quoteInput}
          decimals={store.quoteAsset?.exponent ?? defaultDecimals}
          onChange={store.setQuoteInput}
          denominator={store.quoteAsset?.symbol}
        />
      </div>
      <div className='mb-4'>
        <InfoRow label='Available balance' value={store.balance} />
        <InfoRowTradingFee />
        <InfoRowGasFee
          gasFee={parentStore.gasFee.display}
          symbol={parentStore.gasFee.symbol}
          isLoading={parentStore.gasFeeLoading}
        />
        <InfoRow
          label='Receive'
          value={
            isBuy
              ? `${store.baseInput} ${store.baseAsset?.symbol ?? '--'}`
              : `${store.quoteInput} ${store.quoteAsset?.symbol ?? '--'}`
          }
        />
      </div>
      <div className='mb-4'>
        {connected ? (
          <Button
            actionType='accent'
            disabled={!parentStore.canSubmit}
            onClick={openConfirm}
          >
            {isBuy ? 'Buy' : 'Sell'} {store.baseAsset?.symbol}
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
        confirmLabel={`${isBuy ? 'Buy' : 'Sell'} ${baseSym}`}
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
});
