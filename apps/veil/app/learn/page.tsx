import type { Metadata } from 'next';
import { LearnHub } from '@/pages/learn/ui/hub';

export const metadata: Metadata = {
  title: 'Learn Penumbra — shielded DEX docs, FAQ, and tokenomics',
  description:
    'Learn how Penumbra works: shielded balances, batch-cleared swaps, arbitrage burn, UM tokenomics. ' +
    'Includes FAQ for common questions about UM, staking, IBC shielding, and the Penumbra DEX.',
  alternates: { canonical: '/learn' },
  openGraph: {
    title: 'Learn Penumbra',
    description:
      'How shielded trading works, why Penumbra has no MEV, and what UM does on-chain.',
    type: 'website',
  },
};

export default LearnHub;
