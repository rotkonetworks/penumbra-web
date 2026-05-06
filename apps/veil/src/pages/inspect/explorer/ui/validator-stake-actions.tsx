'use client';

import { FC, useId } from 'react';
import { Coins, MinusCircle } from 'lucide-react';
import { Surface, Tooltip } from '@/pages/inspect/explorer/components';
import { classNames } from '@/pages/inspect/explorer/lib/utils';

interface Props {
  className?: string;
}

/**
 * Read-only stub for the per-validator delegate/undelegate flow. Wallet
 * integration ships separately — buttons are disabled and surface a
 * tooltip rather than firing an unsigned tx or no-op.
 */
export const ValidatorStakeActions: FC<Props> = ({ className }) => {
  const delegateId = useId().replace(/:/g, '');
  const undelegateId = useId().replace(/:/g, '');
  return (
    <Surface as='section' className={classNames('flex flex-col gap-4 p-6', className)}>
      <header className='flex flex-col gap-1'>
        <h2 className='text-2xl font-medium'>Stake</h2>
        <p className='text-text-secondary text-sm'>
          Delegate to back this validator&apos;s voting power, or undelegate
          to start the unbonding period.
        </p>
      </header>
      <div className='grid grid-cols-1 gap-2 sm:grid-cols-2'>
        <button
          id={`stake-delegate-${delegateId}`}
          type='button'
          disabled
          className={classNames(
            'inline-flex items-center justify-center gap-2 rounded-sm',
            'bg-primary-main px-4 py-2 text-sm font-medium text-base-black',
            'opacity-50 cursor-not-allowed',
          )}
        >
          <Coins className='h-4 w-4' />
          Delegate
        </button>
        <button
          id={`stake-undelegate-${undelegateId}`}
          type='button'
          disabled
          className={classNames(
            'inline-flex items-center justify-center gap-2 rounded-sm',
            'border border-other-tonal-fill10 px-4 py-2 text-sm font-medium',
            'text-text-primary opacity-50 cursor-not-allowed',
          )}
        >
          <MinusCircle className='h-4 w-4' />
          Undelegate
        </button>
        <Tooltip anchorSelect={`#stake-delegate-${delegateId}`}>
          Wallet integration pending
        </Tooltip>
        <Tooltip anchorSelect={`#stake-undelegate-${undelegateId}`}>
          Wallet integration pending
        </Tooltip>
      </div>
    </Surface>
  );
};
