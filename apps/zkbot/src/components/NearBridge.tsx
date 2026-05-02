/**
 * NEAR Bridge Component - Deposit NEAR → Penumbra, Withdraw Penumbra → NEAR
 */

import { createSignal, Show, For, onMount, createMemo } from 'solid-js';
import { nearStore } from '../lib/near';
import { penumbraStore, BRIDGE_CONFIG } from '../lib/penumbra';
import { Log, type LogEntry } from './Log';

type Direction = 'near-to-penumbra' | 'penumbra-to-near';

// Track pending withdrawals locally
interface PendingWithdrawal {
  id: string;
  amount: string;
  nearDest: string;
  txHash?: string;
  timestamp: number;
  status: 'pending' | 'ready_to_claim' | 'claimed';
}

interface NearBridgeProps {
  onSuccess?: () => void;
}

export function NearBridge(props: NearBridgeProps) {
  const { config, connection: nearConnection, bridge, connect, deposit, loadBridgeState, initWalletSelector, claimWithdrawal } = nearStore;
  const { connection: penumbraConnection, wallet, bridgeWithdraw, getWNearBalance } = penumbraStore;

  const [direction, setDirection] = createSignal<Direction>('near-to-penumbra');
  const [amount, setAmount] = createSignal('');
  const [destAddress, setDestAddress] = createSignal('');
  const [processing, setProcessing] = createSignal(false);
  const [pendingWithdrawals, setPendingWithdrawals] = createSignal<PendingWithdrawal[]>([]);
  const [logs, setLogs] = createSignal<LogEntry[]>([
    { time: time(), type: 'info', msg: 'near bridge ready' },
  ]);

  onMount(async () => {
    await initWalletSelector('localnet');
    // Load pending withdrawals from localStorage
    const saved = localStorage.getItem('zkbot:pending_withdrawals');
    if (saved) {
      try {
        setPendingWithdrawals(JSON.parse(saved));
      } catch {}
    }
  });

  function time() {
    return new Date().toLocaleTimeString();
  }

  function log(type: LogEntry['type'], msg: string) {
    setLogs((prev) => [...prev, { time: time(), type, msg }]);
  }

  // Save pending withdrawals to localStorage
  function savePendingWithdrawals(withdrawals: PendingWithdrawal[]) {
    localStorage.setItem('zkbot:pending_withdrawals', JSON.stringify(withdrawals));
    setPendingWithdrawals(withdrawals);
  }

  // Auto-fill Penumbra address when connected
  const penumbraAddress = () => wallet.address ?? '';

  // Get wNEAR balance
  const wNearBalance = createMemo(() => getWNearBalance());

  // ============================================================================
  // NEAR → Penumbra Deposit
  // ============================================================================

  async function handleNearToPenumbra() {
    if (!nearConnection.connected || nearConnection.accountId?.includes('read-only')) {
      log('err', 'connect NEAR wallet first (not read-only)');
      return;
    }

    if (!amount() || parseFloat(amount()) <= 0) {
      log('err', 'enter valid amount');
      return;
    }

    const dest = destAddress() || penumbraAddress();
    if (!dest || !dest.startsWith('penumbra1')) {
      log('err', 'enter valid penumbra destination address');
      return;
    }

    setProcessing(true);

    try {
      log('info', `initiating deposit: ${amount()} NEAR → Penumbra`);
      log('info', `destination: ${dest.slice(0, 30)}...`);

      // Step 1: Call bridge contract
      log('info', 'calling bridge contract...');
      const result = await deposit(amount(), dest);

      if (result.success) {
        log('ok', 'deposit transaction submitted!');
        if (result.txHash) {
          log('info', `tx: ${result.txHash}`);
        }
        log('info', 'MPC nodes will process and mint wNEAR on Penumbra');
        setAmount('');
        props.onSuccess?.();
      } else {
        log('err', `deposit failed: ${result.error}`);
      }
    } catch (error) {
      log('err', `deposit error: ${error}`);
    } finally {
      setProcessing(false);
    }
  }

  // ============================================================================
  // Penumbra → NEAR Withdraw
  // ============================================================================

  async function handlePenumbraToNear() {
    if (!penumbraConnection.connected) {
      log('err', 'connect Penumbra wallet first');
      return;
    }

    if (!amount() || parseFloat(amount()) <= 0) {
      log('err', 'enter valid amount');
      return;
    }

    if (!destAddress()) {
      log('err', 'enter NEAR destination account');
      return;
    }

    // Check wNEAR balance
    const balance = wNearBalance();
    if (!balance) {
      log('err', 'no wNEAR balance found');
      return;
    }

    if (parseFloat(amount()) > parseFloat(balance.amount)) {
      log('err', `insufficient wNEAR (have: ${balance.amount})`);
      return;
    }

    setProcessing(true);

    try {
      log('info', `initiating withdrawal: ${amount()} wNEAR → NEAR`);
      log('info', `destination: ${destAddress()}`);

      // Step 1: Build and broadcast burn transaction on Penumbra
      log('info', 'building burn transaction...');

      const result = await bridgeWithdraw(amount(), destAddress());

      if (!result.success) {
        log('err', `burn failed: ${result.error}`);
        return;
      }

      log('ok', 'burn transaction broadcast!');
      if (result.txHash) {
        log('info', `tx: ${result.txHash.slice(0, 16)}...`);
      }

      // Step 2: Track pending withdrawal
      const withdrawal: PendingWithdrawal = {
        id: result.withdrawalId!,
        amount: amount(),
        nearDest: destAddress(),
        txHash: result.txHash,
        timestamp: Date.now(),
        status: 'pending',
      };

      savePendingWithdrawals([...pendingWithdrawals(), withdrawal]);
      log('info', `withdrawal ID: ${result.withdrawalId}`);

      // Step 3: MPC nodes will observe and generate signature
      log('info', 'MPC nodes observing burn event...');
      log('warn', 'claim on NEAR when signature ready');

      setAmount('');
      props.onSuccess?.();
    } catch (error) {
      log('err', `withdrawal error: ${error}`);
    } finally {
      setProcessing(false);
    }
  }

  // ============================================================================
  // Claim Withdrawal on NEAR
  // ============================================================================

  async function handleClaimWithdrawal(withdrawal: PendingWithdrawal) {
    if (!nearConnection.connected || nearConnection.accountId?.includes('read-only')) {
      log('err', 'connect NEAR wallet first');
      return;
    }

    setProcessing(true);

    try {
      log('info', `claiming withdrawal: ${withdrawal.amount} NEAR`);
      log('info', `withdrawal ID: ${withdrawal.id}`);

      // In production, MPC signature would be fetched from MPC network
      // For now, we simulate with a placeholder
      const mockSignature = 'mpc_signature_placeholder';

      const result = await claimWithdrawal(withdrawal.id, mockSignature);

      if (result.success) {
        log('ok', 'withdrawal claimed successfully!');
        if (result.txHash) {
          log('info', `tx: ${result.txHash}`);
        }

        // Update withdrawal status
        const updated = pendingWithdrawals().map((w) =>
          w.id === withdrawal.id ? { ...w, status: 'claimed' as const } : w
        );
        savePendingWithdrawals(updated);
      } else {
        log('err', `claim failed: ${result.error}`);
      }
    } catch (error) {
      log('err', `claim error: ${error}`);
    } finally {
      setProcessing(false);
    }
  }

  // ============================================================================
  // Submit Handler
  // ============================================================================

  function handleSubmit() {
    if (direction() === 'near-to-penumbra') {
      handleNearToPenumbra();
    } else {
      handlePenumbraToNear();
    }
  }

  return (
    <div>
      <div class="mb-4">
        <div class="text-warn text-12px mb-2 pb-1 border-b border-warn">
          // near bridge (mpc)
        </div>
        <p class="text-dim text-12px">
          bridge assets between NEAR and Penumbra via MPC threshold signatures. trustless, no custodians.
        </p>
      </div>

      <div class="grid grid-cols-2 gap-4 mb-4">
        {/* Bridge Form */}
        <div class="bg-input border border-border p-4">
          <div class="text-warn text-11px mb-3">transfer</div>

          {/* Direction toggle */}
          <div class="flex mb-4 text-11px">
            <button
              class={`flex-1 py-2 border cursor-pointer transition-colors ${
                direction() === 'near-to-penumbra'
                  ? 'border-warn text-warn bg-bg'
                  : 'border-border text-dim hover:text-text'
              }`}
              onClick={() => setDirection('near-to-penumbra')}
            >
              NEAR → Penumbra
            </button>
            <button
              class={`flex-1 py-2 border border-l-0 cursor-pointer transition-colors ${
                direction() === 'penumbra-to-near'
                  ? 'border-warn text-warn bg-bg'
                  : 'border-border text-dim hover:text-text'
              }`}
              onClick={() => setDirection('penumbra-to-near')}
            >
              Penumbra → NEAR
            </button>
          </div>

          {/* Amount */}
          <div class="mb-3">
            <label class="text-dim text-11px block mb-1">
              amount ({direction() === 'near-to-penumbra' ? 'NEAR' : 'wNEAR'})
              <Show when={direction() === 'penumbra-to-near' && wNearBalance()}>
                <span class="text-warn ml-2">
                  (bal: {wNearBalance()!.amount})
                </span>
              </Show>
            </label>
            <div class="flex">
              <input
                type="text"
                class="flex-1 bg-bg border border-border text-text px-3 py-2 text-13px focus:outline-none focus:border-warn"
                placeholder="0.00"
                value={amount()}
                onInput={(e) => setAmount(e.currentTarget.value.replace(/[^0-9.]/g, ''))}
              />
              <Show when={direction() === 'near-to-penumbra' && nearConnection.balance}>
                <button
                  class="bg-bg border border-border border-l-0 px-2 text-dim text-10px hover:text-text cursor-pointer"
                  onClick={() => setAmount(nearConnection.balance ?? '')}
                >
                  MAX
                </button>
              </Show>
              <Show when={direction() === 'penumbra-to-near' && wNearBalance()}>
                <button
                  class="bg-bg border border-border border-l-0 px-2 text-dim text-10px hover:text-text cursor-pointer"
                  onClick={() => setAmount(wNearBalance()!.amount)}
                >
                  MAX
                </button>
              </Show>
            </div>
          </div>

          {/* Destination */}
          <div class="mb-4">
            <label class="text-dim text-11px block mb-1">
              {direction() === 'near-to-penumbra' ? 'penumbra destination' : 'near account'}
            </label>
            <input
              type="text"
              class="w-full bg-bg border border-border text-text px-3 py-2 text-13px focus:outline-none focus:border-warn"
              placeholder={direction() === 'near-to-penumbra' ? 'penumbra1...' : 'account.near'}
              value={destAddress()}
              onInput={(e) => setDestAddress(e.currentTarget.value)}
            />
            <Show when={direction() === 'near-to-penumbra' && penumbraAddress()}>
              <button
                class="text-10px text-dim hover:text-warn mt-1 cursor-pointer"
                onClick={() => setDestAddress(penumbraAddress())}
              >
                use connected: {penumbraAddress().slice(0, 20)}...
              </button>
            </Show>
          </div>

          {/* Status Indicators */}
          <div class="flex gap-4 mb-4 text-10px">
            <div>
              <span class="text-dim">near: </span>
              <span class={nearConnection.connected ? 'text-accent' : 'text-err'}>
                {nearConnection.connected ? nearConnection.accountId?.slice(0, 12) : 'disconnected'}
              </span>
            </div>
            <div>
              <span class="text-dim">penumbra: </span>
              <span class={penumbraConnection.connected ? 'text-accent' : 'text-err'}>
                {penumbraConnection.connected ? 'connected' : 'disconnected'}
              </span>
            </div>
          </div>

          <button
            class="w-full bg-bg border border-warn text-warn px-4 py-2 text-13px cursor-pointer hover:bg-warn hover:text-bg disabled:opacity-50 transition-colors"
            onClick={handleSubmit}
            disabled={processing()}
          >
            {processing()
              ? 'processing...'
              : direction() === 'near-to-penumbra'
              ? '> deposit to penumbra'
              : '> withdraw to near'}
          </button>
        </div>

        {/* Info Panel */}
        <div class="bg-input border border-border p-4">
          <div class="text-warn text-11px mb-3">mpc security</div>

          <div class="text-12px">
            <div class="flex py-1">
              <span class="text-dim w-28">threshold:</span>
              <span class="text-warn">3 of 5</span>
            </div>
            <div class="flex py-1">
              <span class="text-dim w-28">key gen:</span>
              <span class="text-warn">FROST DKG</span>
            </div>
            <div class="flex py-1">
              <span class="text-dim w-28">signatures:</span>
              <span class="text-warn">Schnorr</span>
            </div>
            <div class="flex py-1">
              <span class="text-dim w-28">custody:</span>
              <span class="text-accent">none (trustless)</span>
            </div>
          </div>

          <div class="mt-4 pt-3 border-t border-border">
            <div class="text-11px text-dim mb-2">bridge contract</div>
            <div class="text-10px text-warn font-mono">{config().bridgeContract}</div>
          </div>

          <div class="mt-4 pt-3 border-t border-border">
            <div class="text-11px text-dim mb-2">
              {direction() === 'near-to-penumbra' ? 'deposit flow' : 'withdraw flow'}
            </div>
            <ol class="text-10px text-dim space-y-1 list-decimal list-inside">
              <Show
                when={direction() === 'near-to-penumbra'}
                fallback={
                  <>
                    <li>Burn wNEAR on Penumbra</li>
                    <li>MPC nodes observe burn event</li>
                    <li>Generate threshold signature</li>
                    <li>Claim NEAR on NEAR chain</li>
                  </>
                }
              >
                <li>Lock NEAR in bridge contract</li>
                <li>MPC nodes verify deposit</li>
                <li>Generate threshold signature</li>
                <li>Mint wNEAR on Penumbra (shielded)</li>
              </Show>
            </ol>
          </div>

          {/* Bridge Stats */}
          <Show when={!bridge.loading && Object.keys(bridge.tvl).length > 0}>
            <div class="mt-4 pt-3 border-t border-border">
              <div class="text-11px text-dim mb-2">tvl</div>
              <For each={Object.entries(bridge.tvl)}>
                {([asset, amount]) => (
                  <div class="flex justify-between text-11px">
                    <span class="text-dim">{asset}:</span>
                    <span class="text-warn">{nearStore.formatNear(amount)}</span>
                  </div>
                )}
              </For>
            </div>
          </Show>
        </div>
      </div>

      {/* Quick Connect Buttons */}
      <Show when={!nearConnection.connected || !penumbraConnection.connected}>
        <div class="bg-input border border-border p-3 mb-4 flex gap-2">
          <Show when={!nearConnection.connected}>
            <button
              class="bg-bg border border-warn text-warn px-3 py-1.5 text-11px cursor-pointer hover:bg-warn hover:text-bg"
              onClick={() => connect()}
            >
              connect near
            </button>
          </Show>
          <Show when={!penumbraConnection.connected}>
            <button
              class="bg-bg border border-purple text-purple px-3 py-1.5 text-11px cursor-pointer hover:bg-purple hover:text-bg"
              onClick={() => penumbraStore.connect()}
            >
              connect penumbra
            </button>
          </Show>
        </div>
      </Show>

      {/* Pending Withdrawals */}
      <Show when={pendingWithdrawals().filter((w) => w.status !== 'claimed').length > 0}>
        <div class="bg-input border border-border p-3 mb-4">
          <div class="text-warn text-11px mb-2">pending withdrawals</div>
          <For each={pendingWithdrawals().filter((w) => w.status !== 'claimed')}>
            {(withdrawal) => (
              <div class="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div class="text-11px">
                  <div class="text-text">{withdrawal.amount} wNEAR → {withdrawal.nearDest.slice(0, 16)}...</div>
                  <div class="text-dim text-10px">
                    ID: {withdrawal.id.slice(0, 8)}... | {new Date(withdrawal.timestamp).toLocaleTimeString()}
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <span
                    class={`text-10px ${
                      withdrawal.status === 'ready_to_claim' ? 'text-accent' : 'text-warn'
                    }`}
                  >
                    {withdrawal.status === 'pending' ? 'awaiting MPC' : 'ready'}
                  </span>
                  <button
                    class="bg-bg border border-warn text-warn px-2 py-1 text-10px cursor-pointer hover:bg-warn hover:text-bg disabled:opacity-50"
                    onClick={() => handleClaimWithdrawal(withdrawal)}
                    disabled={processing() || withdrawal.status === 'pending'}
                  >
                    claim
                  </button>
                </div>
              </div>
            )}
          </For>
        </div>
      </Show>

      <Log entries={logs()} />
    </div>
  );
}
