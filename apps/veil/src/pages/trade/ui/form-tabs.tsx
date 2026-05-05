import { useCallback } from 'react';
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

// Module-scoped — re-allocating three label objects per render gave Tabs's
// shallow prop compare a fresh reference every time, which made any future
// memo on Tabs ineffective.
const FORM_TAB_OPTIONS = [
  { value: 'Market', label: 'Market' },
  { value: 'Limit', label: 'Limit' },
  { value: 'SimpleLP', label: 'Provide Liquidity' },
];

export const FormTabs = observer(() => {
  const [parent] = useAutoAnimate();
  const store = useOrderFormStore();

  const onTabChange = useCallback(
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
      className={cn(
        'flex flex-col transition-colors duration-500',
        store.highlight && 'bg-action-hover-overlay',
      )}
    >
      <div className='border-b border-b-other-solid-stroke px-4 lg:pt-2'>
        <Density compact>
          <Tabs
            value={store.whichForm}
            actionType='accent'
            onChange={onTabChange}
            options={FORM_TAB_OPTIONS}
          />
        </Density>
      </div>
      <div className='overflow-y-auto'>
        {store.whichForm === 'Market' && <MarketOrderForm parentStore={store} />}
        {store.whichForm === 'Limit' && <LimitOrderForm parentStore={store} />}
        {store.whichForm === 'RangeLP' && <RangeLiquidityOrderForm parentStore={store} />}
        {store.whichForm === 'SimpleLP' && <SimpleLiquidityOrderForm parentStore={store} />}
      </div>
    </div>
  );
});
