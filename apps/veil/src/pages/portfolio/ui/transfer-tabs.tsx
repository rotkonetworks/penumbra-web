'use client';

import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { Tabs } from '@penumbra-zone/ui/Tabs';
import { Density } from '@penumbra-zone/ui/Density';
import { connectionStore } from '@/shared/model/connection';
import { PortfolioCard } from './portfolio-card';
import { ReceivePanel } from './receive-panel';
import { SendPanel } from './send-panel';
import { SwapPanel } from './swap-panel';

enum TransferTab {
  Receive = 'Receive',
  Send = 'Send',
  Swap = 'Swap',
}

const TAB_OPTIONS = Object.values(TransferTab).map(value => ({
  value,
  label: value,
}));

export const TransferTabs = observer(() => {
  const [tab, setTab] = useState(TransferTab.Receive);

  if (!connectionStore.connected) {
    return null;
  }

  return (
    <PortfolioCard title='Transfer'>
      <div className='mb-4 w-full border-b border-b-other-tonal-stroke'>
        <Density compact>
          <Tabs
            value={tab}
            actionType='accent'
            onChange={value => setTab(value as TransferTab)}
            options={TAB_OPTIONS}
          />
        </Density>
      </div>

      {tab === TransferTab.Receive && <ReceivePanel />}
      {tab === TransferTab.Send && <SendPanel />}
      {tab === TransferTab.Swap && <SwapPanel />}
    </PortfolioCard>
  );
});
