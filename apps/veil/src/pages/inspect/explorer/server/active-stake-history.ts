'use server';

import { sql } from 'kysely';
import { unstable_cache } from 'next/cache';
import { pindexerDb } from '@/shared/database/client';

const UM_UNIT = 1_000_000;
const toUM = (raw: bigint | number | string | null | undefined): number =>
  raw === null || raw === undefined ? 0 : Number(raw) / UM_UNIT;

// Cap the per-day validator breakdown the API returns so a year-wide
// window stays a manageable JSON payload. The chart tooltip only needs
// the "who moved the needle" — anything past the top handful is noise.
const FLOWS_TOP_N = 5;

export interface ValidatorFlow {
  /** Resolved validator name, falling back to ik if pindexer has no entry. */
  name: string;
  /** UM delegated to this validator on this day. */
  delegated: number;
  /** UM undelegated from this validator on this day. */
  undelegated: number;
}

export interface ActiveStakeFlowPoint {
  date: string; // ISO date
  /** Sum of delegations to currently-active validators at end-of-day. UM.
   *  The split between this and inactiveStake reflects *current* validator
   *  state, not historical — see fetchActiveStakeHistory's doc. */
  activeStake: number;
  /** Sum of delegations to bonded-but-not-active validators
   *  (JAILED / DISABLED / DEFINED — excludes TOMBSTONED which is slashed). UM. */
  inactiveStake: number;
  /** Total UM supply at end-of-day, from insights_supply. */
  totalSupply: number;
  /** Total amount delegated that day across all validators. UM. */
  delegated: number;
  /** Total amount undelegated that day. UM. */
  undelegated: number;
  /** delegated - undelegated. UM. */
  netFlow: number;
  /** Top contributors to the day's flows, by |delegated|+|undelegated|. */
  validatorFlows: ValidatorFlow[];
}

interface PerBucketDayRow {
  date: string;
  bucket: 'active' | 'inactive';
  um: bigint;
}

interface SupplyDayRow {
  date: string;
  supply: bigint | null;
}

interface DateValidatorRow {
  date: string;
  ik: string;
  name: string;
  amount: bigint;
}

/**
 * Per-day active stake + delegation/undelegation tx flows, with the
 * top validators that drove each day's flow.
 *
 * Active stake here = sum of supply_total_staked.um for validators that are
 * *currently* in the ACTIVE state. Pindexer's stake_validator_set table only
 * holds the latest validator state (no per-height history), so we make the
 * defensible approximation that membership in the active set has been stable
 * over the chart window. For 30-90 day windows this is mostly true on
 * Penumbra mainnet — validator churn is slow.
 *
 * supply_total_staked only writes a row when a validator's stake changes,
 * so for any given day many validators have no row at all. The stake query
 * must therefore carry forward each validator's last known um value rather
 * than reading the day's rows directly — otherwise quiet days collapse to
 * near-zero and the chart looks broken.
 *
 * Delegation/undelegation flows come from the per-tx tables and are summed
 * by day regardless of validator state, since you can delegate to (or
 * undelegate from) inactive validators too. Joined against
 * stake_validator_set for the human-readable name; falls back to ik when
 * pindexer hasn't seen that validator yet (rare for recently-active sets).
 */
async function fetchActiveStakeHistoryUncached(
  days: number,
): Promise<ActiveStakeFlowPoint[]> {
  const since = new Date(Date.now() - days * 86_400 * 1000);

  const [stakeRows, delegationRows, undelegationRows, supplyRows] = await Promise.all([
    sql<PerBucketDayRow>`
      WITH bonded_validators AS (
        SELECT
          id,
          CASE
            WHEN validator_state::jsonb->>'state' = 'VALIDATOR_STATE_ENUM_ACTIVE'
              THEN 'active'
            WHEN validator_state::jsonb->>'state' IN (
              'VALIDATOR_STATE_ENUM_JAILED',
              'VALIDATOR_STATE_ENUM_DISABLED',
              'VALIDATOR_STATE_ENUM_DEFINED'
            ) THEN 'inactive'
            ELSE NULL
          END AS bucket
        FROM stake_validator_set
        WHERE validator_state::jsonb->>'state' IN (
          'VALIDATOR_STATE_ENUM_ACTIVE',
          'VALIDATOR_STATE_ENUM_JAILED',
          'VALIDATOR_STATE_ENUM_DISABLED',
          'VALIDATOR_STATE_ENUM_DEFINED'
        )
      ),
      days AS (
        SELECT generate_series(
          date_trunc('day', ${since}::timestamp),
          date_trunc('day', now()),
          interval '1 day'
        ) AS day
      )
      SELECT
        to_char(d.day, 'YYYY-MM-DD') AS date,
        bv.bucket AS bucket,
        COALESCE(SUM(last_um.um), 0)::bigint AS um
      FROM days d
      CROSS JOIN bonded_validators bv
      LEFT JOIN LATERAL (
        SELECT sts.um
        FROM supply_total_staked sts
        JOIN block_details bd ON bd.height = sts.height
        WHERE sts.validator_id = bv.id
          AND bd.timestamp < d.day + interval '1 day'
        ORDER BY bd.height DESC
        LIMIT 1
      ) last_um ON true
      GROUP BY d.day, bv.bucket
      ORDER BY d.day ASC, bv.bucket
    `.execute(pindexerDb),

    sql<DateValidatorRow>`
      SELECT
        to_char(date_trunc('day', bd.timestamp), 'YYYY-MM-DD') AS date,
        txs.ik AS ik,
        COALESCE(vs.name, txs.ik) AS name,
        SUM(txs.amount)::bigint AS amount
      FROM stake_delegation_txs txs
      JOIN block_details bd ON bd.height = txs.height
      LEFT JOIN stake_validator_set vs ON vs.ik = txs.ik
      WHERE bd.timestamp >= ${since}
      GROUP BY date_trunc('day', bd.timestamp), txs.ik, vs.name
      ORDER BY date ASC, amount DESC
    `.execute(pindexerDb),

    sql<DateValidatorRow>`
      SELECT
        to_char(date_trunc('day', bd.timestamp), 'YYYY-MM-DD') AS date,
        txs.ik AS ik,
        COALESCE(vs.name, txs.ik) AS name,
        SUM(txs.amount)::bigint AS amount
      FROM stake_undelegation_txs txs
      JOIN block_details bd ON bd.height = txs.height
      LEFT JOIN stake_validator_set vs ON vs.ik = txs.ik
      WHERE bd.timestamp >= ${since}
      GROUP BY date_trunc('day', bd.timestamp), txs.ik, vs.name
      ORDER BY date ASC, amount DESC
    `.execute(pindexerDb),

    // End-of-day total UM supply from insights_supply, carry-forward
    // to fill gaps the same way the per-validator stake query does.
    sql<SupplyDayRow>`
      WITH days AS (
        SELECT generate_series(
          date_trunc('day', ${since}::timestamp),
          date_trunc('day', now()),
          interval '1 day'
        ) AS day
      )
      SELECT
        to_char(d.day, 'YYYY-MM-DD') AS date,
        last_supply.total AS supply
      FROM days d
      LEFT JOIN LATERAL (
        SELECT ins.total
        FROM insights_supply ins
        JOIN block_details bd ON bd.height = ins.height
        WHERE bd.timestamp < d.day + interval '1 day'
        ORDER BY bd.height DESC
        LIMIT 1
      ) last_supply ON true
      ORDER BY d.day ASC
    `.execute(pindexerDb),
  ]);

  const byDate = new Map<string, ActiveStakeFlowPoint>();
  // Per-day validator aggregation: date -> ik -> { name, delegated, undelegated }.
  // Keying by ik (not name) avoids merging two distinct validators that
  // happen to share a display name.
  const flowsByDate = new Map<string, Map<string, ValidatorFlow & { ik: string }>>();

  const point = (date: string): ActiveStakeFlowPoint => {
    let e = byDate.get(date);
    if (!e) {
      e = {
        date,
        activeStake: 0,
        inactiveStake: 0,
        totalSupply: 0,
        delegated: 0,
        undelegated: 0,
        netFlow: 0,
        validatorFlows: [],
      };
      byDate.set(date, e);
    }
    return e;
  };

  const flowFor = (date: string, ik: string, name: string): ValidatorFlow & { ik: string } => {
    let day = flowsByDate.get(date);
    if (!day) {
      day = new Map();
      flowsByDate.set(date, day);
    }
    let v = day.get(ik);
    if (!v) {
      v = { ik, name, delegated: 0, undelegated: 0 };
      day.set(ik, v);
    }
    return v;
  };

  for (const r of stakeRows.rows) {
    const p = point(r.date);
    if (r.bucket === 'active') p.activeStake = toUM(r.um);
    else if (r.bucket === 'inactive') p.inactiveStake = toUM(r.um);
  }
  for (const r of supplyRows.rows) {
    point(r.date).totalSupply = toUM(r.supply);
  }
  for (const r of delegationRows.rows) {
    const um = toUM(r.amount);
    const p = point(r.date);
    p.delegated += um;
    flowFor(r.date, r.ik, r.name).delegated += um;
  }
  for (const r of undelegationRows.rows) {
    const um = toUM(r.amount);
    const p = point(r.date);
    p.undelegated += um;
    flowFor(r.date, r.ik, r.name).undelegated += um;
  }
  for (const [date, day] of flowsByDate) {
    const top = Array.from(day.values())
      .sort((a, b) => Math.abs(b.delegated) + Math.abs(b.undelegated) - (Math.abs(a.delegated) + Math.abs(a.undelegated)))
      .slice(0, FLOWS_TOP_N)
      .map(({ name, delegated, undelegated }) => ({ name, delegated, undelegated }));
    point(date).validatorFlows = top;
  }
  for (const e of byDate.values()) {
    e.netFlow = e.delegated - e.undelegated;
  }

  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * The underlying SQL takes ~450ms for a 90-day window and ~5s for a 2y
 * window (one LATERAL lookup per validator-day pair). The data only
 * changes at epoch boundaries (~24h on Penumbra mainnet), so caching
 * for a half-hour costs nothing on freshness and saves every visitor
 * after the first the round-trip cost. Keyed by `days` so each range
 * preset gets its own slot.
 */
export const fetchActiveStakeHistory = unstable_cache(
  fetchActiveStakeHistoryUncached,
  ['active-stake-history'],
  { revalidate: 1800 },
);
