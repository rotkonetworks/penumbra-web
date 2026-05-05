import { observer } from 'mobx-react-lite';
import { Button } from '@penumbra-zone/ui/Button';
import { Text } from '@penumbra-zone/ui/Text';
import { Tooltip } from '@penumbra-zone/ui/Tooltip';
import { Slider as PenumbraSlider } from '@penumbra-zone/ui/Slider';
import { round } from '@penumbra-zone/types/round';
import { connectionStore } from '@/shared/model/connection';
import { ConnectButton } from '@/features/connect/connect-button';
import { useMarketPrice } from '../../model/useMarketPrice';
import { OrderInput } from './order-input';
import { SegmentedControl } from './segmented-control';
import { InfoRowGasFee } from './info-row-gas-fee';
import { InfoRowTradingFee } from './info-row-trading-fee';
import { OrderFormStore } from './store/OrderFormStore';
import { InfoRow } from './info-row';

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
  // For a market order the trade clears at the touch on the relevant side
  // (buy → ask, sell → bid), not at the mid. Showing both the touch and
  // the chain mid lets the trader see, before they enter any size, exactly
  // how much spread they're paying — matches the way Hyperliquid /
  // Drift / Bybit pre-fill the price preview.
  const { bestBid, bestAsk, marketPrice } = useMarketPrice();

  const isBuy = store.direction === 'buy';
  const touchPrice = isBuy ? bestAsk : bestBid;
  const touchLabel = isBuy ? 'Ask' : 'Bid';
  const spreadPct =
    touchPrice != null && marketPrice != null && marketPrice > 0
      ? ((touchPrice - marketPrice) / marketPrice) * 100
      : null;

  return (
    <div className='p-4'>
      <SegmentedControl direction={store.direction} setDirection={store.setDirection} />
      {/* Pre-fill reference: the touch price the order will actually clear
          at, with how far that is from the chain's calculated mid. Reads
          green when buying off the ask is *cheaper* than mid (rare; book
          flipped), red when crossing the spread costs more than usual. */}
      {touchPrice != null && (
        <Tooltip
          message={`The current ${touchLabel.toLowerCase()} on the on-chain route book — where a ${isBuy ? 'buy' : 'sell'} market order's first lot would clear. The percentage shows how far that is from the calculated chain mid.`}
        >
          <div className='-mt-2 mb-3 flex items-center justify-end gap-1 text-xs tabular-nums'>
            <Text detail color='text.secondary'>
              Clears at {touchLabel}:
            </Text>
            <Text detail color='text.primary'>
              {round({ value: touchPrice, decimals: 6 })}
            </Text>
            {spreadPct != null && (
              <Text
                detail
                color={Math.abs(spreadPct) > 0.5 ? 'destructive.light' : 'text.secondary'}
              >
                ({spreadPct > 0 ? '+' : ''}
                {spreadPct.toFixed(2)}%)
              </Text>
            )}
          </div>
        </Tooltip>
      )}
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
        {/* Effective fill price = quote spent / base received. The Market
            form derives one side from the other via estimateQuote /
            estimateBase, so once both inputs settle we already know what
            'unit price' the trader would actually pay. Surface it
            explicitly — trader currently has to do the division
            themselves to compare against the chart's mid. */}
        {(() => {
          const base = store.baseInputAmount;
          const quote = store.quoteInputAmount;
          if (!base || !quote || base <= 0 || quote <= 0) return null;
          const fillPrice = quote / base;
          const decimals =
            fillPrice >= 1 ? 4 : fillPrice >= 0.01 ? 5 : fillPrice >= 0.0001 ? 6 : 8;
          return (
            <InfoRow
              label='Avg fill price'
              value={`${fillPrice.toFixed(decimals)} ${store.quoteAsset?.symbol ?? ''}`}
              toolTip='Estimated unit price your market order would clear at, derived from the quoted total ÷ base amount. Compare against the chart mid for a rough slippage check.'
            />
          );
        })()}
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
            // Red when slippage is meaningful (>1%) — by then it's no
            // longer 'small market move noise' but a chunk of the
            // trader's expected fill they'll lose. Mirrors how every
            // pro DEX warns at the same threshold.
            valueColor={
              (store.priceImpactPercent ?? 0) > 1 ? 'error' : undefined
            }
            toolTip={
              (store.priceImpactPercent ?? 0) > 1
                ? 'High price impact — your trade is large enough relative to the book that the executed price will move noticeably from the current mid. Consider splitting the order or using Limit form.'
                : 'This percentage represents the effect of your trade on the token’s price.'
            }
          />
        )}
        {store.unfilled && (
          <InfoRow
            label='Unfilled amount'
            value={store.unfilled}
            // Any unfilled amount means the route book ran out of
            // liquidity before completing the trade — always a warning,
            // not a neutral fact.
            valueColor='error'
            toolTip='The portion of your trade that cannot be completed due to insufficient liquidity. Reduce the trade size or wait for more liquidity to appear.'
          />
        )}
      </div>
      <div className='mb-4'>
        {connected ? (
          <Button
            actionType='accent'
            disabled={!parentStore.canSubmit}
            onClick={() => void parentStore.submit()}
          >
            {isBuy ? 'Buy' : 'Sell'} {store.baseAsset?.symbol}
          </Button>
        ) : (
          <ConnectButton actionType='default' />
        )}
      </div>
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
