'use server';

import { pindexerDb } from '@/shared/database/client';

// Penumbra mainnet block cadence — approx. 5s blocks => ~17280 blocks/day.
// Genesis sets stakingIssuancePerBlock as a base rate that's then scaled
// by validator-specific reward rates; the realized inflation is computed
// from observed supply changes (see annualizedInflationPct below) rather
// than from this constant alone.
const SECONDS_PER_DAY = 86_400;
const PENUMBRA_BLOCK_TIME_S = 5;
const BLOCKS_PER_DAY = SECONDS_PER_DAY / PENUMBRA_BLOCK_TIME_S; // 17280

const UM_UNIT = 1_000_000; // upenumbra → UM
const toUM = (raw: bigint | number | string | null | undefined): number =>
  raw === null || raw === undefined ? 0 : Number(raw) / UM_UNIT;

export interface TokenomicsMetrics {
  // Latest snapshot
  latestHeight: number;
  totalSupply: number;
  stakedSupply: number;
  stakedPct: number;
  priceUsd: number | null;
  marketCapUsd: number | null;

  // Permanent burns (arb + fees from supply_total_unstaked)
  arbBurned: number;
  feeBurned: number;
  totalBurned: number;
  burnedPctOfEffective: number; // burned / (current + burned)

  // Locked-but-recoverable
  dexLocked: number;
  auctionLocked: number;

  // Realized inflation, annualized from a 30d supply window
  annualizedInflationPct: number | null;

  // 24h activity (joins on dex_ex_aggregate_summary, which we already use on /explore)
  dexVolume24h: number | null;
  trades24h: number | null;
  burned24h: number | null;

  // Genesis reference
  genesisAllocation: number;
  blocksPerDay: number;
}

const findRowAtOrBefore = async (targetTimestamp: Date) => {
  // Find the insights_supply row whose joined block timestamp is closest <=
  // target. We do max(height) over rows joined where ts <= target.
  return pindexerDb
    .selectFrom('insights_supply')
    .innerJoin('block_details', 'block_details.height', 'insights_supply.height')
    .select([
      'insights_supply.height as height',
      'insights_supply.total as total',
      'block_details.timestamp as timestamp',
    ])
    .where('block_details.timestamp', '<=', targetTimestamp)
    .orderBy('block_details.timestamp', 'desc')
    .limit(1)
    .executeTakeFirst();
};

export async function fetchTokenomicsMetrics(): Promise<TokenomicsMetrics> {
  // Run the independent queries in parallel.
  const [latestSupply, latestUnstaked, summary24h, supply30dAgo] = await Promise.all([
    pindexerDb
      .selectFrom('insights_supply')
      .select(['height', 'total', 'staked', 'market_cap', 'price'])
      .orderBy('height', 'desc')
      .limit(1)
      .executeTakeFirst(),
    pindexerDb
      .selectFrom('supply_total_unstaked')
      .select(['height', 'um', 'auction', 'dex', 'arb', 'fees'])
      .orderBy('height', 'desc')
      .limit(1)
      .executeTakeFirst(),
    pindexerDb
      .selectFrom('dex_ex_aggregate_summary')
      .select(['direct_volume', 'trades'])
      .where('the_window', '=', '1d')
      .executeTakeFirst(),
    findRowAtOrBefore(new Date(Date.now() - 30 * SECONDS_PER_DAY * 1000)),
  ]);

  if (!latestSupply) {
    throw new Error('insights_supply is empty — pindexer not caught up?');
  }

  const totalSupply = toUM(latestSupply.total);
  const stakedSupply = toUM(latestSupply.staked);
  const stakedPct = totalSupply > 0 ? (stakedSupply / totalSupply) * 100 : 0;
  // insights_supply.market_cap is stored in upenumbra atomic units of price ×
  // supply, so divide once like supply.
  const marketCapUsd = latestSupply.market_cap ? toUM(latestSupply.market_cap) : null;
  const priceUsd = latestSupply.price ?? null;

  const arbBurned = toUM(latestUnstaked?.arb ?? 0);
  // `fees` may be stored as a negative running counter; tokenomic uses |fees|.
  const feeBurned = Math.abs(toUM(latestUnstaked?.fees ?? 0));
  const totalBurned = arbBurned + feeBurned;
  const burnedPctOfEffective =
    totalSupply + totalBurned > 0 ? (totalBurned / (totalSupply + totalBurned)) * 100 : 0;

  const dexLocked = Math.abs(toUM(latestUnstaked?.dex ?? 0));
  const auctionLocked = toUM(latestUnstaked?.auction ?? 0);

  let annualizedInflationPct: number | null = null;
  if (supply30dAgo) {
    const past = toUM(supply30dAgo.total);
    if (past > 0) {
      const windowDays =
        (new Date().getTime() - new Date(supply30dAgo.timestamp).getTime()) /
        (1000 * SECONDS_PER_DAY);
      const windowChangePct = ((totalSupply - past) / past) * 100;
      // Annualize: scale the window rate to a 365d basis.
      annualizedInflationPct =
        windowDays > 0 ? windowChangePct * (365 / windowDays) : null;
    }
  }

  return {
    latestHeight: Number(latestSupply.height),
    totalSupply,
    stakedSupply,
    stakedPct,
    priceUsd,
    marketCapUsd,
    arbBurned,
    feeBurned,
    totalBurned,
    burnedPctOfEffective,
    dexLocked,
    auctionLocked,
    annualizedInflationPct,
    dexVolume24h: summary24h ? toUM(summary24h.direct_volume) : null,
    trades24h: summary24h?.trades ?? null,
    // Without a per-window cumulative-burn aggregate we approximate "24h
    // burned" as 1/365 of cumulative annualized; better to leave null than
    // serve a misleading number.
    burned24h: null,
    genesisAllocation: 95_316_205, // mainnet genesis allocation ≈ 95.3M UM
    blocksPerDay: BLOCKS_PER_DAY,
  };
}
