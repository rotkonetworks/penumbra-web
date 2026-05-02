/**
 * Shield Component - IBC Deposit into Penumbra
 * Deposits assets from external chains (Osmosis, Noble, etc.) into shielded Penumbra balance
 */

import { createSignal, Show, For, onMount } from 'solid-js';
import { penumbraStore } from '../lib/penumbra';
import { Log, type LogEntry } from './Log';

// Supported source chains for IBC deposits
const SOURCE_CHAINS = [
  { id: 'osmosis-1', name: 'Osmosis', prefix: 'osmo', channel: 'channel-79' },
  { id: 'noble-1', name: 'Noble', prefix: 'noble', channel: 'channel-4' },
  { id: 'celestia', name: 'Celestia', prefix: 'celestia', channel: 'channel-2' },
  { id: 'cosmoshub-4', name: 'Cosmos Hub', prefix: 'cosmos', channel: 'channel-0' },
];

// Common assets that can be shielded
const SHIELDABLE_ASSETS = [
  { denom: 'uosmo', symbol: 'OSMO', chain: 'osmosis-1', decimals: 6 },
  { denom: 'uusdc', symbol: 'USDC', chain: 'noble-1', decimals: 6 },
  { denom: 'uatom', symbol: 'ATOM', chain: 'cosmoshub-4', decimals: 6 },
  { denom: 'utia', symbol: 'TIA', chain: 'celestia', decimals: 6 },
];

interface ShieldProps {
  onSuccess?: () => void;
}

export function Shield(props: ShieldProps) {
  const { connection, wallet } = penumbraStore;

  const [sourceChain, setSourceChain] = createSignal(SOURCE_CHAINS[0]!);
  const [asset, setAsset] = createSignal(SHIELDABLE_ASSETS[0]!);
  const [amount, setAmount] = createSignal('');
  const [sourceAddress, setSourceAddress] = createSignal('');
  const [processing, setProcessing] = createSignal(false);
  const [logs, setLogs] = createSignal<LogEntry[]>([
    { time: time(), type: 'info', msg: 'shield ready - connect cosmos wallet to deposit' },
  ]);

  function time() {
    return new Date().toLocaleTimeString();
  }

  function log(type: LogEntry['type'], msg: string) {
    setLogs((prev) => [...prev, { time: time(), type, msg }]);
  }

  const filteredAssets = () =>
    SHIELDABLE_ASSETS.filter((a) => a.chain === sourceChain().id);

  const destinationAddress = () => wallet.address ?? 'connect penumbra wallet first';

  // Simulate IBC deposit flow
  // In production, this would use cosmos-kit to sign the MsgTransfer
  async function initiateShield() {
    if (!connection.connected) {
      log('err', 'connect penumbra wallet first');
      return;
    }

    if (!amount() || parseFloat(amount()) <= 0) {
      log('err', 'enter valid amount');
      return;
    }

    if (!sourceAddress()) {
      log('err', 'enter source address');
      return;
    }

    setProcessing(true);

    try {
      const chain = sourceChain();
      const selectedAsset = asset();
      const amt = amount();

      log('info', `initiating shield: ${amt} ${selectedAsset.symbol}`);
      log('info', `source: ${chain.name} (${sourceAddress().slice(0, 20)}...)`);
      log('info', `destination: penumbra (shielded)`);

      // Step 1: Build IBC MsgTransfer
      log('info', 'building IBC transfer message...');
      await new Promise((r) => setTimeout(r, 800));

      log('info', `channel: ${chain.channel}`);
      log('info', 'timeout: 2 days (privacy-rounded)');

      // Step 2: Sign with cosmos wallet
      log('warn', 'cosmos wallet signing required');
      log('info', 'waiting for wallet approval...');
      await new Promise((r) => setTimeout(r, 1500));

      // Step 3: Broadcast
      log('info', 'broadcasting to source chain...');
      await new Promise((r) => setTimeout(r, 1000));

      // Step 4: Wait for IBC relay
      log('info', 'transaction submitted, awaiting IBC relay...');
      await new Promise((r) => setTimeout(r, 2000));

      log('ok', `shield complete: ${amt} ${selectedAsset.symbol} → penumbra`);
      log('info', 'funds will appear in shielded balance shortly');

      setAmount('');
      props.onSuccess?.();
    } catch (error) {
      log('err', `shield failed: ${error}`);
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div>
      <div class="mb-4">
        <div class="text-cyan text-12px mb-2 pb-1 border-b border-border">
          // shield (ibc deposit)
        </div>
        <p class="text-dim text-12px">
          deposit assets from external chains into your shielded penumbra balance via IBC.
        </p>
      </div>

      <div class="grid grid-cols-2 gap-4 mb-4">
        {/* Shield Form */}
        <div class="bg-input border border-border p-4">
          <div class="text-cyan text-11px mb-3">deposit</div>

          {/* Source Chain */}
          <div class="mb-3">
            <label class="text-dim text-11px block mb-1">source chain</label>
            <select
              class="w-full bg-bg border border-border text-text px-3 py-2 text-13px focus:outline-none focus:border-accent-dim cursor-pointer"
              value={sourceChain().id}
              onChange={(e) => {
                const chain = SOURCE_CHAINS.find((c) => c.id === e.currentTarget.value);
                if (chain) {
                  setSourceChain(chain);
                  const assets = SHIELDABLE_ASSETS.filter((a) => a.chain === chain.id);
                  if (assets[0]) setAsset(assets[0]);
                }
              }}
            >
              <For each={SOURCE_CHAINS}>
                {(chain) => <option value={chain.id}>{chain.name}</option>}
              </For>
            </select>
          </div>

          {/* Source Address */}
          <div class="mb-3">
            <label class="text-dim text-11px block mb-1">your {sourceChain().name} address</label>
            <input
              type="text"
              class="w-full bg-bg border border-border text-text px-3 py-2 text-13px focus:outline-none focus:border-accent-dim"
              placeholder={`${sourceChain().prefix}1...`}
              value={sourceAddress()}
              onInput={(e) => setSourceAddress(e.currentTarget.value)}
            />
          </div>

          {/* Asset */}
          <div class="mb-3">
            <label class="text-dim text-11px block mb-1">asset</label>
            <select
              class="w-full bg-bg border border-border text-text px-3 py-2 text-13px focus:outline-none focus:border-accent-dim cursor-pointer"
              value={asset().denom}
              onChange={(e) => {
                const a = SHIELDABLE_ASSETS.find((x) => x.denom === e.currentTarget.value);
                if (a) setAsset(a);
              }}
            >
              <For each={filteredAssets()}>
                {(a) => <option value={a.denom}>{a.symbol}</option>}
              </For>
            </select>
          </div>

          {/* Amount */}
          <div class="mb-4">
            <label class="text-dim text-11px block mb-1">amount</label>
            <input
              type="text"
              class="w-full bg-bg border border-border text-text px-3 py-2 text-13px focus:outline-none focus:border-accent-dim"
              placeholder="0.00"
              value={amount()}
              onInput={(e) => setAmount(e.currentTarget.value.replace(/[^0-9.]/g, ''))}
            />
          </div>

          <button
            class="w-full bg-bg border border-accent-dim text-accent px-4 py-2 text-13px cursor-pointer hover:bg-accent-dim hover:text-bg disabled:opacity-50"
            onClick={initiateShield}
            disabled={processing() || !connection.connected}
          >
            {processing() ? 'shielding...' : '> shield'}
          </button>
        </div>

        {/* Info Panel */}
        <div class="bg-input border border-border p-4">
          <div class="text-cyan text-11px mb-3">destination</div>

          <div class="text-12px">
            <div class="flex py-1">
              <span class="text-dim w-24">chain:</span>
              <span class="text-purple">Penumbra</span>
            </div>
            <div class="flex py-1">
              <span class="text-dim w-24">type:</span>
              <span class="text-accent">shielded</span>
            </div>
            <div class="flex py-1 items-start">
              <span class="text-dim w-24">address:</span>
              <span class="text-text text-10px break-all flex-1">
                {destinationAddress().slice(0, 40)}...
              </span>
            </div>
          </div>

          <div class="mt-4 pt-3 border-t border-border">
            <div class="text-11px text-dim mb-2">how it works</div>
            <ol class="text-10px text-dim space-y-1 list-decimal list-inside">
              <li>Connect source chain wallet (Keplr, etc.)</li>
              <li>Sign IBC transfer from source chain</li>
              <li>IBC relayer transfers to Penumbra</li>
              <li>Assets appear in shielded balance</li>
            </ol>
          </div>

          <div class="mt-4 pt-3 border-t border-border">
            <div class="text-11px text-dim mb-2">privacy note</div>
            <p class="text-10px text-dim">
              Once shielded, your balance and transactions are encrypted.
              Only you can see your holdings.
            </p>
          </div>
        </div>
      </div>

      <Log entries={logs()} />
    </div>
  );
}
