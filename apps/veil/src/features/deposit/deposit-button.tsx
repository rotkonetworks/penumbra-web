'use client';

import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { ArrowDownToLine } from 'lucide-react';
import { Button, ButtonProps } from '@penumbra-zone/ui/Button';
import { Tooltip } from '@penumbra-zone/ui/Tooltip';
import dynamic from 'next/dynamic';
import { connectionStore } from '@/shared/model/connection';

// Defer loading the modal markup until first click — small perf win.
const DepositDialog = dynamic(
  () => import('./deposit-dialog').then(mod => ({ default: mod.DepositDialog })),
  { ssr: false },
);

interface DepositButtonProps {
  variant?: 'default' | 'minimal' | 'mobile';
  actionType?: ButtonProps['actionType'];
  children?: React.ReactNode;
}

/**
 * Trigger for a guidance modal explaining how to fund Penumbra by
 * withdrawing USDC from Coinbase via the Noble network.
 *
 * Disabled until a Prax wallet is connected so we can show the user
 * their own Penumbra deposit address inside the guide.
 */
export const DepositButton = observer(
  ({ variant = 'default', actionType = 'accent', children }: DepositButtonProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const connected = connectionStore.connected;

    const button = (
      <Button
        icon={ArrowDownToLine}
        iconOnly={variant === 'mobile' || variant === 'minimal'}
        actionType={actionType}
        density={variant === 'minimal' ? 'compact' : 'sparse'}
        priority={variant === 'minimal' ? 'secondary' : 'primary'}
        disabled={!connected}
        onClick={() => setIsOpen(true)}
      >
        {children ?? 'Deposit'}
      </Button>
    );

    return (
      <>
        {connected ? (
          button
        ) : (
          <Tooltip message='Connect your Prax wallet to deposit funds into Penumbra'>
            {button}
          </Tooltip>
        )}

        {/* Render the dialog component eagerly only after first open to avoid
            paying the Skip-widget chunk cost on every page load. */}
        {isOpen && <DepositDialog isOpen={isOpen} onClose={() => setIsOpen(false)} />}
      </>
    );
  },
);
