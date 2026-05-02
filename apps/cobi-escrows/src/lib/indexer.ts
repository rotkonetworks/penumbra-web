import { createPublicClient, http, parseAbiItem, type Log, type Address } from 'viem';
import { CHAIN_CONFIG, ESCROW_CONTRACT } from './config';

// Event signatures for the escrow contract
const EVENTS = {
  EscrowCreated: parseAbiItem('event EscrowCreated(bytes32 indexed escrowId, address indexed seller, bytes32 commitment, bytes32 escrowPubkey)'),
  BuyerJoined: parseAbiItem('event BuyerJoined(bytes32 indexed escrowId, address indexed buyer)'),
  PaymentSent: parseAbiItem('event PaymentSent(bytes32 indexed escrowId, address indexed buyer)'),
  PaymentConfirmed: parseAbiItem('event PaymentConfirmed(bytes32 indexed escrowId, address indexed seller)'),
  DisputeOpened: parseAbiItem('event DisputeOpened(bytes32 indexed escrowId, address indexed initiator)'),
  DisputeResolved: parseAbiItem('event DisputeResolved(bytes32 indexed escrowId, address indexed winner, bytes32 shareC)'),
};

// Escrow states matching the contract
export enum EscrowState {
  Created = 0,
  BuyerConfirmed = 1,
  PaymentSent = 2,
  Completed = 3,
  Disputed = 4,
  ResolvedBuyer = 5,
  ResolvedSeller = 6,
}

export interface Escrow {
  escrowId: `0x${string}`;
  seller: Address;
  buyer?: Address;
  commitment: `0x${string}`;
  escrowPubkey: `0x${string}`;
  state: EscrowState;
  shareC?: `0x${string}`; // Revealed only on dispute resolution
  createdBlock: bigint;
  lastUpdatedBlock: bigint;
}

export interface EscrowEvent {
  type: 'created' | 'buyer_joined' | 'payment_sent' | 'payment_confirmed' | 'dispute_opened' | 'dispute_resolved';
  escrowId: `0x${string}`;
  blockNumber: bigint;
  transactionHash: `0x${string}`;
  data: Record<string, unknown>;
}

// In-memory escrow store
const escrows = new Map<string, Escrow>();
const eventHistory: EscrowEvent[] = [];
let lastIndexedBlock = 0n;

export function getPublicClient() {
  return createPublicClient({
    transport: http(CHAIN_CONFIG.rpcUrl),
  });
}

// Process EscrowCreated event
function processEscrowCreated(log: Log<bigint, number, false, typeof EVENTS.EscrowCreated>) {
  const { escrowId, seller, commitment, escrowPubkey } = log.args as any;

  escrows.set(escrowId, {
    escrowId,
    seller,
    commitment,
    escrowPubkey,
    state: EscrowState.Created,
    createdBlock: log.blockNumber!,
    lastUpdatedBlock: log.blockNumber!,
  });

  eventHistory.push({
    type: 'created',
    escrowId,
    blockNumber: log.blockNumber!,
    transactionHash: log.transactionHash!,
    data: { seller, commitment, escrowPubkey },
  });
}

// Process BuyerJoined event
function processBuyerJoined(log: Log<bigint, number, false, typeof EVENTS.BuyerJoined>) {
  const { escrowId, buyer } = log.args as any;

  const escrow = escrows.get(escrowId);
  if (escrow) {
    escrow.buyer = buyer;
    escrow.state = EscrowState.BuyerConfirmed;
    escrow.lastUpdatedBlock = log.blockNumber!;
  }

  eventHistory.push({
    type: 'buyer_joined',
    escrowId,
    blockNumber: log.blockNumber!,
    transactionHash: log.transactionHash!,
    data: { buyer },
  });
}

// Process PaymentSent event
function processPaymentSent(log: Log<bigint, number, false, typeof EVENTS.PaymentSent>) {
  const { escrowId, buyer } = log.args as any;

  const escrow = escrows.get(escrowId);
  if (escrow) {
    escrow.state = EscrowState.PaymentSent;
    escrow.lastUpdatedBlock = log.blockNumber!;
  }

  eventHistory.push({
    type: 'payment_sent',
    escrowId,
    blockNumber: log.blockNumber!,
    transactionHash: log.transactionHash!,
    data: { buyer },
  });
}

// Process PaymentConfirmed event
function processPaymentConfirmed(log: Log<bigint, number, false, typeof EVENTS.PaymentConfirmed>) {
  const { escrowId, seller } = log.args as any;

  const escrow = escrows.get(escrowId);
  if (escrow) {
    escrow.state = EscrowState.Completed;
    escrow.lastUpdatedBlock = log.blockNumber!;
  }

  eventHistory.push({
    type: 'payment_confirmed',
    escrowId,
    blockNumber: log.blockNumber!,
    transactionHash: log.transactionHash!,
    data: { seller },
  });
}

// Process DisputeOpened event
function processDisputeOpened(log: Log<bigint, number, false, typeof EVENTS.DisputeOpened>) {
  const { escrowId, initiator } = log.args as any;

  const escrow = escrows.get(escrowId);
  if (escrow) {
    escrow.state = EscrowState.Disputed;
    escrow.lastUpdatedBlock = log.blockNumber!;
  }

  eventHistory.push({
    type: 'dispute_opened',
    escrowId,
    blockNumber: log.blockNumber!,
    transactionHash: log.transactionHash!,
    data: { initiator },
  });
}

// Process DisputeResolved event
function processDisputeResolved(log: Log<bigint, number, false, typeof EVENTS.DisputeResolved>) {
  const { escrowId, winner, shareC } = log.args as any;

  const escrow = escrows.get(escrowId);
  if (escrow) {
    // Determine if winner is buyer or seller
    escrow.state = escrow.buyer === winner ? EscrowState.ResolvedBuyer : EscrowState.ResolvedSeller;
    escrow.shareC = shareC;
    escrow.lastUpdatedBlock = log.blockNumber!;
  }

  eventHistory.push({
    type: 'dispute_resolved',
    escrowId,
    blockNumber: log.blockNumber!,
    transactionHash: log.transactionHash!,
    data: { winner, shareC },
  });
}

// Fetch and process logs from a block range
async function indexBlockRange(fromBlock: bigint, toBlock: bigint) {
  const client = getPublicClient();

  // Fetch all event types in parallel
  const [created, joined, sent, confirmed, disputed, resolved] = await Promise.all([
    client.getLogs({
      address: ESCROW_CONTRACT as Address,
      event: EVENTS.EscrowCreated,
      fromBlock,
      toBlock,
    }),
    client.getLogs({
      address: ESCROW_CONTRACT as Address,
      event: EVENTS.BuyerJoined,
      fromBlock,
      toBlock,
    }),
    client.getLogs({
      address: ESCROW_CONTRACT as Address,
      event: EVENTS.PaymentSent,
      fromBlock,
      toBlock,
    }),
    client.getLogs({
      address: ESCROW_CONTRACT as Address,
      event: EVENTS.PaymentConfirmed,
      fromBlock,
      toBlock,
    }),
    client.getLogs({
      address: ESCROW_CONTRACT as Address,
      event: EVENTS.DisputeOpened,
      fromBlock,
      toBlock,
    }),
    client.getLogs({
      address: ESCROW_CONTRACT as Address,
      event: EVENTS.DisputeResolved,
      fromBlock,
      toBlock,
    }),
  ]);

  // Combine and sort by block number and log index
  const allLogs = [
    ...created.map(l => ({ log: l, process: () => processEscrowCreated(l) })),
    ...joined.map(l => ({ log: l, process: () => processBuyerJoined(l) })),
    ...sent.map(l => ({ log: l, process: () => processPaymentSent(l) })),
    ...confirmed.map(l => ({ log: l, process: () => processPaymentConfirmed(l) })),
    ...disputed.map(l => ({ log: l, process: () => processDisputeOpened(l) })),
    ...resolved.map(l => ({ log: l, process: () => processDisputeResolved(l) })),
  ].sort((a, b) => {
    if (a.log.blockNumber! !== b.log.blockNumber!) {
      return Number(a.log.blockNumber! - b.log.blockNumber!);
    }
    return a.log.logIndex! - b.log.logIndex!;
  });

  // Process in order
  for (const { process } of allLogs) {
    process();
  }

  lastIndexedBlock = toBlock;
  return allLogs.length;
}

// Initial sync from genesis or specific block
export async function syncFromBlock(startBlock: bigint = 0n, batchSize = 10000n) {
  const client = getPublicClient();
  const currentBlock = await client.getBlockNumber();

  let fromBlock = startBlock;
  let totalEvents = 0;

  while (fromBlock <= currentBlock) {
    const toBlock = fromBlock + batchSize > currentBlock ? currentBlock : fromBlock + batchSize;
    const count = await indexBlockRange(fromBlock, toBlock);
    totalEvents += count;
    console.log(`Indexed blocks ${fromBlock}-${toBlock}, found ${count} events`);
    fromBlock = toBlock + 1n;
  }

  return { escrowCount: escrows.size, eventCount: totalEvents, lastBlock: lastIndexedBlock };
}

// Subscribe to new events
export async function watchNewEvents(onEvent?: (event: EscrowEvent) => void) {
  const client = getPublicClient();

  // Create watchers for each event type
  const unwatchers = [
    client.watchEvent({
      address: ESCROW_CONTRACT as Address,
      event: EVENTS.EscrowCreated,
      onLogs: (logs) => {
        for (const log of logs) {
          processEscrowCreated(log);
          const event = eventHistory[eventHistory.length - 1];
          onEvent?.(event);
        }
      },
    }),
    client.watchEvent({
      address: ESCROW_CONTRACT as Address,
      event: EVENTS.BuyerJoined,
      onLogs: (logs) => {
        for (const log of logs) {
          processBuyerJoined(log);
          const event = eventHistory[eventHistory.length - 1];
          onEvent?.(event);
        }
      },
    }),
    client.watchEvent({
      address: ESCROW_CONTRACT as Address,
      event: EVENTS.PaymentSent,
      onLogs: (logs) => {
        for (const log of logs) {
          processPaymentSent(log);
          const event = eventHistory[eventHistory.length - 1];
          onEvent?.(event);
        }
      },
    }),
    client.watchEvent({
      address: ESCROW_CONTRACT as Address,
      event: EVENTS.PaymentConfirmed,
      onLogs: (logs) => {
        for (const log of logs) {
          processPaymentConfirmed(log);
          const event = eventHistory[eventHistory.length - 1];
          onEvent?.(event);
        }
      },
    }),
    client.watchEvent({
      address: ESCROW_CONTRACT as Address,
      event: EVENTS.DisputeOpened,
      onLogs: (logs) => {
        for (const log of logs) {
          processDisputeOpened(log);
          const event = eventHistory[eventHistory.length - 1];
          onEvent?.(event);
        }
      },
    }),
    client.watchEvent({
      address: ESCROW_CONTRACT as Address,
      event: EVENTS.DisputeResolved,
      onLogs: (logs) => {
        for (const log of logs) {
          processDisputeResolved(log);
          const event = eventHistory[eventHistory.length - 1];
          onEvent?.(event);
        }
      },
    }),
  ];

  // Return unwatch function
  return () => {
    for (const unwatch of unwatchers) {
      unwatch();
    }
  };
}

// Query functions
export function getAllEscrows(): Escrow[] {
  return Array.from(escrows.values());
}

export function getEscrow(escrowId: string): Escrow | undefined {
  return escrows.get(escrowId);
}

export function getEscrowsByAddress(address: Address): Escrow[] {
  const lowerAddr = address.toLowerCase();
  return Array.from(escrows.values()).filter(
    e => e.seller.toLowerCase() === lowerAddr || e.buyer?.toLowerCase() === lowerAddr
  );
}

export function getEscrowsBySeller(seller: Address): Escrow[] {
  const lowerAddr = seller.toLowerCase();
  return Array.from(escrows.values()).filter(
    e => e.seller.toLowerCase() === lowerAddr
  );
}

export function getEscrowsByBuyer(buyer: Address): Escrow[] {
  const lowerAddr = buyer.toLowerCase();
  return Array.from(escrows.values()).filter(
    e => e.buyer?.toLowerCase() === lowerAddr
  );
}

export function getEscrowsByState(state: EscrowState): Escrow[] {
  return Array.from(escrows.values()).filter(e => e.state === state);
}

export function getActiveEscrows(): Escrow[] {
  return Array.from(escrows.values()).filter(
    e => e.state !== EscrowState.Completed &&
         e.state !== EscrowState.ResolvedBuyer &&
         e.state !== EscrowState.ResolvedSeller
  );
}

export function getEventHistory(limit = 100): EscrowEvent[] {
  return eventHistory.slice(-limit);
}

export function getEscrowEvents(escrowId: string): EscrowEvent[] {
  return eventHistory.filter(e => e.escrowId === escrowId);
}

// State name helper
export function getStateName(state: EscrowState): string {
  const names = {
    [EscrowState.Created]: 'Created',
    [EscrowState.BuyerConfirmed]: 'Buyer Confirmed',
    [EscrowState.PaymentSent]: 'Payment Sent',
    [EscrowState.Completed]: 'Completed',
    [EscrowState.Disputed]: 'Disputed',
    [EscrowState.ResolvedBuyer]: 'Resolved (Buyer Won)',
    [EscrowState.ResolvedSeller]: 'Resolved (Seller Won)',
  };
  return names[state] ?? 'Unknown';
}
