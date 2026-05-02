import { Show, createEffect, onMount, For } from 'solid-js';
import { penumbraStore } from '../lib/penumbra';

const PRAX_URL = 'https://praxwallet.com/';

export function WalletConnect() {
  const { connection, wallet, providers, connect, disconnect, detectProviders, setupListeners, reconnect } =
    penumbraStore;

  onMount(() => {
    detectProviders();
    setupListeners();
    // Auto-reconnect if previously connected
    reconnect();
  });

  const shortAddress = () => {
    const addr = wallet.address;
    if (!addr) return '';
    return `${addr.slice(0, 16)}...${addr.slice(-8)}`;
  };

  return (
    <div class="bg-input border border-border p-4">
      <div class="text-cyan text-11px mb-3">penumbra wallet</div>

      <Show
        when={connection.connected}
        fallback={
          <Show
            when={providers().length > 0}
            fallback={
              <div>
                <div class="text-dim text-12px mb-3">
                  No Penumbra wallet detected.
                </div>
                <button
                  class="w-full bg-bg border border-accent-dim text-accent px-4 py-2 text-13px cursor-pointer hover:bg-accent-dim hover:text-bg"
                  onClick={() => window.open(PRAX_URL, '_blank')}
                >
                  {'>'} Install Prax Wallet
                </button>
              </div>
            }
          >
            <div class="flex py-1 text-12px mb-3">
              <span class="text-dim w-24">status:</span>
              <span class="text-err">disconnected</span>
            </div>

            <Show when={connection.error}>
              <div class="text-err text-11px mb-3">{connection.error}</div>
            </Show>

            <button
              class="w-full bg-bg border border-accent-dim text-accent px-4 py-2 text-13px cursor-pointer hover:bg-accent-dim hover:text-bg disabled:opacity-50"
              onClick={() => connect()}
              disabled={connection.connecting}
            >
              {connection.connecting ? 'connecting...' : '> connect prax'}
            </button>
          </Show>
        }
      >
        {/* Connected State */}
        <div class="flex py-1 text-12px">
          <span class="text-dim w-24">status:</span>
          <span class="text-accent">connected</span>
        </div>

        <Show when={connection.manifest}>
          <div class="flex py-1 text-12px">
            <span class="text-dim w-24">wallet:</span>
            <span class="text-text">{connection.manifest?.name}</span>
          </div>
        </Show>

        <Show when={connection.chainId}>
          <div class="flex py-1 text-12px">
            <span class="text-dim w-24">chain:</span>
            <span class="text-text text-10px">{connection.chainId}</span>
          </div>
        </Show>

        <Show when={wallet.address}>
          <div class="flex py-1 text-12px">
            <span class="text-dim w-24">address:</span>
            <span class="text-text text-10px break-all">{shortAddress()}</span>
          </div>
        </Show>

        <div class="mt-3 pt-3 border-t border-border">
          <div class="text-11px text-dim mb-2">balances (shielded)</div>

          <Show
            when={!wallet.loading}
            fallback={<div class="text-dim text-11px">loading...</div>}
          >
            <Show
              when={wallet.balances.length > 0}
              fallback={<div class="text-dim text-11px">no balances</div>}
            >
              <For each={wallet.balances}>
                {(balance) => (
                  <div class="flex justify-between py-1 text-11px">
                    <div>
                      <span class="text-text">{balance.symbol}</span>
                      <span class="text-dim text-10px ml-1">
                        ({balance.denom.slice(0, 12)}...)
                      </span>
                    </div>
                    <span class="text-text">{balance.amount}</span>
                  </div>
                )}
              </For>
            </Show>
          </Show>
        </div>

        <button
          class="mt-3 w-full bg-bg border border-border text-dim px-4 py-1.5 text-11px cursor-pointer hover:border-err hover:text-err"
          onClick={disconnect}
        >
          disconnect
        </button>
      </Show>
    </div>
  );
}
