import type { Metadata } from 'next';
import { FaqPage } from '@/pages/learn/ui/faq';

export const metadata: Metadata = {
  title: 'Penumbra FAQ — UM, shielded swaps, staking, and the DEX',
  description:
    'Answers to the questions people ask about Penumbra: what is UM, how does the shielded DEX work, ' +
    'how do I shield assets, what is batch swap clearing, and how arbitrage burn protects users from MEV.',
  alternates: { canonical: '/learn/faq' },
  openGraph: {
    title: 'Penumbra FAQ',
    description:
      'Common questions about Penumbra: UM token, shielded trading, staking, IBC bridging, and MEV.',
    type: 'article',
  },
};

export default FaqPage;
