import { useCallback, useMemo, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { Button } from '@penumbra-zone/ui/Button';
import { Text } from '@penumbra-zone/ui/Text';
import { Slider as PenumbraSlider } from '@penumbra-zone/ui/Slider';
import { round } from '@penumbra-zone/types/round';
import { connectionStore } from '@/shared/model/connection';
import { ConnectButton } from '@/features/connect/connect-button';
import { OrderInput } from './order-input';
import { SegmentedControl } from './segmented-control';
import { InfoRowGasFee } from './info-row-gas-fee';
import { InfoRowTradingFee } from './info-row-trading-fee';
import { OrderFormStore } from './store/OrderFormStore';
import { InfoRow } from './info-row';
import { ConfirmInfoRow, ConfirmOrderModal } from './confirm-order-modal';

interface SliderProps {
  inputValue: string;
  balance?: number;
  balanceDisplay?: string;
  setBalanceFraction: (fraction: number) => void;
}
const Slider = observer(
  ({ inputValue, balance, balanceDisplay, setBalanceFraction }: SliderProps) => {
    const value =
      inputValue && balance ? Math.round((Number(inputValue) / Number(balance)) * 10) : 0;

    return (
      <div className='mb-4'>
        <div className='mb-1'>
          <PenumbraSlider
            min={0}
            max={10}
            step={1}
            value={value}
            showValue={false}
            disabled={!balance}
            onChange={x => setBalanceFraction(x / 10)}
            showTrackGaps={true}
            trackGapBackground='base.black'
            showFill={true}
          />
        </div>
        <div className='flex flex-row items-center justify-between py-1'>
          <Text small color='text.secondary'>
            Available Balance
          </Text>
          <button type='button' onClick={() => setBalanceFraction(1.0)}>
            <Text small color='text.primary'>
              {balanceDisplay ?? '--'}
            </Text>
          </button>
        </div>
      </div>
    );
  },
);

export const MarketOrderForm = observer(({ parentStore }: { parentStore: OrderFormStore }) => {
  const { connected } = connectionStore;
  const { defaultDecimals, marketForm: store } = parentStore;
  const [confirmOpen, setConfirmOpen] = useState(false);

  const isBuy = store.direction === 'buy';
  const baseSym = store.baseAsset?.symbol ?? '';
  const quoteSym = store.quoteAsset?.symbol ?? '';
  const baseAmt = store.baseInputAmount;
  const quoteAmt = store.quoteInputAmount;
  const mid = parentStore.marketPrice;

  const confirmRows = useMemo<ConfirmInfoRow[]>(() => {
    const rows: ConfirmInfoRow[] = [];
    if (baseAmt && quoteAmt && baseAmt > 0 && quoteAmt > 0) {
      const fillPrice = quoteAmt / baseAmt;
      const decimals =
        fillPrice >= 1 ? 4 : fillPrice >= 0.01 ? 5 : fillPrice >= 0.0001 ? 6 : 8;
      rows.push({
        label: 'Avg fill price',
        value: `${fillPrice.toFixed(decimals)} ${quoteSym}`,
      });
      rows.push({
        label: isBuy ? 'You pay' : 'You receive',
        value: `${round({ value: quoteAmt, decimals: 6 })} ${quoteSym}`,
      });
      rows.push({
        label: isBuy ? 'You receive' : 'You sell',
        value: `${round({ value: baseAmt, decimals: 6 })} ${baseSym}`,
      });
    }
    if (mid != null) {
      rows.push({
        label: 'Mid price',
        value: `${round({ value: mid, decimals: 6 })} ${quoteSym}`,
      });
    }
    if (store.priceImpact) {
      rows.push({ label: 'Price impact', value: store.priceImpact });
    }
    if (store.unfilled) {
      rows.push({ label: 'Unfilled amount', value: store.unfilled, valueColor: 'error' });
    }
    rows.push({
      label: 'Gas fee',
      value: `${parentStore.gasFee.display} ${parentStore.gasFee.symbol}`,
    });
    return rows;
  }, [
    baseAmt,
    quoteAmt,
    baseSym,
    quoteSym,
    isBuy,
    mid,
    store.priceImpact,
    store.unfilled,
    parentStore.gasFee.display,
    parentStore.gasFee.symbol,
  ]);

  const actionLabel = useMemo(() => {
    if (!baseAmt || baseAmt <= 0) {
      return `${isBuy ? 'Buy' : 'Sell'} ${baseSym} at market`;
    }
    const baseStr = round({ value: baseAmt, decimals: 6 });
    const quoteStr = quoteAmt ? round({ value: quoteAmt, decimals: 6 }) : null;
    return isBuy
      ? `Buy market ${baseStr} ${baseSym}${quoteStr ? ` ≈ ${quoteStr} ${quoteSym}` : ''}`
      : `Sell market ${baseStr} ${baseSym}${quoteStr ? ` ≈ ${quoteStr} ${quoteSym}` : ''}`;
  }, [baseAmt, quoteAmt, baseSym, quoteSym, isBuy]);

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
        <OrderInput
          round
          value={store.baseInput}
          decimals={store.baseAsset?.exponent ?? defaultDecimals}
          label={isBuy ? 'Buy' : 'Sell'}
          onChange={store.setBaseInput}
          isEstimating={store.baseEstimating}
          isApproximately={isBuy && store.baseInputAmount !== 0}
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
          isEstimating={store.quoteEstimating}
          isApproximately={!isBuy && store.quoteInputAmount !== 0}
          denominator={store.quoteAsset?.symbol}
        />
      </div>
      <Slider
        inputValue={isBuy ? store.quoteInput : store.baseInput}
        balance={isBuy ? store.quoteBalance : store.baseBalance}
        balanceDisplay={store.balance}
        setBalanceFraction={x => store.setBalanceFraction(x)}
      />
      <div className='mb-4'>
        <InfoRowTradingFee />
        <InfoRowGasFee
          gasFee={parentStore.gasFee.display}
          symbol={parentStore.gasFee.symbol}
          isLoading={parentStore.gasFeeLoading}
        />
        {store.priceImpact && (
          <InfoRow
            label='Price impact'
            value={store.priceImpact}
            toolTip='This percentage represents the effect of your trade on the token’s price.'
          />
        )}
        {store.unfilled && (
          <InfoRow
            label='Unfilled amount'
            value={store.unfilled}
            toolTip='The portion of your trade that cannot be completed due to insufficient liquidity.'
          />
        )}
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
