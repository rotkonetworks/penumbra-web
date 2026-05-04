'use client';

import { lazy, Suspense } from 'react';
import { observer } from 'mobx-react-lite';
import { theme as penumbraTheme } from '@penumbra-zone/ui/theme';
import { ShieldDialog } from '@/pages/portfolio/ui/shield-dialog';
import { Skeleton } from '@/shared/ui/skeleton';

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

export const DepositDialog = observer(({ isOpen, onClose }: DepositDialogProps) => {
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
          theme={skipTheme}
          enableAmplitudeAnalytics={false}
        />
      </Suspense>
    </ShieldDialog>
  );
});
