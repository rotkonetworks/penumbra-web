import { useCallback, useEffect } from 'react';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import { Tabs } from '@penumbra-zone/ui/Tabs';
import { Density } from '@penumbra-zone/ui/Density';
import { MarketOrderForm } from './order-form/order-form-market';
import { LimitOrderForm } from './order-form/order-form-limit';
import { RangeLiquidityOrderForm } from './order-form/order-form-range-liquidity';
import { SimpleLiquidityOrderForm } from './order-form/order-form-simple-liquidity';
import { isWhichForm, useOrderFormStore } from './order-form/store/OrderFormStore';
import { observer } from 'mobx-react-lite';
import cn from 'clsx';

// Top-level tabs: Market / Limit / Provide Liquidity. The 'Provide
// Liquidity' tab is a parent that resolves to either SimpleLP (Basic)
// or RangeLP (Advanced) via the inner sub-tab — collapses two top-
// level tabs into one parent so the form bar stays compact and Basic
// vs Advanced reads as a graduation, not two separate flows.
const TOP_TAB_OPTIONS = [
  { value: 'Market', label: 'Market' },
  { value: 'Limit', label: 'Limit' },
  { value: 'Liquidity', label: 'Provide Liquidity' },
];

// Inner sub-tabs shown only when 'Provide Liquidity' is active. Map
// 'Basic' → SimpleLP (guided: auto-derived position count, presets)
// and 'Advanced' → RangeLP (every knob: fee tier, position count,
// liquidity-shape selector, manual bounds). Same underlying tx.
const LP_TAB_OPTIONS = [
  { value: 'SimpleLP', label: 'Basic' },
  { value: 'RangeLP', label: 'Advanced' },
];

export const FormTabs = observer(() => {
  const [parent] = useAutoAnimate();
  const store = useOrderFormStore();

  // Hydrate the user's last selected form on mount. The store defaults to
  // 'Market' on SSR and on the first client render so React hydration
  // stays stable; this effect then swaps in whatever the user had open
  // last (Market / Limit / SimpleLP). Same pattern as chart timeframe
  // and chart prefs.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem('veil_which_form');
      if (raw && isWhichForm(raw) && raw !== store.whichForm) {
        store.setWhichForm(raw);
      }
    } catch {
      // ignore storage errors
    }
    // store is stable, only run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The top-level Tabs reads 'Liquidity' as the parent option for
  // SimpleLP / RangeLP; map between that synthetic value and the
  // store's actual whichForm. Switching back to Liquidity restores
  // the last-used LP sub-form (defaulting to SimpleLP / Basic).
  const isLiquidity = store.whichForm === 'SimpleLP' || store.whichForm === 'RangeLP';
  const topValue = isLiquidity ? 'Liquidity' : store.whichForm;

  const onTopTabChange = useCallback(
    (value: string) => {
      if (value === 'Liquidity') {
        // Coming from Market / Limit → land on Basic (SimpleLP).
        if (!isLiquidity) {
          store.setWhichForm('SimpleLP');
        }
        return;
      }
      if (isWhichForm(value)) {
        store.setWhichForm(value);
      }
    },
    [store, isLiquidity],
  );

  const onLpSubTabChange = useCallback(
    (value: string) => {
      if (isWhichForm(value)) {
        store.setWhichForm(value);
      }
    },
    [store],
  );

  return (
    <div
      ref={parent}
      // h-full + min-h-0 so the inner form area can flex-1 + scroll
      // internally instead of pushing the whole page longer when the
      // form (esp. RangeLP) is taller than the panel.
      className={cn(
        'flex h-full min-h-0 flex-col transition-colors duration-500',
        store.highlight && 'bg-action-hover-overlay',
      )}
    >
      <div className='border-b border-b-other-solid-stroke px-4 lg:pt-2'>
        <Density compact>
          <Tabs
            value={topValue}
            actionType='accent'
            onChange={onTopTabChange}
            options={TOP_TAB_OPTIONS}
          />
        </Density>
      </div>
      {/* Basic / Advanced sub-tab — only shown while the top-level
          Liquidity tab is active. Switches between SimpleLP (Basic,
          guided) and RangeLP (Advanced, every knob). */}
      {isLiquidity && (
        <div className='border-b border-b-other-tonal-stroke px-4 py-1'>
          <Density compact>
            <Tabs
              value={store.whichForm}
              actionType='default'
              onChange={onLpSubTabChange}
              options={LP_TAB_OPTIONS}
            />
          </Density>
        </div>
      )}
      <div className='min-h-0 flex-1 overflow-y-auto'>
        {store.whichForm === 'Market' && <MarketOrderForm parentStore={store} />}
        {store.whichForm === 'Limit' && <LimitOrderForm parentStore={store} />}
        {store.whichForm === 'RangeLP' && <RangeLiquidityOrderForm parentStore={store} />}
        {store.whichForm === 'SimpleLP' && <SimpleLiquidityOrderForm parentStore={store} />}
      </div>
    </div>
  );
});
