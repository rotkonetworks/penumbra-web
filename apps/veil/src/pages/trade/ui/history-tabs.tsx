import { useState } from 'react';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import { Tabs } from '@penumbra-zone/ui/Tabs';
import { Density } from '@penumbra-zone/ui/Density';
import { PositionsTable } from '@/entities/position';
import { usePathToMetadata } from '../model/use-path';
import { PositionState_PositionStateEnum as State } from '@penumbra-zone/protobuf/penumbra/core/component/dex/v1/dex_pb';
import { MyTrades } from './trades/my-trades';

enum PositionsTabsType {
  /** OPENED positions — actively quoting on-chain. */
  OPEN_POSITIONS = 'OPEN_POSITIONS',
  /** CLOSED positions — done quoting, reserves still locked. Bulk-withdraw target. */
  CLOSED_POSITIONS = 'CLOSED_POSITIONS',
  /** WITHDRAWN positions — terminal state, kept for record. */
  POSITION_HISTORY = 'POSITION_HISTORY',
  /** Swap fills the user actually executed (separate from LP positions). */
  TRADE_HISTORY = 'TRADE_HISTORY',
}

/**
 * Bottom panel tabs — split out from a single 'My Positions' view that
 * mixed open and closed by default and hid withdrawn behind a toggle.
 *
 *   - 'Open positions' shows what you have quoting right now.
 *   - 'Closed' shows what's been closed and is waiting on a withdraw to
 *     return reserves; PositionsTable's bulk-withdraw button picks these
 *     up automatically (tab is the right place to surface it).
 *   - 'Position history' is the terminal-state log of withdrawn positions.
 *   - 'Trade history' lists the user's swap fills (separate from LPs).
 *     Pending the dex-tx query — placeholder for now.
 */
export const HistoryTabs = () => {
  const [parent] = useAutoAnimate();
  const [tab, setTab] = useState<PositionsTabsType>(PositionsTabsType.OPEN_POSITIONS);
  const { baseAsset, quoteAsset } = usePathToMetadata();

  return (
    <div ref={parent} className='flex w-screen flex-col desktop:w-auto'>
      <div className='flex items-center justify-between gap-2 border-b border-b-other-solid-stroke px-4'>
        <Density compact>
          <Tabs
            value={tab}
            actionType='accent'
            onChange={value => setTab(value as PositionsTabsType)}
            options={[
              { value: PositionsTabsType.OPEN_POSITIONS, label: 'Open positions' },
              { value: PositionsTabsType.CLOSED_POSITIONS, label: 'Closed (withdrawable)' },
              { value: PositionsTabsType.POSITION_HISTORY, label: 'Position history' },
              { value: PositionsTabsType.TRADE_HISTORY, label: 'Trade history' },
            ]}
          />
        </Density>
      </div>

      <div className='p-4'>
        {tab === PositionsTabsType.OPEN_POSITIONS && (
          <PositionsTable base={baseAsset} quote={quoteAsset} stateFilter={[State.OPENED]} />
        )}
        {tab === PositionsTabsType.CLOSED_POSITIONS && (
          <PositionsTable base={baseAsset} quote={quoteAsset} stateFilter={[State.CLOSED]} />
        )}
        {tab === PositionsTabsType.POSITION_HISTORY && (
          <PositionsTable base={baseAsset} quote={quoteAsset} stateFilter={[State.WITHDRAWN]} />
        )}
        {tab === PositionsTabsType.TRADE_HISTORY && <MyTrades />}
      </div>
    </div>
  );
};
