'use client';

import { Settings } from 'lucide-react';
import { Popover } from '@penumbra-zone/ui/Popover';
import { Button } from '@penumbra-zone/ui/Button';
import { Text } from '@penumbra-zone/ui/Text';
import { Density } from '@penumbra-zone/ui/Density';
import { SegmentedControl } from '@penumbra-zone/ui/SegmentedControl';
import { useBroadcastMode, type BroadcastMode } from '@/shared/model/broadcast-mode';

export const SettingsPopover = () => {
  const { mode, setMode } = useBroadcastMode();

  return (
    <Popover>
      <Popover.Trigger>
        <Button icon={Settings} iconOnly>
          Settings
        </Button>
      </Popover.Trigger>
      <Popover.Content align='end' side='bottom'>
        <div className='flex w-72 flex-col gap-4 p-2 text-text-primary'>
          <div className='flex flex-col gap-2'>
            <Text small color='text.primary'>
              Broadcast via
            </Text>
            <Text detail color='text.secondary'>
              Veil submits signed transactions through its own fullnode for lower latency. Switch
              to Wallet to route through your Prax extension's RPC instead.
            </Text>
            <Density compact>
              <SegmentedControl
                value={mode}
                onChange={value => setMode(value as BroadcastMode)}
              >
                <SegmentedControl.Item value='veil' style='filled'>
                  Veil (recommended)
                </SegmentedControl.Item>
                <SegmentedControl.Item value='wallet' style='unfilled'>
                  Wallet (Prax)
                </SegmentedControl.Item>
              </SegmentedControl>
            </Density>
          </div>
        </div>
      </Popover.Content>
    </Popover>
  );
};
