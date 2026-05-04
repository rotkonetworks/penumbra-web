'use server';

import { sql } from 'kysely';
import { pindexerDb } from '@/shared/database/client';

const UM_UNIT = 1_000_000;
const toUM = (raw: bigint | number | string | null | undefined): number =>
  raw === null || raw === undefined ? 0 : Number(raw) / UM_UNIT;

export interface SupplyPoint {
  date: string; // ISO date, e.g. '2026-04-15'
  total: number; // UM
  staked: number; // UM
}

export interface BurnPoint {
  date: string;
  arb: number;
  fees: number;
  cumulative: number;
}

export interface InflationPoint {
  date: string;
  // Annualized rate computed from a 30d trailing supply change at that point.
  annualizedPct: number;
}

export interface TokenomicsTimeseries {
  supply: SupplyPoint[];
  burns: BurnPoint[];
  inflation: InflationPoint[];
}

/**
 * Fetch daily timeseries for the last `days` days. We bucket on
 * `date_trunc('day', block_details.timestamp)` and pick the max-height row
 * within each bucket. That gives one snapshot per day at end-of-day, which
 * is what the supply/burn/inflation charts want.
 */
export async function fetchTokenomicsTimeseries(
  days = 90,
): Promise<TokenomicsTimeseries> {
  const since = new Date(Date.now() - days * 86_400 * 1000);

  // Daily supply (latest row per UTC day)
  const supplyRows = await pindexerDb
    .selectFrom('insights_supply')
    .innerJoin('block_details', 'block_details.height', 'insights_supply.height')
    .select([
      sql<string>`to_char(date_trunc('day', block_details.timestamp), 'YYYY-MM-DD')`.as('date'),
      sql<bigint>`max(insights_supply.total)`.as('total'),
      sql<bigint>`max(insights_supply.staked)`.as('staked'),
    ])
    .where('block_details.timestamp', '>=', since)
    .groupBy(sql`date_trunc('day', block_details.timestamp)`)
    .orderBy('date', 'asc')
    .execute();

  const supply: SupplyPoint[] = supplyRows.map(r => ({
    date: r.date,
    total: toUM(r.total),
    staked: toUM(r.staked),
  }));

  // Cumulative burns per day. supply_total_unstaked has running totals;
  // pick the max-height row per day, then compute daily delta in code.
  const burnRows = await pindexerDb
    .selectFrom('supply_total_unstaked')
    .innerJoin('block_details', 'block_details.height', 'supply_total_unstaked.height')
    .select([
      sql<string>`to_char(date_trunc('day', block_details.timestamp), 'YYYY-MM-DD')`.as('date'),
      sql<bigint>`max(supply_total_unstaked.arb)`.as('arb'),
      sql<bigint>`max(supply_total_unstaked.fees)`.as('fees'),
    ])
    .where('block_details.timestamp', '>=', since)
    .groupBy(sql`date_trunc('day', block_details.timestamp)`)
    .orderBy('date', 'asc')
    .execute();

  const burns: BurnPoint[] = [];
  let prevArb: number | null = null;
  let prevFees: number | null = null;
  for (const r of burnRows) {
    const arbCum = toUM(r.arb);
    const feeCum = Math.abs(toUM(r.fees));
    const arbDelta = prevArb === null ? 0 : Math.max(0, arbCum - prevArb);
    const feeDelta = prevFees === null ? 0 : Math.max(0, feeCum - prevFees);
    prevArb = arbCum;
    prevFees = feeCum;
    burns.push({
      date: r.date,
      arb: arbDelta,
      fees: feeDelta,
      cumulative: arbCum + feeCum,
    });
  }

  // Trailing 30d annualized inflation per day from the supply curve.
  const inflation: InflationPoint[] = [];
  for (let i = 0; i < supply.length; i++) {
    const cur = supply[i]!;
    // Find the supply point ~30 days before, fall back to first if too short.
    let pastIdx = -1;
    for (let j = i - 1; j >= 0; j--) {
      const candidate = supply[j]!;
      const dDays =
        (Date.parse(cur.date) - Date.parse(candidate.date)) / (1000 * 86_400);
      if (dDays >= 30) {
        pastIdx = j;
        break;
      }
    }
    if (pastIdx < 0) continue;
    const past = supply[pastIdx]!;
    if (past.total <= 0) continue;
    const dDays =
      (Date.parse(cur.date) - Date.parse(past.date)) / (1000 * 86_400);
    if (dDays <= 0) continue;
    const windowPct = ((cur.total - past.total) / past.total) * 100;
    inflation.push({
      date: cur.date,
      annualizedPct: windowPct * (365 / dDays),
    });
  }

  return { supply, burns, inflation };
}
