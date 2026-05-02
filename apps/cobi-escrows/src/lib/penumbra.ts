// Penumbra wallet integration via Prax
// Using @penumbra-zone/client for wallet connection

const PRAX_MANIFEST_URL = 'https://chrome.google.com/webstore/detail/prax-wallet/lkpmkhpnhknhmibgnmmhdhgdilepfghe';

export interface PenumbraProvider {
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  getAddress: () => Promise<string>;
  signTransaction: (tx: Uint8Array) => Promise<Uint8Array>;
}

// Check if Prax is installed
export function isPraxInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(window as any).penumbra;
}

// Get Prax provider
export async function getPraxProvider(): Promise<PenumbraProvider | null> {
  if (!isPraxInstalled()) {
    return null;
  }
  return (window as any).penumbra;
}

// Connect to Prax wallet
export async function connectPrax(): Promise<string | null> {
  const provider = await getPraxProvider();
  if (!provider) {
    throw new Error(`Prax wallet not found. Install from: ${PRAX_MANIFEST_URL}`);
  }

  try {
    await provider.connect();
    const address = await provider.getAddress();
    return address;
  } catch (e) {
    console.error('Prax connection error:', e);
    throw e;
  }
}

// Format Penumbra address for display
export function formatPenumbraAddress(addr: string): string {
  if (addr.length <= 20) return addr;
  return `${addr.slice(0, 12)}...${addr.slice(-8)}`;
}

// Validate Penumbra address (bech32m format)
export function isValidPenumbraAddress(addr: string): boolean {
  return addr.startsWith('penumbra1') && addr.length > 50;
}
