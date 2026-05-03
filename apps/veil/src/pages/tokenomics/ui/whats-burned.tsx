import { Text } from '@penumbra-zone/ui/Text';
import { Flame } from 'lucide-react';

interface BurnRowProps {
  label: string;
  description: string;
}

const BurnRow = ({ label, description }: BurnRowProps) => (
  <div className='flex items-start gap-3 rounded-lg bg-other-tonal-fill5 p-4'>
    <div className='mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-orange-400/10'>
      <Flame className='h-4 w-4 text-orange-400' />
    </div>
    <div className='flex flex-col gap-1'>
      <Text variant='strong' color='text.primary'>
        {label}
      </Text>
      <Text small color='text.secondary'>
        {description}
      </Text>
    </div>
  </div>
);

export const WhatsBurned = () => {
  return (
    <section className='flex flex-col gap-6'>
      <div className='flex flex-col gap-2'>
        <Text variant='h2' color='text.primary'>
          What gets burned
        </Text>
        <Text body color='text.secondary'>
          Three flows reduce UM supply. All of them happen at the protocol layer — no one signs
          a burn transaction, no multisig holds the keys.
        </Text>
      </div>

      <div className='grid grid-cols-1 gap-3'>
        <BurnRow
          label='Arbitrage proceeds'
          description='UM captured by the protocol when it closes price gaps between liquidity positions during batch clearing. Scales directly with DEX activity.'
        />
        <BurnRow
          label='Transaction fees'
          description='Fees paid in UM for swaps, transfers, and other on-chain actions are burned rather than paid to validators. Validators are rewarded by inflation, not fee revenue.'
        />
        <BurnRow
          label='Slashing & expired auctions'
          description='UM forfeited via validator slashing or unfilled Dutch auction reserves is removed from supply.'
        />
      </div>

      <Text small color='text.secondary'>
        Net issuance is staking rewards minus burns. A busy DEX can drive net issuance negative
        even while the chain pays validators to secure it.
      </Text>
    </section>
  );
};
