// Paseo Asset Hub (Revive) configuration
export const CHAIN_CONFIG = {
  rpcUrl: 'https://eth-passet-hub-paseo.dotters.network',
  chainId: 420420421,
  name: 'Paseo Asset Hub',
  currency: {
    name: 'PAS',
    symbol: 'PAS',
    decimals: 18,
  },
};

// Deployed escrow contract (updated Dec 15, 2025)
export const ESCROW_CONTRACT = '0xe40dC8485142A4fb32356b958E05fE9a213A375E';

// Penumbra assets on mainnet
export const PENUMBRA_ASSETS = {
  UM: {
    denom: 'upenumbra',
    display: 'penumbra',
    symbol: 'UM',
    decimals: 6,
  },
  USDC: {
    // Noble USDC bridged to Penumbra
    denom: 'transfer/channel-4/uusdc',
    display: 'usdc',
    symbol: 'USDC',
    decimals: 6,
  },
};

// Contract ABI (Solidity-style interface for Revive v2)
export const ESCROW_ABI = [
  {
    name: 'createEscrow',
    type: 'function',
    inputs: [
      { name: 'escrowId', type: 'bytes32' },
      { name: 'commitment', type: 'bytes32' },
      { name: 'escrowPubkey', type: 'bytes32' },
      { name: 'shareC', type: 'bytes32' },
    ],
    outputs: [],
  },
  {
    name: 'confirmEscrow',
    type: 'function',
    inputs: [
      { name: 'escrowId', type: 'bytes32' },
    ],
    outputs: [],
  },
  {
    name: 'markPaymentSent',
    type: 'function',
    inputs: [{ name: 'escrowId', type: 'bytes32' }],
    outputs: [],
  },
  {
    name: 'confirmPayment',
    type: 'function',
    inputs: [{ name: 'escrowId', type: 'bytes32' }],
    outputs: [],
  },
  {
    name: 'dispute',
    type: 'function',
    inputs: [{ name: 'escrowId', type: 'bytes32' }],
    outputs: [],
  },
  {
    name: 'resolveDispute',
    type: 'function',
    inputs: [
      { name: 'escrowId', type: 'bytes32' },
      { name: 'toBuyer', type: 'bool' },
    ],
    outputs: [],
  },
  {
    name: 'getEscrow',
    type: 'function',
    inputs: [{ name: 'escrowId', type: 'bytes32' }],
    outputs: [
      { name: 'state', type: 'uint8' },
      { name: 'commitment', type: 'bytes32' },
      { name: 'escrowPubkey', type: 'bytes32' },
      { name: 'seller', type: 'address' },
      { name: 'buyer', type: 'address' },
    ],
  },
  {
    name: 'verifyShare',
    type: 'function',
    inputs: [
      { name: 'commitment', type: 'bytes32' },
      { name: 'index', type: 'uint8' },
      { name: 'shareValues', type: 'bytes32[8]' },
      { name: 'proof', type: 'bytes32[]' },
    ],
    outputs: [{ name: 'valid', type: 'bool' }],
  },
] as const;

// Event signatures for indexer
export const ESCROW_EVENTS = {
  EscrowCreated: 'EscrowCreated(bytes32,address,bytes32,bytes32)',
  BuyerJoined: 'BuyerJoined(bytes32,address)',
  PaymentSent: 'PaymentSent(bytes32,address)',
  PaymentConfirmed: 'PaymentConfirmed(bytes32,address)',
  DisputeOpened: 'DisputeOpened(bytes32,address)',
  DisputeResolved: 'DisputeResolved(bytes32,address,bytes32)',
};

// Escrow states matching contract
export enum EscrowState {
  Created = 0,
  BuyerConfirmed = 1,
  PaymentSent = 2,
  Completed = 3,
  Disputed = 4,
  ResolvedBuyer = 5,
  ResolvedSeller = 6,
}

// For backwards compat
export const Confirmed = EscrowState.BuyerConfirmed;
export const Resolved = EscrowState.ResolvedBuyer;

export const STATE_LABELS: Record<EscrowState, string> = {
  [EscrowState.Created]: 'Created',
  [EscrowState.BuyerConfirmed]: 'Buyer Confirmed',
  [EscrowState.PaymentSent]: 'Payment Sent',
  [EscrowState.Completed]: 'Completed',
  [EscrowState.Disputed]: 'Disputed',
  [EscrowState.ResolvedBuyer]: 'Resolved (Buyer)',
  [EscrowState.ResolvedSeller]: 'Resolved (Seller)',
};
