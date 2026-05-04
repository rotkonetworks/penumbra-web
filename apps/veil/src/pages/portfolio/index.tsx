'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { observer } from 'mobx-react-lite';
import { XCircle } from 'lucide-react';
import { Button } from '@penumbra-zone/ui/Button';
import { Text } from '@penumbra-zone/ui/Text';
import { Density } from '@penumbra-zone/ui/Density';
import { Skeleton } from '@/shared/ui/skeleton';

// Defer the entire desktop portfolio (cosmos-kit + chain-registry +
// keplr/leap SDKs + interchain-ui) into a client-only chunk. The parent
// route's First Load JS shouldn't carry ~1.5MB of Cosmos wallet
// machinery that only matters once the user has scrolled into the
// portfolio. Mobile path stays static (no cosmos-kit dependency).
const DesktopPortfolioPage = dynamic(
  () => import('./ui/desktop-page').then(m => ({ default: m.DesktopPortfolioPage })),
  {
    ssr: false,
    loading: () => <PortfolioSkeleton />,
  },
);

interface PortfolioPageProps {
  isMobile: boolean;
}

export const PortfolioPage = observer(
  ({ isMobile }: PortfolioPageProps): React.ReactNode => {
    if (isMobile) {
      return <MobilePortfolioPage />;
    }
    return <DesktopPortfolioPage />;
  },
);

/**
 * Inline placeholder while the desktop chunk loads. Sized to match the
 * real layout so there's no jank when the chunk arrives.
 */
const PortfolioSkeleton = () => (
  <div className='container mx-auto flex max-w-[1136px] flex-col gap-4 py-8'>
    <div className='h-12'>
      <Skeleton />
    </div>
    <div className='h-32'>
      <Skeleton />
    </div>
    <div className='h-64'>
      <Skeleton />
    </div>
  </div>
);

function MobilePortfolioPage() {
  return (
    <section className='absolute inset-0 flex h-screen flex-col items-center justify-between gap-3 border-t border-neutral-800 p-4'>
      <div className='flex w-full grow flex-col items-center justify-center gap-4 p-0'>
        <div className='relative'>
          <XCircle className='h-8 w-8 text-neutral-light' />
        </div>

        <Text color={'text.secondary'} align={'center'} small={true}>
          This page requires a connection to your wallet, please switch to a desktop device.
        </Text>

        <Density compact={true}>
          {/* Copy Link Button */}
          <Button
            onClick={() => {
              // We discard the promise using void,
              // because Button only expects void-returning functions.
              void (async () => {
                /* Write the current url to clipboard */
                const currentUrl = window.location.href;
                await navigator.clipboard.writeText(currentUrl);
              })();
            }}
          >
            Copy Link
          </Button>
        </Density>
      </div>

      <Button>
        <Text body>Go Back</Text>
      </Button>
    </section>
  );
}
