// Curated set of Cosmos chains Penumbra has IBC connections to. Importing
// per-chain instead of the `chain-registry` barrel saves ~3-4MB of bundle
// (the barrel contains all ~250 Cosmos chains, each with their assets +
// IBC + chain metadata).
//
// Adding a new chain: add the import + entry below, AND ensure Penumbra
// has an IBC connection in its registry. The runtime filter in
// chain-provider.tsx will hide chains that have no live connection.

import * as axelar from 'chain-registry/mainnet/axelar';
import * as celestia from 'chain-registry/mainnet/celestia';
import * as cosmoshub from 'chain-registry/mainnet/cosmoshub';
import * as dydx from 'chain-registry/mainnet/dydx';
import * as injective from 'chain-registry/mainnet/injective';
import * as neutron from 'chain-registry/mainnet/neutron';
import * as noble from 'chain-registry/mainnet/noble';
import * as osmosis from 'chain-registry/mainnet/osmosis';
import * as stride from 'chain-registry/mainnet/stride';

import type { Chain, AssetList } from '@chain-registry/types';

export const SUPPORTED_CHAINS: Chain[] = [
  axelar.chain,
  celestia.chain,
  cosmoshub.chain,
  dydx.chain,
  injective.chain,
  neutron.chain,
  noble.chain,
  osmosis.chain,
  stride.chain,
];

export const SUPPORTED_ASSETS: AssetList[] = [
  axelar.assets,
  celestia.assets,
  cosmoshub.assets,
  dydx.assets,
  injective.assets,
  neutron.assets,
  noble.assets,
  osmosis.assets,
  stride.assets,
];
