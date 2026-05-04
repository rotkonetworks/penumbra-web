'use client';

import { lazy, Suspense, useMemo } from 'react';
import { observer } from 'mobx-react-lite';
import { theme as penumbraTheme } from '@penumbra-zone/ui/theme';
import { ShieldDialog } from '@/pages/portfolio/ui/shield-dialog';
import { Skeleton } from '@/shared/ui/skeleton';
import { useDepositAddress } from './use-deposit-address';

const LazySkipWidget = lazy(() => import('@skip-go/widget').then(mod => ({ default: mod.Widget })));

interface DepositDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const skipTheme = Object.freeze({
  brandColor: penumbraTheme.color.primary.main,
});

const defaultRoute = {
  srcChainId: 'noble-1',
  srcAssetDenom: 'uusdc',
  destChainId: 'penumbra-1',
};

const SkeletonFallback = () => (
  <div className='flex h-[420px] w-full items-center justify-center p-4'>
    <Skeleton />
  </div>
);

/**
 * Deposit modal: embeds the Skip widget pre-routed Noble→Penumbra USDC. The
 * Penumbra destination is always a freshly-rotated ephemeral address so the
 * route partner (Skip / Coinbase / IBC relayers) can't link two deposits to
 * the same sub-account. The user never sees, copies, or pastes an address.
 */
export const DepositDialog = observer(({ isOpen, onClose }: DepositDialogProps) => {
  const { data: penumbraAddress } = useDepositAddress();

  const connectedAddresses = useMemo(
    () => (penumbraAddress ? { 'penumbra-1': penumbraAddress } : undefined),
    [penumbraAddress],
  );

  return (
    <ShieldDialog isOpen={isOpen} onClose={onClose}>
      <Suspense fallback={<SkeletonFallback />}>
        <LazySkipWidget
          defaultRoute={defaultRoute}
          filter={{
            destination: {
              'penumbra-1': undefined,
            },
          }}
          connectedAddresses={connectedAddresses}
          theme={skipTheme}
          enableAmplitudeAnalytics={false}
        />
      </Suspense>
    </ShieldDialog>
  );
});
