'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';

/**
 * URL-backed time-range picker for the active-stake-history chart.
 *
 * Lives entirely in the URL so the picker survives back/forward, share
 * links land on the same window, and Next.js's force-dynamic re-runs
 * the server fetch on every navigation. No client state.
 */
export const STAKE_RANGES = [
  { key: '30d', label: '30D', days: 30 },
  { key: '90d', label: '90D', days: 90 },
  { key: '180d', label: '180D', days: 180 },
  { key: '1y', label: '1Y', days: 365 },
  { key: '2y', label: '2Y', days: 730 },
] as const;

export type StakeRangeKey = (typeof STAKE_RANGES)[number]['key'];

export const DEFAULT_STAKE_RANGE: StakeRangeKey = '90d';

export const parseStakeRange = (raw: string | undefined): StakeRangeKey => {
  if (!raw) return DEFAULT_STAKE_RANGE;
  const match = STAKE_RANGES.find(r => r.key === raw);
  return match?.key ?? DEFAULT_STAKE_RANGE;
};

export const stakeRangeDays = (key: StakeRangeKey): number =>
  STAKE_RANGES.find(r => r.key === key)!.days;

export const StakeRangeSelector = ({ current }: { current: StakeRangeKey }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const setRange = (key: StakeRangeKey) => {
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    if (key === DEFAULT_STAKE_RANGE) {
      params.delete('range');
    } else {
      params.set('range', key);
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  return (
    <div className='inline-flex gap-1 rounded-lg bg-other-tonal-fill5 p-1'>
      {STAKE_RANGES.map(r => {
        const active = r.key === current;
        return (
          <button
            key={r.key}
            type='button'
            onClick={() => setRange(r.key)}
            className={
              active
                ? 'rounded-md bg-other-tonal-fill10 px-3 py-1 font-mono text-xs text-text-primary'
                : 'rounded-md px-3 py-1 font-mono text-xs text-text-secondary transition-colors hover:text-text-primary'
            }
            aria-pressed={active}
          >
            {r.label}
          </button>
        );
      })}
    </div>
  );
};
