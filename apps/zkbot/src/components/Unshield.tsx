/**
 * Unshield Component - IBC Withdraw from Penumbra
 * Withdraws assets from shielded Penumbra balance to external chains
 */

import { createSignal, Show, For } from 'solid-js';
import { penumbraStore } from '../lib/penumbra';
import { Log, type LogEntry } from './Log';
import { ViewService } from '@penumbra-zone/protobuf';
import { TransactionPlannerRequest } from '@penumbra-zone/protobuf/penumbra/view/v1/view_pb';
import BigNumber from 'bignumber.js';

// Destination chains for IBC withdrawals
const DEST_CHAINS = [
  { id: 'osmosis-1', name: 'Osmosis', prefix: 'osmo', channel: 'channel-79' },
  { id: 'noble-1', name: 'Noble', prefix: 'noble', channel: 'channel-4' },
  { id: 'celestia', name: 'Celestia', prefix: 'celestia', channel: 'channel-2' },
  { id: 'cosmoshub-4', name: 'Cosmos Hub', prefix: 'cosmos', channel: 'channel-0' },
];

interface UnshieldProps {
  onSuccess?: () => void;
}

export function Unshield(props: UnshieldProps) {
  const { connection, wallet, penumbra, refreshBalances } = penumbraStore;

  const [destChain, setDestChain] = createSignal(DEST_CHAINS[0]!);
  const [selectedBalance, setSelectedBalance] = createSignal<string>('');
  const [amount, setAmount] = createSignal('');
  const [destAddress, setDestAddress] = createSignal('');
  const [processing, setProcessing] = createSignal(false);
  const [logs, setLogs] = createSignal<LogEntry[]>([
    { time: time(), type: 'info', msg: 'unshield ready - select asset to withdraw' },
  ]);

  function time() {
    return new Date().toLocaleTimeString();
  }

  function log(type: LogEntry['type'], msg: string) {
    setLogs((prev) => [...prev, { time: time(), type, msg }]);
  }

  // Get balances that can be withdrawn (IBC assets or native)
  const withdrawableBalances = () => {
    return wallet.balances.filter((b) => {
      // Can withdraw IBC assets (ibc/xxx or transfer/channel-x/xxx)
      // and native penumbra tokens
      return true; // For now allow all
    });
  };

  const selectedBalanceInfo = () => {
    return wallet.balances.find((b) => b.denom === selectedBalance());
  };

  // Privacy-preserving timeout calculation
  function calculateTimeout(): { timeoutHeight: bigint; timeoutTime: bigint } {
    const tenMinsMs = 1000 * 60 * 10;
    const twoDaysMs = 1000 * 60 * 60 * 24 * 2;

    const now = Date.now();
    const twoDaysFromNow = now + twoDaysMs;

    // Round to 10-minute intervals to prevent timing analysis
    const roundedTimeout = twoDaysFromNow + tenMinsMs - (twoDaysFromNow % tenMinsMs);
    const timeoutTimeNs = BigInt(roundedTimeout) * 1_000_000n;

    return {
      timeoutHeight: 0n, // Use timeout time instead
      timeoutTime: timeoutTimeNs,
    };
  }

  async function initiateUnshield() {
    if (!connection.connected) {
      log('err', 'connect penumbra wallet first');
      return;
    }

    const balance = selectedBalanceInfo();
    if (!balance) {
      log('err', 'select asset to withdraw');
      return;
    }

    if (!amount() || parseFloat(amount()) <= 0) {
      log('err', 'enter valid amount');
      return;
    }

    if (!destAddress()) {
      log('err', 'enter destination address');
      return;
    }

    // Validate destination address prefix
    const chain = destChain();
    if (!destAddress().startsWith(chain.prefix)) {
      log('err', `address must start with ${chain.prefix}`);
      return;
    }

    setProcessing(true);

    try {
      log('info', `initiating unshield: ${amount()} ${balance.symbol}`);
      log('info', `destination: ${chain.name} (${destAddress().slice(0, 20)}...)`);

      // Convert amount to base units
      const amountBig = new BigNumber(amount()).times(10 ** balance.exponent);

      // Get ephemeral return address for IBC acknowledgements
      log('info', 'generating ephemeral return address...');
      const { address: returnAddress } = await penumbra
        .service(ViewService)
        .ephemeralAddress({ addressIndex: { account: wallet.addressIndex } });

      if (!returnAddress) {
        throw new Error('Failed to generate return address');
      }

      // Calculate timeout
      const { timeoutHeight, timeoutTime } = calculateTimeout();

      log('info', `channel: ${chain.channel}`);
      log('info', 'timeout: 2 days (privacy-rounded)');

      // Build withdrawal plan request
      log('info', 'building withdrawal plan...');

      const planRequest = new TransactionPlannerRequest({
        ics20Withdrawals: [
          {
            amount: {
              lo: amountBig.mod(2n ** 64n).toFixed(0),
              hi: amountBig.div(2n ** 64n).integerValue().toFixed(0),
            },
            denom: { denom: balance.denom },
            destinationChainAddress: destAddress(),
            returnAddress,
            timeoutHeight: { revisionNumber: 0n, revisionHeight: timeoutHeight },
            timeoutTime,
            sourceChannel: chain.channel,
          },
        ],
        source: { account: wallet.addressIndex },
      });

      // Plan the transaction
      log('info', 'planning transaction...');
      const { plan } = await penumbra.service(ViewService).transactionPlanner(planRequest);

      if (!plan) {
        throw new Error('Failed to plan transaction');
      }

      // Authorize and build
      log('info', 'building & authorizing (check wallet)...');
      let transaction;

      for await (const status of penumbra.service(ViewService).authorizeAndBuild({
        transactionPlan: plan,
      })) {
        if (status.buildProgress) {
          const progress = status.buildProgress.progress ?? 0;
          if (progress > 0 && progress < 1) {
            log('info', `building: ${Math.round(progress * 100)}%`);
          }
        }
        if (status.buildProgress?.complete?.transaction) {
          transaction = status.buildProgress.complete.transaction;
        }
      }

      if (!transaction) {
        throw new Error('Failed to build transaction');
      }

      // Broadcast
      log('info', 'broadcasting transaction...');
      const result = await penumbra.service(ViewService).broadcastTransaction({
        transaction,
        awaitDetection: true,
      });

      log('ok', 'unshield transaction submitted!');
      log('info', `detection height: ${result.detectionHeight}`);
      log('info', 'IBC packet will be relayed to destination chain');

      setAmount('');
      refreshBalances();
      props.onSuccess?.();
    } catch (error) {
      console.error('Unshield error:', error);
      log('err', `unshield failed: ${error instanceof Error ? error.message : error}`);
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div>
      <div class="mb-4">
        <div class="text-cyan text-12px mb-2 pb-1 border-b border-border">
          // unshield (ibc withdraw)
        </div>
        <p class="text-dim text-12px">
          withdraw assets from your shielded penumbra balance to external chains via IBC.
        </p>
      </div>

      <div class="grid grid-cols-2 gap-4 mb-4">
        {/* Unshield Form */}
        <div class="bg-input border border-border p-4">
          <div class="text-cyan text-11px mb-3">withdraw</div>

          {/* Asset Selection */}
          <div class="mb-3">
            <label class="text-dim text-11px block mb-1">asset</label>
            <select
              class="w-full bg-bg border border-border text-text px-3 py-2 text-13px focus:outline-none focus:border-accent-dim cursor-pointer"
              value={selectedBalance()}
              onChange={(e) => setSelectedBalance(e.currentTarget.value)}
              disabled={!connection.connected || wallet.loading}
            >
              <option value="">Select asset...</option>
              <For each={withdrawableBalances()}>
                {(b) => (
                  <option value={b.denom}>
                    {b.symbol} ({b.amount})
                  </option>
                )}
              </For>
            </select>
          </div>

          {/* Amount */}
          <div class="mb-3">
            <label class="text-dim text-11px block mb-1">amount</label>
            <div class="flex">
              <input
                type="text"
                class="flex-1 bg-bg border border-border text-text px-3 py-2 text-13px focus:outline-none focus:border-accent-dim"
                placeholder="0.00"
                value={amount()}
                onInput={(e) => setAmount(e.currentTarget.value.replace(/[^0-9.]/g, ''))}
              />
              <button
                class="bg-bg border border-border border-l-0 px-3 text-dim text-11px hover:text-text cursor-pointer"
                onClick={() => {
                  const b = selectedBalanceInfo();
                  if (b) setAmount(b.amount);
                }}
              >
                MAX
              </button>
            </div>
          </div>

          {/* Destination Chain */}
          <div class="mb-3">
            <label class="text-dim text-11px block mb-1">destination chain</label>
            <select
              class="w-full bg-bg border border-border text-text px-3 py-2 text-13px focus:outline-none focus:border-accent-dim cursor-pointer"
              value={destChain().id}
              onChange={(e) => {
                const chain = DEST_CHAINS.find((c) => c.id === e.currentTarget.value);
                if (chain) setDestChain(chain);
              }}
            >
              <For each={DEST_CHAINS}>
                {(chain) => <option value={chain.id}>{chain.name}</option>}
              </For>
            </select>
          </div>

          {/* Destination Address */}
          <div class="mb-4">
            <label class="text-dim text-11px block mb-1">destination address</label>
            <input
              type="text"
              class="w-full bg-bg border border-border text-text px-3 py-2 text-13px focus:outline-none focus:border-accent-dim"
              placeholder={`${destChain().prefix}1...`}
              value={destAddress()}
              onInput={(e) => setDestAddress(e.currentTarget.value)}
            />
          </div>

          <button
            class="w-full bg-bg border border-accent-dim text-accent px-4 py-2 text-13px cursor-pointer hover:bg-accent-dim hover:text-bg disabled:opacity-50"
            onClick={initiateUnshield}
            disabled={processing() || !connection.connected}
          >
            {processing() ? 'unshielding...' : '> unshield'}
          </button>
        </div>

        {/* Info Panel */}
        <div class="bg-input border border-border p-4">
          <div class="text-cyan text-11px mb-3">source (penumbra)</div>

          <div class="text-12px">
            <div class="flex py-1">
              <span class="text-dim w-24">status:</span>
              <span class={connection.connected ? 'text-accent' : 'text-err'}>
                {connection.connected ? 'connected' : 'disconnected'}
              </span>
            </div>
            <div class="flex py-1">
              <span class="text-dim w-24">account:</span>
              <span class="text-text">#{wallet.addressIndex}</span>
            </div>
            <Show when={selectedBalanceInfo()}>
              <div class="flex py-1">
                <span class="text-dim w-24">available:</span>
                <span class="text-accent">
                  {selectedBalanceInfo()?.amount} {selectedBalanceInfo()?.symbol}
                </span>
              </div>
            </Show>
          </div>

          <div class="mt-4 pt-3 border-t border-border">
            <div class="text-11px text-dim mb-2">how it works</div>
            <ol class="text-10px text-dim space-y-1 list-decimal list-inside">
              <li>Select asset and amount to withdraw</li>
              <li>Enter destination chain address</li>
              <li>Approve transaction in Prax</li>
              <li>IBC packet sent to destination</li>
            </ol>
          </div>

          <div class="mt-4 pt-3 border-t border-border">
            <div class="text-11px text-dim mb-2">privacy note</div>
            <p class="text-10px text-dim">
              Withdrawal reveals the amount and destination. Your remaining
              shielded balance stays private.
            </p>
          </div>
        </div>
      </div>

      <Log entries={logs()} />
    </div>
  );
}
