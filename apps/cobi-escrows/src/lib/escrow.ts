import { createPublicClient, createWalletClient, http, custom, keccak256, toHex, encodeAbiParameters, parseAbiParameters } from 'viem';
import { CHAIN_CONFIG, ESCROW_CONTRACT, ESCROW_ABI, EscrowState } from './config';

// Define chain for viem
const paseoAssetHub = {
  id: CHAIN_CONFIG.chainId,
  name: CHAIN_CONFIG.name,
  nativeCurrency: CHAIN_CONFIG.currency,
  rpcUrls: {
    default: { http: [CHAIN_CONFIG.rpcUrl] },
  },
} as const;

// Public client for reading
export const publicClient = createPublicClient({
  chain: paseoAssetHub,
  transport: http(),
});

// Create wallet client from window.ethereum
export async function getWalletClient() {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('No wallet found');
  }

  return createWalletClient({
    chain: paseoAssetHub,
    transport: custom(window.ethereum),
  });
}

// Request wallet connection
export async function connectWallet(): Promise<string> {
  if (!window.ethereum) {
    throw new Error('No Ethereum wallet found. Please install MetaMask.');
  }

  const accounts = await window.ethereum.request({
    method: 'eth_requestAccounts',
  });

  // Switch to Paseo Asset Hub
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: toHex(CHAIN_CONFIG.chainId) }],
    });
  } catch (switchError: any) {
    // Chain not added, add it
    if (switchError.code === 4902) {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: toHex(CHAIN_CONFIG.chainId),
          chainName: CHAIN_CONFIG.name,
          rpcUrls: [CHAIN_CONFIG.rpcUrl],
          nativeCurrency: CHAIN_CONFIG.currency,
        }],
      });
    }
  }

  return accounts[0];
}

// Generate escrow ID from seller address and nonce
export function generateEscrowId(seller: string, nonce: bigint): `0x${string}` {
  const encoded = encodeAbiParameters(
    parseAbiParameters('address, uint256'),
    [seller as `0x${string}`, nonce]
  );
  return keccak256(encoded);
}

// Create escrow on chain (new 4-param version)
export async function createEscrow(
  escrowId: `0x${string}`,
  commitment: `0x${string}`,
  escrowPubkey: `0x${string}`,
  shareC: `0x${string}`
): Promise<`0x${string}`> {
  const walletClient = await getWalletClient();
  const [account] = await walletClient.getAddresses();

  const hash = await walletClient.sendTransaction({
    account,
    to: ESCROW_CONTRACT,
    data: encodeCreateEscrow(escrowId, commitment, escrowPubkey, shareC),
  });

  return hash;
}

// Encode createEscrow call (4 params: escrowId, commitment, escrowPubkey, shareC)
function encodeCreateEscrow(
  escrowId: `0x${string}`,
  commitment: `0x${string}`,
  escrowPubkey: `0x${string}`,
  shareC: `0x${string}`
): `0x${string}` {
  // Function selector: keccak256("createEscrow(bytes32,bytes32,bytes32,bytes32)")[:4]
  const selector = keccak256(toHex('createEscrow(bytes32,bytes32,bytes32,bytes32)')).slice(0, 10);
  const params = encodeAbiParameters(
    parseAbiParameters('bytes32, bytes32, bytes32, bytes32'),
    [escrowId, commitment, escrowPubkey, shareC]
  ).slice(2);
  return (selector + params) as `0x${string}`;
}

// Confirm escrow (buyer joins by calling this - caller becomes buyer)
export async function confirmEscrow(
  escrowId: `0x${string}`
): Promise<`0x${string}`> {
  const walletClient = await getWalletClient();
  const [account] = await walletClient.getAddresses();

  const selector = keccak256(toHex('confirmEscrow(bytes32)')).slice(0, 10);
  const params = encodeAbiParameters(
    parseAbiParameters('bytes32'),
    [escrowId]
  ).slice(2);

  return walletClient.sendTransaction({
    account,
    to: ESCROW_CONTRACT,
    data: (selector + params) as `0x${string}`,
  });
}

// Mark payment sent (buyer)
export async function markPaymentSent(escrowId: `0x${string}`): Promise<`0x${string}`> {
  const walletClient = await getWalletClient();
  const [account] = await walletClient.getAddresses();

  const selector = keccak256(toHex('markPaymentSent(bytes32)')).slice(0, 10);
  const params = encodeAbiParameters(
    parseAbiParameters('bytes32'),
    [escrowId]
  ).slice(2);

  return walletClient.sendTransaction({
    account,
    to: ESCROW_CONTRACT,
    data: (selector + params) as `0x${string}`,
  });
}

// Confirm payment (seller releases)
export async function confirmPayment(escrowId: `0x${string}`): Promise<`0x${string}`> {
  const walletClient = await getWalletClient();
  const [account] = await walletClient.getAddresses();

  const selector = keccak256(toHex('confirmPayment(bytes32)')).slice(0, 10);
  const params = encodeAbiParameters(
    parseAbiParameters('bytes32'),
    [escrowId]
  ).slice(2);

  return walletClient.sendTransaction({
    account,
    to: ESCROW_CONTRACT,
    data: (selector + params) as `0x${string}`,
  });
}

// Dispute escrow
export async function dispute(escrowId: `0x${string}`): Promise<`0x${string}`> {
  const walletClient = await getWalletClient();
  const [account] = await walletClient.getAddresses();

  const selector = keccak256(toHex('dispute(bytes32)')).slice(0, 10);
  const params = encodeAbiParameters(
    parseAbiParameters('bytes32'),
    [escrowId]
  ).slice(2);

  return walletClient.sendTransaction({
    account,
    to: ESCROW_CONTRACT,
    data: (selector + params) as `0x${string}`,
  });
}

export interface EscrowInfo {
  seller: `0x${string}`;
  buyer: `0x${string}`;
  commitment: `0x${string}`;
  escrowPubkey: `0x${string}`;
  state: EscrowState;
}

// Get escrow info (read-only)
export async function getEscrow(escrowId: `0x${string}`): Promise<EscrowInfo | null> {
  try {
    const selector = keccak256(toHex('getEscrow(bytes32)')).slice(0, 10);
    const params = encodeAbiParameters(
      parseAbiParameters('bytes32'),
      [escrowId]
    ).slice(2);

    const result = await publicClient.call({
      to: ESCROW_CONTRACT,
      data: (selector + params) as `0x${string}`,
    });

    if (!result.data || result.data === '0x') {
      return null;
    }

    // Decode response: (address, address, bytes32, bytes32, uint8)
    // For now, return mock until we debug the contract storage
    return null;
  } catch (e) {
    console.error('getEscrow error:', e);
    return null;
  }
}

// Declare ethereum on window
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on: (event: string, handler: (...args: any[]) => void) => void;
    };
  }
}
