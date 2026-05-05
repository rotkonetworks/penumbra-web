import { observer } from 'mobx-react-lite';
import { round } from '@penumbra-zone/types/round';
import { Button } from '@penumbra-zone/ui/Button';
import { Text } from '@penumbra-zone/ui/Text';
import { Tooltip } from '@penumbra-zone/ui/Tooltip';
import { Icon } from '@penumbra-zone/ui/Icon';
import { InfoIcon } from 'lucide-react';
import { Slider as PenumbraSlider } from '@penumbra-zone/ui/Slider';
import { connectionStore } from '@/shared/model/connection';
import { ConnectButton } from '@/features/connect/connect-button';
import { OrderInput } from './order-input';
import { SelectGroup } from './select-group';
import { InfoRow } from './info-row';
import { InfoRowGasFee } from './info-row-gas-fee';
import { LiquidityShape } from './liquidity-shape';
import { OrderFormStore } from './store/OrderFormStore';
import {
  MAX_POSITION_COUNT,
  MIN_POSITION_COUNT,
  UpperBoundOptions,
  LowerBoundOptions,
  FeeTierOptions,
} from './store/RangeOrderFormStore';
import { LiquidityDistributionShape } from '@/shared/math/position';

// Module-scoped — Object.values() of an enum allocates a fresh array on
// every call, and these three SelectGroups otherwise re-allocate three
// 4-or-5-element arrays per parent re-render (which fires every block-tick
// via marketPrice). Same idiom as the form-tabs / history-tabs / limit-form
// option hoists.
const UPPER_BOUND_OPTIONS = Object.values(UpperBoundOptions);
const LOWER_BOUND_OPTIONS = Object.values(LowerBoundOptions);
const FEE_TIER_OPTIONS = Object.values(FeeTierOptions);
const LIQUIDITY_SHAPES = Object.values(LiquidityDistributionShape);

export const RangeLiquidityOrderForm = observer(
  ({ parentStore }: { parentStore: OrderFormStore }) => {
    const { connected } = connectionStore;
    const { defaultDecimals, rangeForm: store } = parentStore;
    // Display-rounded mid string for the price-input placeholders. Empty
    // upper/lower fields show the live mid as ghost text — same minor
    // affordance the limit form's price input already has, so the trader
    // sees the chain's current mid right at the field they're filling.
    const midText =
      parentStore.marketPrice != null
        ? round({ value: parentStore.marketPrice, decimals: 6 })
        : undefined;

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
              placeholder={midText}
              decimals={store.quoteAsset?.exponent ?? defaultDecimals}
              // Bound MobX setter directly — OrderInput is memo'd and a
              // fresh inline wrapper would defeat the memo on the *other*
              // inputs in this form. Cast widens the setter's optional
              // `fromOption` arg to OrderInput's onChange contract;
              // OrderInput only ever passes the first arg at runtime, so
              // fromOption defaults to false (same behaviour as the old
              // `price => setUpperPriceInput(price)` wrapper).
              onChange={
                store.setUpperPriceInput as (amount: string, ...args: unknown[]) => void
              }
              denominator={store.quoteAsset?.symbol}
            />
          </div>
          <SelectGroup
            options={UPPER_BOUND_OPTIONS}
            value={store.upperPriceInputOption}
            onChange={store.setUpperPriceInputOption}
          />
        </div>
        <div className='mb-4'>
          <div className='mb-2'>
            <OrderInput
              round
              label='Lower Price Bound'
              value={store.lowerPriceInput}
              placeholder={midText}
              decimals={store.quoteAsset?.exponent ?? defaultDecimals}
              onChange={
                store.setLowerPriceInput as (amount: string, ...args: unknown[]) => void
              }
              denominator={store.quoteAsset?.symbol}
            />
          </div>
          <SelectGroup
            options={LOWER_BOUND_OPTIONS}
            value={store.lowerPriceInputOption}
            onChange={store.setLowerPriceInputOption}
          />
        </div>
        <div className='mb-4'>
          <div className='mb-2'>
            <OrderInput
              label='Fee tier'
              value={store.feeTierPercentInput}
              onChange={
                store.setFeeTierPercentInput as (amount: string, ...args: unknown[]) => void
              }
              denominator='%'
            />
          </div>
          <SelectGroup
            options={FEE_TIER_OPTIONS}
            value={store.feeTierPercentInputOption}
            onChange={store.setFeeTierPercentInputOption}
          />
        </div>
        <div className='mb-4'>
          <div className='mb-2 flex items-center gap-1'>
            <Text small color='text.secondary'>
              Liquidity Shape
            </Text>
            <Tooltip message='Choose how your liquidity is weighted across the range. Linear spreads it evenly; Concentrated stacks it near mid; Volatile pushes it to the edges.'>
              <Icon IconComponent={InfoIcon} size='sm' color='text.secondary' />
            </Tooltip>
          </div>
          <div className='mb-4 flex w-full gap-2'>
            {LIQUIDITY_SHAPES.map(shape => (
              <LiquidityShape
                key={shape}
                shape={shape}
                selected={store._liquidityShape === shape}
                onSelect={store.setLiquidityShape}
              />
            ))}
          </div>
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
          {/* Same 'what's being planted' summary as SimpleLP — anchor mid
              and an endpoints-combined view of the order count, so the
              trader doesn't have to mentally re-stitch upper / lower /
              positions to picture the rung structure. */}
          {parentStore.marketPrice && (
            <InfoRow
              label='Anchor mid'
              value={`${parentStore.marketPrice.toFixed(store.quoteAsset?.exponent ?? defaultDecimals)} ${store.quoteAsset?.symbol ?? ''}`}
              toolTip='The on-chain mid the form is centred on. The shape selector above weights liquidity around this point.'
            />
          )}
          <InfoRow
            label='Orders'
            value={
              store.positionCount !== undefined &&
              store.lowerPrice !== undefined &&
              store.upperPrice !== undefined
                ? `${store.positionCount} between ${store.lowerPrice} → ${store.upperPrice}`
                : (store.positionCount ?? '—')
            }
            toolTip='Each position is a single concentrated-liquidity slot the chain matches against. The shape selector above sets per-position weights — Linear is equal across all rungs, Concentrated stacks near mid, Volatile pushes to the edges.'
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
              onClick={() => void parentStore.submit()}
            >
              Open {store.positionCount ?? 'Several'} Positions
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
  },
);
