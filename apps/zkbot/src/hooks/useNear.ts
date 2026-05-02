import { create } from 'zustand';

interface NearConfig {
  networkId: string;
  nodeUrl: string;
  bridgeContract: string;
}

interface BridgeAsset {
  near_token: string;
  penumbra_denom: string;
  name: string;
  decimals: number;
  deposits_enabled: boolean;
  min_deposit: string;
}

interface NearState {
  connected: boolean;
  accountId: string | null;
  balance: string | null;
  bridgeTvl: Array<[string, string]>;
  bridgeAssets: BridgeAsset[];
  bridgePaused: boolean;
  config: NearConfig;
  connecting: boolean;
  error: string | null;

  setConfig: (config: Partial<NearConfig>) => void;
  connect: () => Promise<void>;
  disconnect: () => void;
  fetchBridgeStatus: () => Promise<void>;
  deposit: (amount: string, penumbraDestination: string) => Promise<{ depositId: number } | null>;
}

const DEFAULT_CONFIG: NearConfig = {
  networkId: 'localnet',
  nodeUrl: 'http://localhost:3030',
  bridgeContract: 'bridge.test.near',
};

// Simple JSON-RPC helper
async function rpcCall(nodeUrl: string, method: string, params: any) {
  const response = await fetch(nodeUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 'dontcare',
      method,
      params,
    }),
  });
  const json = await response.json();
  if (json.error) throw new Error(json.error.message || JSON.stringify(json.error));
  return json.result;
}

// View function call
async function viewFunction(nodeUrl: string, contractId: string, methodName: string, args: any = {}) {
  const result = await rpcCall(nodeUrl, 'query', {
    request_type: 'call_function',
    finality: 'final',
    account_id: contractId,
    method_name: methodName,
    args_base64: btoa(JSON.stringify(args)),
  });
  return JSON.parse(Buffer.from(result.result).toString());
}

export const useNear = create<NearState>((set, get) => ({
  connected: false,
  accountId: null,
  balance: null,
  bridgeTvl: [],
  bridgeAssets: [],
  bridgePaused: false,
  config: DEFAULT_CONFIG,
  connecting: false,
  error: null,

  setConfig: (newConfig) => {
    set({ config: { ...get().config, ...newConfig } });
  },

  connect: async () => {
    set({ connecting: true, error: null });

    try {
      const { nodeUrl } = get().config;

      // Check node status
      const status = await rpcCall(nodeUrl, 'status', []);

      set({
        connected: true,
        accountId: 'viewer', // Read-only for now
        connecting: false,
      });

      // Fetch bridge status
      await get().fetchBridgeStatus();

    } catch (err: any) {
      set({
        connecting: false,
        error: err.message || 'Failed to connect to NEAR',
      });
    }
  },

  disconnect: () => {
    set({
      connected: false,
      accountId: null,
      balance: null,
      bridgeTvl: [],
      bridgeAssets: [],
      error: null,
    });
  },

  fetchBridgeStatus: async () => {
    try {
      const { nodeUrl, bridgeContract } = get().config;

      const [tvl, assets, paused] = await Promise.all([
        viewFunction(nodeUrl, bridgeContract, 'get_all_tvl'),
        viewFunction(nodeUrl, bridgeContract, 'get_all_assets'),
        viewFunction(nodeUrl, bridgeContract, 'is_paused'),
      ]);

      set({
        bridgeTvl: tvl,
        bridgeAssets: assets,
        bridgePaused: paused,
      });
    } catch (err) {
      console.error('Failed to fetch bridge status:', err);
    }
  },

  deposit: async (amount: string, penumbraDestination: string) => {
    // This would require wallet signing
    // For now, return null - need wallet integration
    console.log('Deposit:', amount, 'to', penumbraDestination);
    return null;
  },
}));

// Helper to format NEAR amounts
export function formatNear(yoctoNear: string): string {
  const near = BigInt(yoctoNear) / BigInt(10 ** 24);
  const remainder = BigInt(yoctoNear) % BigInt(10 ** 24);
  const decimal = remainder.toString().padStart(24, '0').slice(0, 3);
  return `${near}.${decimal}`;
}
