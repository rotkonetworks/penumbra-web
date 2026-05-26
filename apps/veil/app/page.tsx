import { ExplorePage } from '@/pages/explore/ui/page';

// Home pulls live DEX volume + day-summaries server-side. Without this,
// Next prerenders the page once at build time and 24h volume freezes
// indefinitely. 60s is the right cadence — tracks the market display
// closely without hammering explorer-backend per request.
export const dynamic = 'force-dynamic';

export default ExplorePage;
