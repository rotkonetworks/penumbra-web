import { PenumbraWaves } from '@/pages/explore/ui/waves';
import { TokenomicsHero } from './hero';
import { WhatUmIs } from './what-um-is';
import { NoMev } from './no-mev';
import { Arbitrage } from './arbitrage';
import { WhatsBurned } from './whats-burned';
import { Resources } from './resources';

/**
 * Educational landing page for UM tokenomics.
 *
 * Pure server component — no DB calls, no wallet hooks. Live stats can be
 * threaded into <TokenomicsHero stats={...} /> in a future commit by wiring
 * pindexer queries similar to apps/veil/src/pages/explore/server/stats.ts.
 */
export const TokenomicsPage = () => {
  return (
    <section className='mx-auto flex max-w-[1062px] flex-col gap-10 p-4 desktop:gap-14 desktop:py-10'>
      <PenumbraWaves />
      <TokenomicsHero />
      <WhatUmIs />
      <NoMev />
      <Arbitrage />
      <WhatsBurned />
      <Resources />
    </section>
  );
};
