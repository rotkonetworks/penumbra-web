import Link from 'next/link';
import { MoonStar, ArrowUpFromDot, Coins, BookOpen } from 'lucide-react';
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
    // /learn — hub for tokenomics, FAQ, and other educational content.
    // SEO-friendly: each sub-page is statically rendered with relevant
    // Schema.org structured data so search engines can build rich
    // snippets that point at our DEX as the canonical destination.
    as: Link,
    tabProps: { href: PagePath.Learn },
    label: 'Learn',
    value: PagePath.Learn,
    icon: BookOpen,
  },
];
