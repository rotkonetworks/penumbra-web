'use client';

import { Text } from '@penumbra-zone/ui/Text';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { InflationPoint } from '../server/timeseries';
import type { TokenomicsMetrics } from '../server/metrics';

const fmtPct = (n: number, digits = 2) => `${n.toFixed(digits)}%`;
const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

const InflationTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div className='rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm shadow-lg'>
      <div className='text-text-secondary'>{fmtDate(label)}</div>
      <div className='mt-1 font-mono text-orange-400'>
        {fmtPct(Number(p.value))} annualized
      </div>
    </div>
  );
};

interface Props {
  metrics: TokenomicsMetrics;
  inflation: InflationPoint[];
}

export const IssuancePanel = ({ metrics, inflation }: Props) => {
  const avg = inflation.length
    ? inflation.reduce((a, p) => a + p.annualizedPct, 0) / inflation.length
    : 0;
  const min = inflation.length ? Math.min(...inflation.map(p => p.annualizedPct)) : 0;
  const max = inflation.length ? Math.max(...inflation.map(p => p.annualizedPct)) : 0;
  const issuedSinceGenesis = Math.max(0, metrics.totalSupply - metrics.genesisAllocation);

  // Penumbra issues new UM only to bonded stake. Realized inflation ≈
  // base_rate × staked_fraction. So the *cap* is the base rate (when 100%
  // is staked), and today's realized rate is a multiple of staked_pct.
  // We back the base rate out of the realized rate when both are known —
  // when realized is null, fall back to a known-good ~2% genesis base.
  // Inflation scales with the *active* stake fraction — only bonded
  // delegations to active validators receive issuance.
  const stakedFrac = metrics.activeStakedPct / 100;
  const inferredBasePct =
    metrics.annualizedInflationPct !== null && stakedFrac > 0
      ? metrics.annualizedInflationPct / stakedFrac
      : null;
  const basePct = inferredBasePct ?? 2;

  return (
    <section className='flex flex-col gap-6'>
      <div className='flex flex-col gap-2'>
        <Text variant='h2' color='text.primary'>
          Issuance scales with stake — capped near {basePct.toFixed(1)}% at full participation
        </Text>
        <Text body color='text.secondary'>
          Penumbra mints new UM only for bonded stake. The realized network inflation
          rate is the protocol&apos;s base reward multiplied by the fraction of supply
          that&apos;s actually staked, so doubling participation roughly doubles
          issuance — and the absolute ceiling is reached only if 100% of UM is bonded.
          Numbers below are computed from observed supply changes over a trailing
          30-day window, not from genesis params.
        </Text>
      </div>

      <div className='rounded-lg bg-other-tonal-fill5 p-4'>
        <Text small color='text.secondary'>
          <span className='font-mono text-orange-400'>realized</span> ≈{' '}
          <span className='font-mono text-teal-300'>base</span> ×{' '}
          <span className='font-mono'>staked %</span>
          {'  →  '}
          <span className='font-mono text-orange-400'>
            {metrics.annualizedInflationPct === null
              ? '—'
              : fmtPct(metrics.annualizedInflationPct)}
          </span>
          {' ≈ '}
          <span className='font-mono text-teal-300'>{basePct.toFixed(2)}%</span>
          {' × '}
          <span className='font-mono'>{metrics.activeStakedPct.toFixed(1)}%</span>
        </Text>
      </div>

      <div className='grid grid-cols-1 gap-3 desktop:grid-cols-3'>
        <div className='flex flex-col gap-1 rounded-lg bg-other-tonal-fill5 p-4'>
          <Text detail color='text.secondary'>
            Current annualized
          </Text>
          <Text large color='text.primary'>
            <span className='font-mono'>
              {metrics.annualizedInflationPct === null
                ? '—'
                : fmtPct(metrics.annualizedInflationPct)}
            </span>
          </Text>
        </div>
        <div className='flex flex-col gap-1 rounded-lg bg-other-tonal-fill5 p-4'>
          <Text detail color='text.secondary'>
            90-day window
          </Text>
          <Text large color='text.primary'>
            <span className='font-mono text-teal-300'>{fmtPct(min, 2)}</span>
            <span className='mx-2 text-text-secondary'>—</span>
            <span className='font-mono text-orange-400'>{fmtPct(max, 2)}</span>
          </Text>
          <Text small color='text.secondary'>
            avg {fmtPct(avg, 2)}
          </Text>
        </div>
        <div className='flex flex-col gap-1 rounded-lg bg-other-tonal-fill5 p-4'>
          <Text detail color='text.secondary'>
            Issued since genesis
          </Text>
          <Text large color='text.primary'>
            <span className='font-mono'>
              {(issuedSinceGenesis / 1_000_000).toFixed(2)}M UM
            </span>
          </Text>
          <Text small color='text.secondary'>
            from {(metrics.genesisAllocation / 1_000_000).toFixed(1)}M genesis
          </Text>
        </div>
      </div>

      <div className='rounded-lg bg-other-tonal-fill5 p-4'>
        <ResponsiveContainer height={260} width='100%'>
          <AreaChart data={inflation} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id='infl-grad' x1='0' x2='0' y1='0' y2='1'>
                <stop offset='0%' stopColor='#fb923c' stopOpacity={0.4} />
                <stop offset='100%' stopColor='#fb923c' stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke='#333' strokeDasharray='3 3' />
            <XAxis
              dataKey='date'
              fontSize={11}
              stroke='#666'
              tickFormatter={fmtDate}
              tickLine={false}
              minTickGap={40}
            />
            <YAxis
              fontSize={11}
              stroke='#666'
              tickFormatter={v => `${v}%`}
              tickLine={false}
              width={40}
            />
            <Tooltip content={<InflationTooltip />} />
            <Area
              dataKey='annualizedPct'
              fill='url(#infl-grad)'
              stroke='#fb923c'
              strokeWidth={1.5}
              type='monotone'
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <Text small color='text.secondary'>
        For comparison: BTC issuance is ~0.85%/yr post-2024 halving, ETH net issuance is
        ~0.4%/yr, most Cosmos chains run 7–20%, and Solana is ~5%. Penumbra&apos;s
        base reward is set conservatively, and a busy DEX can push net issuance below
        zero — staking rewards minus burns. The 100%-staked ceiling is theoretical;
        a healthy chain runs around 50–70% staked, which puts realized inflation
        at roughly half the base.
      </Text>
    </section>
  );
};
