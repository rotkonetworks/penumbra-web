'use client';

import { Text } from '@penumbra-zone/ui/Text';
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ActiveStakeFlowPoint } from '../server/active-stake-history';

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

const fmtUM = (n: number) => {
  if (n === 0) return '0';
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(0)}K`;
  return `${sign}${abs.toFixed(0)}`;
};

interface RechartsTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}

const ChartTooltip = ({ active, payload, label }: RechartsTooltipProps) => {
  if (!active || !payload?.length || !label) return null;
  return (
    <div className='rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm shadow-lg'>
      <div className='text-text-secondary'>{fmtDate(label)}</div>
      {payload.map(p => (
        <div key={p.name} className='mt-1 font-mono' style={{ color: p.color }}>
          {p.name}: {fmtUM(p.value)} UM
        </div>
      ))}
    </div>
  );
};

interface Props {
  data: ActiveStakeFlowPoint[];
}

/**
 * Historical active stake — sum of UM delegated to currently-active
 * validators at end-of-day — overlaid with daily delegation /
 * undelegation tx flows. Active stake reads as the slow-moving area
 * (what's actually securing the chain), the bars read as the daily
 * pulse of new delegations vs. unbonding starts.
 *
 * Mirror the supply-composition chart on tokenomics in shape and palette
 * so a trader who learned the visual language there reads this one for
 * free.
 */
export const ActiveStakeChart = ({ data }: Props) => {
  // Recharts wants a positive 'undelegated' value to draw downward — we
  // flip the sign here so bars below zero render naturally on a shared
  // axis.
  const chartData = data.map(p => ({
    date: p.date,
    activeStake: p.activeStake,
    delegated: p.delegated,
    undelegated: -p.undelegated,
    netFlow: p.netFlow,
  }));

  const totals = data.reduce(
    (acc, p) => ({
      delegated: acc.delegated + p.delegated,
      undelegated: acc.undelegated + p.undelegated,
    }),
    { delegated: 0, undelegated: 0 },
  );
  const netFlow = totals.delegated - totals.undelegated;
  const latestActive = data.length > 0 ? data[data.length - 1]!.activeStake : 0;

  return (
    <section className='flex flex-col gap-6'>
      <div className='flex flex-col gap-2'>
        <Text variant='h2' color='text.primary'>
          Active stake history
        </Text>
        <Text body color='text.secondary'>
          The slow line is total UM delegated to currently-active validators —
          what&apos;s securing the chain end-of-day. The bars are daily delegation
          (positive) and undelegation (negative) tx flows. Net inflow swells the
          line, net outflow drains it.
        </Text>
      </div>

      <div className='grid grid-cols-2 gap-3 desktop:grid-cols-4'>
        <div className='flex flex-col gap-1 rounded-lg bg-other-tonal-fill5 p-4'>
          <Text detail color='text.secondary'>
            Active stake (latest)
          </Text>
          <Text large color='text.primary'>
            <span className='font-mono text-teal-300'>{fmtUM(latestActive)} UM</span>
          </Text>
        </div>
        <div className='flex flex-col gap-1 rounded-lg bg-other-tonal-fill5 p-4'>
          <Text detail color='text.secondary'>
            Delegated (window)
          </Text>
          <Text large color='text.primary'>
            <span className='font-mono text-success-light'>{fmtUM(totals.delegated)} UM</span>
          </Text>
        </div>
        <div className='flex flex-col gap-1 rounded-lg bg-other-tonal-fill5 p-4'>
          <Text detail color='text.secondary'>
            Undelegated (window)
          </Text>
          <Text large color='text.primary'>
            <span className='font-mono text-destructive-light'>
              {fmtUM(totals.undelegated)} UM
            </span>
          </Text>
        </div>
        <div className='flex flex-col gap-1 rounded-lg bg-other-tonal-fill5 p-4'>
          <Text detail color='text.secondary'>
            Net flow
          </Text>
          <Text large color='text.primary'>
            <span
              className={`font-mono ${netFlow >= 0 ? 'text-success-light' : 'text-destructive-light'}`}
            >
              {netFlow >= 0 ? '+' : ''}
              {fmtUM(netFlow)} UM
            </span>
          </Text>
        </div>
      </div>

      <div className='rounded-lg bg-other-tonal-fill5 p-4'>
        <ResponsiveContainer height={300} width='100%'>
          <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
              yAxisId='stake'
              fontSize={11}
              stroke='#666'
              tickFormatter={v => fmtUM(v)}
              tickLine={false}
              width={56}
            />
            <YAxis
              yAxisId='flow'
              orientation='right'
              fontSize={11}
              stroke='#666'
              tickFormatter={v => fmtUM(v)}
              tickLine={false}
              width={56}
            />
            <Tooltip content={<ChartTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: 12, color: '#888' }}
              iconType='square'
              align='right'
              verticalAlign='top'
            />
            <Area
              yAxisId='stake'
              dataKey='activeStake'
              name='Active stake'
              stroke='#5eead4'
              fill='#5eead4'
              fillOpacity={0.25}
              type='monotone'
            />
            <Bar
              yAxisId='flow'
              dataKey='delegated'
              name='Delegated'
              fill='#55d383'
              fillOpacity={0.7}
            />
            <Bar
              yAxisId='flow'
              dataKey='undelegated'
              name='Undelegated'
              fill='#f17878'
              fillOpacity={0.7}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
};
