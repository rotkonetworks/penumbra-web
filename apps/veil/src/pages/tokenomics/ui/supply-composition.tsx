'use client';

import { Text } from '@penumbra-zone/ui/Text';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { SupplyPoint } from '../server/timeseries';
import type { TokenomicsMetrics } from '../server/metrics';

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

const fmtUM = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toFixed(0);
};

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className='rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm shadow-lg'>
      <div className='text-text-secondary'>{fmtDate(label)}</div>
      {payload.map((p: any) => (
        <div key={p.name} className='mt-1 font-mono' style={{ color: p.color }}>
          {p.name}: {fmtUM(p.value)} UM
        </div>
      ))}
    </div>
  );
};

interface Props {
  metrics: TokenomicsMetrics;
  supply: SupplyPoint[];
}

export const SupplyComposition = ({ metrics, supply }: Props) => {
  // Stack: total = staked + unstaked
  const data = supply.map(p => ({
    date: p.date,
    staked: p.staked,
    unstaked: Math.max(0, p.total - p.staked),
  }));

  const free = Math.max(
    0,
    metrics.totalSupply - metrics.stakedSupply - metrics.dexLocked - metrics.auctionLocked,
  );
  const freePct =
    metrics.totalSupply > 0 ? (free / metrics.totalSupply) * 100 : 0;
  const dexPct =
    metrics.totalSupply > 0 ? (metrics.dexLocked / metrics.totalSupply) * 100 : 0;
  const auctionPct =
    metrics.totalSupply > 0 ? (metrics.auctionLocked / metrics.totalSupply) * 100 : 0;

  return (
    <section className='flex flex-col gap-6'>
      <div className='flex flex-col gap-2'>
        <Text variant='h2' color='text.primary'>
          Supply composition
        </Text>
        <Text body color='text.secondary'>
          Where the UM lives. Staked balances secure the chain and earn rewards. DEX-
          and auction-locked balances are working liquidity — recoverable, not burned.
          The free float is everything else: wallets, exchanges, and pending stakes.
        </Text>
      </div>

      <div className='grid grid-cols-2 gap-3 desktop:grid-cols-4'>
        <div className='flex flex-col gap-1 rounded-lg bg-other-tonal-fill5 p-4'>
          <Text detail color='text.secondary'>
            Staked
          </Text>
          <Text large color='text.primary'>
            <span className='font-mono text-teal-300'>{metrics.stakedPct.toFixed(1)}%</span>
          </Text>
          <Text small color='text.secondary'>
            {fmtUM(metrics.stakedSupply)} UM
          </Text>
        </div>
        <div className='flex flex-col gap-1 rounded-lg bg-other-tonal-fill5 p-4'>
          <Text detail color='text.secondary'>
            DEX liquidity
          </Text>
          <Text large color='text.primary'>
            <span className='font-mono'>{dexPct.toFixed(1)}%</span>
          </Text>
          <Text small color='text.secondary'>
            {fmtUM(metrics.dexLocked)} UM
          </Text>
        </div>
        <div className='flex flex-col gap-1 rounded-lg bg-other-tonal-fill5 p-4'>
          <Text detail color='text.secondary'>
            Auctions
          </Text>
          <Text large color='text.primary'>
            <span className='font-mono'>{auctionPct.toFixed(2)}%</span>
          </Text>
          <Text small color='text.secondary'>
            {fmtUM(metrics.auctionLocked)} UM
          </Text>
        </div>
        <div className='flex flex-col gap-1 rounded-lg bg-other-tonal-fill5 p-4'>
          <Text detail color='text.secondary'>
            Free float
          </Text>
          <Text large color='text.primary'>
            <span className='font-mono'>{freePct.toFixed(1)}%</span>
          </Text>
          <Text small color='text.secondary'>
            {fmtUM(free)} UM
          </Text>
        </div>
      </div>

      <div className='rounded-lg bg-other-tonal-fill5 p-4'>
        <ResponsiveContainer height={260} width='100%'>
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
              tickFormatter={v => fmtUM(v)}
              tickLine={false}
              width={48}
            />
            <Tooltip content={<ChartTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: 12, color: '#888' }}
              iconType='square'
              align='right'
              verticalAlign='top'
            />
            <Area
              dataKey='staked'
              name='Staked'
              stackId='s'
              stroke='#5eead4'
              fill='#5eead4'
              fillOpacity={0.4}
              type='monotone'
            />
            <Area
              dataKey='unstaked'
              name='Unstaked'
              stackId='s'
              stroke='#fb923c'
              fill='#fb923c'
              fillOpacity={0.3}
              type='monotone'
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
};
