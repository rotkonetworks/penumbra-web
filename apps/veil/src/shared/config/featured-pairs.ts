/**
 * Featured / healthy trading-pair policy for the Rotko-operated veil DEX.
 *
 * While IBC channels/clients for bridged assets are being (re)deployed, we want
 * the UI to steer users toward the markets we can actually settle, and to visibly
 * de-emphasize pairs whose bridge is currently paused.
 *
 * This is intentionally a single, static source of truth: to re-enable a pair,
 * add its asset symbol to HEALTHY_SYMBOLS (or flip BRIDGES_PAUSED to false to
 * drop the de-emphasis entirely). No other file needs to change.
 */

/** Master switch. When false, every pair is treated as healthy (normal UI). */
export const BRIDGES_PAUSED = true;

/**
 * The pair a fresh visitor lands on at /trade (no last-viewed cookie).
 * Direction is primary/numeraire — UM is the primary, USDC the numeraire —
 * matching the app's PRIORITIES convention (USDC is the higher-priority quote).
 * This is also the highest-trading-volume market on penumbra-1.
 */
export const DEFAULT_PAIR = { base: 'UM', quote: 'USDC' } as const;

/**
 * Assets whose settlement path is currently reliable: UM is native, and USDC /
 * USDY are the stablecoin markets we are keeping live. A pair is "healthy" only
 * if BOTH of its assets are in this set. Symbols are compared upper-cased.
 */
export const HEALTHY_SYMBOLS: readonly string[] = ['UM', 'USDC', 'USDY'];

const norm = (s: string | undefined): string => (s ?? '').toUpperCase();

/** True if this pair should be shown at full prominence (not bridge-paused). */
export const isPairHealthy = (baseSymbol?: string, quoteSymbol?: string): boolean => {
  if (!BRIDGES_PAUSED) {
    return true;
  }
  return HEALTHY_SYMBOLS.includes(norm(baseSymbol)) && HEALTHY_SYMBOLS.includes(norm(quoteSymbol));
};

/** User-facing note shown on de-emphasized pairs. */
export const BRIDGE_PAUSED_LABEL = 'Bridging paused';
export const BRIDGE_PAUSED_TOOLTIP =
  'The IBC bridge for one of these assets is temporarily paused while we redeploy channels and clients. Trades may not settle until it is restored.';
