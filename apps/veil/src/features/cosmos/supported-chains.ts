// Cosmos chains Penumbra exposes for IBC in veil. Scoped to Noble only for now:
// Noble is Circle's USDC issuance + CCTP hub in Cosmos, so it is the single
// gateway for the assets we support (USDC / USDY, plus native UM staying in
// Penumbra). Shield in from Noble, hold private, unshield back to Noble, then
// offramp on the Noble side. Penumbra also enforces "unshield only to the
// asset's source chain", so Noble-sourced assets can only return to Noble anyway.
//
// Importing per-chain instead of the `chain-registry` barrel saves ~3-4MB of
// bundle (the barrel contains all ~250 Cosmos chains).
//
// Re-enabling a chain: add its import + entry to both arrays below, AND ensure
// Penumbra has a live IBC connection (chain-provider.tsx filters out chains
// with no connection at runtime).

import * as noble from 'chain-registry/mainnet/noble';

import type { Chain, AssetList } from '@chain-registry/types';

export const SUPPORTED_CHAINS: Chain[] = [noble.chain];

export const SUPPORTED_ASSETS: AssetList[] = [noble.assets];
