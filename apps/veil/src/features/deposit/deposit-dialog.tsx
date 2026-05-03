'use client';

import { useCallback } from 'react';
import { observer } from 'mobx-react-lite';
import { useRouter } from 'next/navigation';
import { ExternalLink } from 'lucide-react';
import { Text } from '@penumbra-zone/ui/Text';
import { Button } from '@penumbra-zone/ui/Button';
import { CopyToClipboardButton } from '@penumbra-zone/ui/CopyToClipboardButton';
import { ShieldDialog } from '@/pages/portfolio/ui/shield-dialog';
import { Skeleton } from '@/shared/ui/skeleton';
import { connectionStore } from '@/shared/model/connection';
import { useDepositAddress } from './use-deposit-address';

interface DepositDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Guidance-only modal: explains how to get USDC onto Penumbra by
 * withdrawing from Coinbase via the Noble network. We do not handle any
 * funds ourselves — the user withdraws from Coinbase to a Noble address,
 * then uses the existing Shield flow to IBC into Penumbra.
 *
 * The modal opens to:
 *   - 4 numbered steps (with the Penumbra address inline at step 3)
 *   - a CTA to the existing Shield flow when funds have arrived on Noble
 *   - links to Coinbase's USDC withdrawal docs
 */
export const DepositDialog = observer(({ isOpen, onClose }: DepositDialogProps) => {
  const router = useRouter();
  const { connected } = connectionStore;
  const { data: penumbraAddress, isLoading } = useDepositAddress();

  const onShieldClick = useCallback(() => {
    onClose();
    // Client-side nav so we don't trigger a full reload.
    router.push('/portfolio');
  }, [onClose, router]);

  return (
    <ShieldDialog isOpen={isOpen} onClose={onClose}>
      <div className='mt-4 flex flex-col gap-5'>
        <Text small color='text.secondary'>
          Bring USDC to Penumbra by withdrawing from Coinbase over the Noble network, then
          shielding it here. The whole process takes about a minute and costs only the Coinbase
          withdrawal fee plus a tiny Noble gas.
        </Text>

        <ol className='flex flex-col gap-4'>
          <Step n={1} title='On Coinbase, choose USDC and click Send / Withdraw.'>
            <Text small color='text.secondary'>
              You need a Coinbase account with USDC. Any amount works for testing.
            </Text>
          </Step>

          <Step n={2} title='Pick the Noble network as the destination.'>
            <Text small color='text.secondary'>
              Coinbase supports Noble for USDC withdrawals. This avoids EVM gas fees and lands
              your funds one IBC hop away from Penumbra.
            </Text>
            <a
              href='https://help.coinbase.com/en/coinbase/getting-started/crypto-education/usdc'
              target='_blank'
              rel='noopener noreferrer'
              className='mt-1 inline-flex items-center gap-1 text-text-primary underline-offset-2 hover:underline'
            >
              <Text small>Coinbase USDC guide</Text>
              <ExternalLink size={12} />
            </a>
          </Step>

          <Step n={3} title='Send first to your own Noble wallet.'>
            <Text small color='text.secondary'>
              Coinbase sends to a public Noble (cosmos1…) address. Use a Cosmos wallet such as
              Keplr or Leap to receive there. Once it arrives, IBC it from Noble to Penumbra
              using the Shield flow below.
            </Text>
          </Step>

          <Step n={4} title='Shield from Noble into Penumbra.'>
            <Text small color='text.secondary'>
              The Shield button bridges your Noble USDC over IBC and converts it into a
              shielded Penumbra balance.
            </Text>
            {connected && (
              <div className='mt-2 rounded-sm border border-other-tonal-stroke bg-other-tonal-fill5 p-3'>
                <Text detail color='text.secondary'>
                  Your Penumbra deposit address (used by the Shield flow):
                </Text>
                {isLoading || !penumbraAddress ? (
                  <Skeleton />
                ) : (
                  <div className='mt-1 flex items-center gap-2'>
                    <code className='break-all text-xs text-text-primary'>{penumbraAddress}</code>
                    <CopyToClipboardButton text={penumbraAddress} />
                  </div>
                )}
              </div>
            )}
          </Step>
        </ol>

        <div className='flex flex-col gap-2 border-t border-t-other-tonal-stroke pt-4 sm:flex-row sm:justify-end'>
          <Button actionType='default' priority='secondary' onClick={onClose}>
            Close
          </Button>
          <Button actionType='accent' priority='primary' onClick={onShieldClick}>
            Open Shield flow
          </Button>
        </div>
      </div>
    </ShieldDialog>
  );
});

const Step = ({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children?: React.ReactNode;
}) => (
  <li className='flex gap-3'>
    <div className='flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-other-tonal-fill15 text-text-primary'>
      <Text small>{n}</Text>
    </div>
    <div className='flex flex-col gap-1'>
      <Text body color='text.primary'>
        {title}
      </Text>
      {children}
    </div>
  </li>
);
