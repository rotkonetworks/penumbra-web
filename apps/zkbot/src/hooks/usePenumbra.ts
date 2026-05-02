import { create } from 'zustand';

// Penumbra provider manifest
const PRAX_ORIGIN = 'chrome-extension://lkpmkhpnhknhmibgnmmhdhgdilepfghe';

interface PenumbraState {
  connected: boolean;
  address: string | null;
  balances: Array<{ denom: string; amount: string }>;
  connecting: boolean;
  error: string | null;

  connect: () => Promise<void>;
  disconnect: () => void;
  refreshBalances: () => Promise<void>;
}

// Check if Prax extension is available
const getPenumbraProvider = () => {
  if (typeof window === 'undefined') return null;
  // @ts-ignore - Penumbra provider injected by Prax
  return window[PRAX_ORIGIN] || window.penumbra;
};

export const usePenumbra = create<PenumbraState>((set, get) => ({
  connected: false,
  address: null,
  balances: [],
  connecting: false,
  error: null,

  connect: async () => {
    set({ connecting: true, error: null });

    try {
      const provider = getPenumbraProvider();

      if (!provider) {
        // Try direct gRPC connection for testing
        set({
          connecting: false,
          error: 'Prax wallet not detected. Install from chrome web store.',
        });
        return;
      }

      // Request connection to Prax
      await provider.request({ method: 'connect' });

      // Get address
      const addressResponse = await provider.request({
        method: 'penumbra_getAddress',
        params: { addressIndex: 0 },
      });

      set({
        connected: true,
        address: addressResponse?.address || 'Connected',
        connecting: false,
      });

      // Fetch balances
      await get().refreshBalances();

    } catch (err: any) {
      set({
        connecting: false,
        error: err.message || 'Failed to connect to Penumbra wallet',
      });
    }
  },

  disconnect: () => {
    set({
      connected: false,
      address: null,
      balances: [],
      error: null,
    });
  },

  refreshBalances: async () => {
    try {
      const provider = getPenumbraProvider();
      if (!provider || !get().connected) return;

      const balancesResponse = await provider.request({
        method: 'penumbra_getBalances',
      });

      set({
        balances: balancesResponse?.balances || [],
      });
    } catch (err) {
      console.error('Failed to fetch balances:', err);
    }
  },
}));

// Direct gRPC client for when wallet isn't available (dev/testing)
export async function queryPenumbraGrpc(grpcUrl: string = 'http://localhost:8080') {
  try {
    const response = await fetch(`${grpcUrl}/penumbra.view.v1.ViewService/Status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/grpc-web+proto',
      },
    });
    return { connected: response.ok };
  } catch {
    return { connected: false };
  }
}
