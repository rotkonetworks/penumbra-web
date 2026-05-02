import { Show, onMount, For } from 'solid-js';
import { nearStore } from '../lib/near';

export function NearWalletConnect() {
  const { config, connection, bridge, connect, disconnect, initWalletSelector, connectDirectRpc } =
    nearStore;

  onMount(async () => {
    // Initialize with localnet by default
    await initWalletSelector('localnet');
  });

  const shortAccountId = () => {
    const id = connection.accountId;
    if (!id) return '';
    if (id.length > 24) {
      return `${id.slice(0, 12)}...${id.slice(-8)}`;
    }
    return id;
  };

  return (
    <div class="bg-input border border-border p-4">
      <div class="text-warn text-11px mb-3">near wallet</div>

      <Show
        when={connection.connected}
        fallback={
          <div>
            <div class="flex py-1 text-12px mb-3">
              <span class="text-dim w-24">status:</span>
              <span class="text-err">disconnected</span>
            </div>

            <div class="flex py-1 text-12px mb-3">
              <span class="text-dim w-24">network:</span>
              <span class="text-text">{config().networkId}</span>
            </div>

            <Show when={connection.error}>
              <div class="text-err text-11px mb-3">{connection.error}</div>
            </Show>

            <div class="flex gap-2">
              <button
                class="flex-1 bg-bg border border-warn text-warn px-3 py-2 text-12px cursor-pointer hover:bg-warn hover:text-bg disabled:opacity-50"
                onClick={() => connect()}
                disabled={connection.connecting}
              >
                {connection.connecting ? 'connecting...' : '> connect wallet'}
              </button>
              <button
                class="bg-bg border border-border text-dim px-3 py-2 text-12px cursor-pointer hover:text-text"
                onClick={() => connectDirectRpc()}
                disabled={connection.connecting}
                title="Read-only connection"
              >
                rpc
              </button>
            </div>
          </div>
        }
      >
        {/* Connected State */}
        <div class="flex py-1 text-12px">
          <span class="text-dim w-24">status:</span>
          <span class="text-accent">connected</span>
        </div>

        <div class="flex py-1 text-12px">
          <span class="text-dim w-24">network:</span>
          <span class="text-warn">{config().networkId}</span>
        </div>

        <div class="flex py-1 text-12px">
          <span class="text-dim w-24">account:</span>
          <span class="text-text">{shortAccountId()}</span>
        </div>

        <Show when={connection.balance}>
          <div class="flex py-1 text-12px">
            <span class="text-dim w-24">balance:</span>
            <span class="text-warn">{connection.balance} NEAR</span>
          </div>
        </Show>

        {/* Bridge Info */}
        <div class="mt-3 pt-3 border-t border-border">
          <div class="text-11px text-dim mb-2">bridge contract</div>
          <div class="text-10px text-warn font-mono mb-2">{config().bridgeContract}</div>

          <Show when={!bridge.loading} fallback={<div class="text-dim text-11px">loading...</div>}>
            <div class="flex py-1 text-11px">
              <span class="text-dim w-20">status:</span>
              <span class={bridge.paused ? 'text-err' : 'text-accent'}>
                {bridge.paused ? 'PAUSED' : 'ACTIVE'}
              </span>
            </div>

            <Show when={Object.keys(bridge.tvl).length > 0}>
              <div class="text-11px text-dim mt-2 mb-1">tvl</div>
              <For each={Object.entries(bridge.tvl)}>
                {([asset, amount]) => (
                  <div class="flex justify-between text-10px">
                    <span class="text-dim">{asset}:</span>
                    <span class="text-text">{nearStore.formatNear(amount)}</span>
                  </div>
                )}
              </For>
            </Show>

            <Show when={bridge.assets.length > 0}>
              <div class="text-11px text-dim mt-2 mb-1">assets ({bridge.assets.length})</div>
              <For each={bridge.assets}>
                {(asset) => (
                  <div class="flex justify-between text-10px py-0.5">
                    <span class="text-text">{asset.name}</span>
                    <span class={asset.depositsEnabled ? 'text-accent' : 'text-err'}>
                      {asset.depositsEnabled ? 'enabled' : 'disabled'}
                    </span>
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
