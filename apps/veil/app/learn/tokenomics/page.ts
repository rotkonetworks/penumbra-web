import { TokenomicsPage } from '@/pages/tokenomics';

// Page pulls live supply/burn/inflation numbers from pindexer; without
// revalidate Next prerenders once at build time and freezes them. 5 min
// is the right cadence: the underlying timeseries are 1d-resolution, so
// a 5-minute snapshot is far fresher than the data itself, and we avoid
// hammering pindexer on every cold load.
export const revalidate = 300;

export default TokenomicsPage;
