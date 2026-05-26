'use server';

import { sql } from 'kysely';
import { pindexerDb } from '@/shared/database/client';

const UM_UNIT = 1_000_000;
const toUM = (raw: bigint | number | string | null | undefined): number =>
  raw === null || raw === undefined ? 0 : Number(raw) / UM_UNIT;

export interface ActiveStakeFlowPoint {
  date: string; // ISO date
  /** Sum of delegations to currently-active validators at end-of-day. UM. */
  activeStake: number;
  /** Total amount delegated that day across all validators. UM. */
  delegated: number;
  /** Total amount undelegated that day. UM. */
  undelegated: number;
  /** delegated - undelegated. UM. */
  netFlow: number;
}

interface DateRow {
  date: string;
  amount: bigint;
}

interface PerValidatorDayRow {
  date: string;
  um: bigint;
}

/**
 * Per-day active stake + delegation/undelegation tx flows.
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
 * undelegate from) inactive validators too.
 */
export async function fetchActiveStakeHistory(days = 90): Promise<ActiveStakeFlowPoint[]> {
  const since = new Date(Date.now() - days * 86_400 * 1000);

  // All three queries hit pindexer; raw SQL keeps Kysely's typed alias
  // inference out of the way for the slightly hairy joins/casts.
  const [stakeRows, delegationRows, undelegationRows] = await Promise.all([
    sql<PerValidatorDayRow>`
      WITH active_validators AS (
        SELECT id FROM stake_validator_set
        WHERE validator_state::jsonb->>'state' = 'VALIDATOR_STATE_ENUM_ACTIVE'
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
        COALESCE(SUM(last_um.um), 0)::bigint AS um
      FROM days d
      CROSS JOIN active_validators av
      LEFT JOIN LATERAL (
        SELECT sts.um
        FROM supply_total_staked sts
        JOIN block_details bd ON bd.height = sts.height
        WHERE sts.validator_id = av.id
          AND bd.timestamp < d.day + interval '1 day'
        ORDER BY bd.height DESC
        LIMIT 1
      ) last_um ON true
      GROUP BY d.day
      ORDER BY d.day ASC
    `.execute(pindexerDb),

    sql<DateRow>`
      SELECT
        to_char(date_trunc('day', bd.timestamp), 'YYYY-MM-DD') AS date,
        SUM(txs.amount)::bigint AS amount
      FROM stake_delegation_txs txs
      JOIN block_details bd ON bd.height = txs.height
      WHERE bd.timestamp >= ${since}
      GROUP BY date_trunc('day', bd.timestamp)
      ORDER BY date ASC
    `.execute(pindexerDb),

    sql<DateRow>`
      SELECT
        to_char(date_trunc('day', bd.timestamp), 'YYYY-MM-DD') AS date,
        SUM(txs.amount)::bigint AS amount
      FROM stake_undelegation_txs txs
      JOIN block_details bd ON bd.height = txs.height
      WHERE bd.timestamp >= ${since}
      GROUP BY date_trunc('day', bd.timestamp)
      ORDER BY date ASC
    `.execute(pindexerDb),
  ]);

  const byDate = new Map<string, ActiveStakeFlowPoint>();
  for (const r of stakeRows.rows) {
    byDate.set(r.date, {
      date: r.date,
      activeStake: toUM(r.um),
      delegated: 0,
      undelegated: 0,
      netFlow: 0,
    });
  }
  for (const r of delegationRows.rows) {
    const e = byDate.get(r.date);
    if (e) e.delegated = toUM(r.amount);
    else
      byDate.set(r.date, {
        date: r.date,
        activeStake: 0,
        delegated: toUM(r.amount),
        undelegated: 0,
        netFlow: 0,
      });
  }
  for (const r of undelegationRows.rows) {
    const e = byDate.get(r.date);
    if (e) e.undelegated = toUM(r.amount);
    else
      byDate.set(r.date, {
        date: r.date,
        activeStake: 0,
        delegated: 0,
        undelegated: toUM(r.amount),
        netFlow: 0,
      });
  }
  for (const e of byDate.values()) {
    e.netFlow = e.delegated - e.undelegated;
  }

  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
}
