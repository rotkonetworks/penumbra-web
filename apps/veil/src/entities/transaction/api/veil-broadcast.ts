import { Transaction } from '@penumbra-zone/protobuf/penumbra/core/transaction/v1/transaction_pb';
import { uint8ArrayToBase64 } from '@penumbra-zone/types/base64';
import { uint8ArrayToHex } from '@penumbra-zone/types/hex';
import type {
  BroadcastApiResponse,
  BroadcastApiSuccess,
} from '@/shared/api/server/broadcast';
import { txToId } from '../model/tx-to-id';

export interface VeilBroadcastResult {
  txHash: string;
  detectionHeight?: bigint;
}

const isSuccess = (json: BroadcastApiResponse): json is BroadcastApiSuccess => 'hash' in json;

const POLL_INTERVAL_MS = 2_000;
const POLL_TIMEOUT_MS = 60_000;

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

const pollDetection = async (txHash: string, signal?: AbortSignal): Promise<bigint | undefined> => {
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (signal?.aborted) {
      return undefined;
    }
    try {
      const res = await fetch(`/api/transactions/${txHash}`, { signal });
      if (res.ok) {
        const data = (await res.json()) as { tx: string; height: number | string };
        return BigInt(data.height);
      }
    } catch {
      /* empty */
    }
    await sleep(POLL_INTERVAL_MS);
  }
  return undefined;
};

export const veilBroadcastTransaction = async (
  transaction: Transaction,
  options: {
    awaitDetection: boolean;
    onBroadcastSuccess?: (txHash: string) => void;
    signal?: AbortSignal;
  },
): Promise<VeilBroadcastResult> => {
  const expectedId = await txToId(transaction);
  const expectedHashHex = uint8ArrayToHex(expectedId.inner);
  const txBase64 = uint8ArrayToBase64(transaction.toBinary());

  const res = await fetch('/api/penumbra/broadcast', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tx: txBase64 }),
    signal: options.signal,
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `veil broadcast failed: HTTP ${res.status}`);
  }

  const body = (await res.json()) as BroadcastApiResponse;
  if (!isSuccess(body)) {
    throw new Error(body.error);
  }

  const returnedHashHex = body.hash.toLowerCase();
  if (returnedHashHex !== expectedHashHex) {
    throw new Error(
      `broadcast transaction id disagrees: expected ${expectedHashHex} but tendermint ${returnedHashHex}`,
    );
  }

  if (body.code !== 0) {
    throw new Error(
      `tendermint rejected transaction (code ${body.code}${body.codespace ? `/${body.codespace}` : ''}): ${body.log}`,
    );
  }

  options.onBroadcastSuccess?.(expectedHashHex);

  if (!options.awaitDetection) {
    return { txHash: expectedHashHex };
  }

  const detectionHeight = await pollDetection(expectedHashHex, options.signal);
  return { txHash: expectedHashHex, detectionHeight };
};
