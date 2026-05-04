import Link from 'next/link';
import { MoonStar, ArrowUpFromDot, Coins, Flame } from 'lucide-react';
import { PagePath } from '@/shared/const/pages';

// Note: Tournament link is intentionally hidden from the header until the
// next LQT epoch is live. The route handlers under /tournament still
// exist so existing bookmarks resolve, but we don't advertise the page
// while it has no fresh data to show.
export const HEADER_LINKS = [
  {
    // Root `/`. The landing/market page (DEX pairs + stats).
    as: Link,
    tabProps: { href: PagePath.Home },
    label: 'Home',
    value: PagePath.Home,
    icon: Coins,
  },
  {
    as: Link,
    tabProps: { href: PagePath.Portfolio },
    label: 'Portfolio',
    value: PagePath.Portfolio,
    icon: Coins,
  },
  {
    as: Link,
    tabProps: { href: PagePath.Trade },
    label: 'Trade',
    value: PagePath.Trade,
    icon: ArrowUpFromDot,
  },
  {
    // /explore — on-chain explorer (blocks, txs, validators, governance,
    // IBC, LPs).
    as: Link,
    tabProps: { href: PagePath.Explore },
    label: 'Explore',
    value: PagePath.Explore,
    icon: MoonStar,
  },
  {
    as: Link,
    tabProps: { href: PagePath.Tokenomics },
    label: 'Tokenomics',
    value: PagePath.Tokenomics,
    icon: Flame,
  },
];
