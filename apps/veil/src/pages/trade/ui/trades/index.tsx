import { useCallback, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import { Tabs } from '@penumbra-zone/ui/Tabs';
import { Density } from '@penumbra-zone/ui/Density';
import { Button } from '@penumbra-zone/ui/Button';
import { Chart } from '../chart/chart';
import { MarketTrades } from './market-trades';
import { MyTrades } from '@/pages/trade/ui/trades/my-trades';

enum TradesTabsType {
  Chart = 'chart',
  MarketTrades = 'market-trades',
  MyTrades = 'my-trades',
}

// Module-scoped — same reasoning as form-tabs and history-tabs: avoid
// re-allocating two-or-three option objects per render so the Tabs
// shallow prop-compare can stay effective.
const TRADES_OPTIONS_WITH_CHART = [
  { value: TradesTabsType.Chart, label: 'Chart' },
  { value: TradesTabsType.MarketTrades, label: 'Market Trades' },
  { value: TradesTabsType.MyTrades, label: 'My Trades' },
];
const TRADES_OPTIONS_NO_CHART = [
  { value: TradesTabsType.MarketTrades, label: 'Market Trades' },
  { value: TradesTabsType.MyTrades, label: 'My Trades' },
];

export const TradesTabs = ({ withChart = false }: { withChart?: boolean }) => {
  const [parent] = useAutoAnimate();

  const [tab, setTab] = useState<TradesTabsType>(
    withChart ? TradesTabsType.Chart : TradesTabsType.MarketTrades,
  );
  const [collapsed, setCollapsed] = useState(false);

  const toggleCollapsed = () => setCollapsed(prev => !prev);
  const onTabChange = useCallback((value: string) => setTab(value as TradesTabsType), []);

  return (
    <div ref={parent} className='flex flex-col'>
      <div className='flex items-center justify-between border-b border-b-other-solid-stroke px-4'>
        <Density compact>
          <Tabs
            value={tab}
            actionType='accent'
            onChange={onTabChange}
            options={withChart ? TRADES_OPTIONS_WITH_CHART : TRADES_OPTIONS_NO_CHART}
          />
        </Density>

        {withChart && (
          <Density compact>
            <Button iconOnly icon={collapsed ? ChevronDown : ChevronUp} onClick={toggleCollapsed}>
              Toggle
            </Button>
          </Density>
        )}
      </div>

      {!collapsed && (
        <>
          {withChart && tab === TradesTabsType.Chart && (
            <div className='h-[300px]'>
              <Chart />
            </div>
          )}
          {tab === TradesTabsType.MarketTrades && <MarketTrades />}
          {tab === TradesTabsType.MyTrades && <MyTrades />}
        </>
      )}
    </div>
  );
};
