import { createSignal, Show, For } from 'solid-js';

interface Token {
  name: string;
  denom: string;
  balance: string;
  type: 'native' | 'bridged' | 'factory';
}

export function Wallet() {
  const [penumbraAddress, setPenumbraAddress] = createSignal('');
  const [nearAccount, setNearAccount] = createSignal('');
  const [tokens, setTokens] = createSignal<Token[]>([]);
  const [connecting, setConnecting] = createSignal(false);

  const connectPenumbra = async () => {
    setConnecting(true);
    await new Promise(r => setTimeout(r, 1000));

    setPenumbraAddress('penumbra1utls6zw9gn933drtgmzqd8qsyyp0d80fj2n3ccxv99ssgvyhmhtrua2vwhr99gqrs9mqlcz5uhfuqmsm7wn7ge76nc87px6due7z0l4ev385hap5u9rrq6dv3yvkrvpg762czw');

    setTokens([
      { name: 'UM', denom: 'upenumbra', balance: '1,234.56', type: 'native' },
      { name: 'wNEAR', denom: 'factory/mpc-bridge/near', balance: '45.00', type: 'bridged' },
      { name: 'USDC', denom: 'factory/mpc-bridge/usdc', balance: '1,000.00', type: 'bridged' },
      { name: 'MYTOKEN', denom: 'factory/a3907529773e18ff...', balance: '500,000', type: 'factory' },
    ]);

    setConnecting(false);
  };

  const connectNear = async () => {
    setConnecting(true);
    await new Promise(r => setTimeout(r, 1000));
    setNearAccount('yourname.near');
    setConnecting(false);
  };

  const typeColor = (type: Token['type']) => {
    switch (type) {
      case 'native': return 'text-accent';
      case 'bridged': return 'text-warn';
      case 'factory': return 'text-purple';
    }
  };

  return (
    <div>
      <div class="mb-4">
        <div class="text-cyan text-12px mb-2 pb-1 border-b border-border">// wallet connections</div>
        <p class="text-dim text-12px">connect your wallets to view balances and interact with the bridge.</p>
      </div>

      <div class="grid grid-cols-2 gap-4 mb-4">
        {/* Penumbra Wallet */}
        <div class="bg-input border border-border p-4">
          <div class="text-cyan text-11px mb-3">penumbra wallet</div>

          <Show when={penumbraAddress()} fallback={
            <>
              <div class="flex py-1 text-12px">
                <span class="text-dim w-24">status:</span>
                <span class="text-err">disconnected</span>
              </div>
              <button
                class="mt-4 bg-bg border border-accent-dim text-accent px-4 py-2 text-13px cursor-pointer hover:bg-accent-dim hover:text-bg disabled:opacity-50"
                onClick={connectPenumbra}
                disabled={connecting()}
              >
                {connecting() ? 'connecting...' : '> connect penumbra'}
              </button>
            </>
          }>
            <div class="flex py-1 text-12px">
              <span class="text-dim w-24">status:</span>
              <span class="text-accent">connected</span>
            </div>
            <div class="flex py-1 text-12px">
              <span class="text-dim w-24">address:</span>
              <span class="text-text text-10px break-all">{penumbraAddress().slice(0, 40)}...</span>
            </div>

            <div class="mt-4 pt-3 border-t border-border">
              <div class="text-11px text-dim mb-2">balances (shielded)</div>
              <For each={tokens()}>
                {token => (
                  <div class="flex justify-between py-1 text-11px">
                    <div>
                      <span class="text-text">{token.name}</span>
                      <span class={`ml-2 text-10px ${typeColor(token.type)}`}>[{token.type}]</span>
                    </div>
                    <span class="text-text">{token.balance}</span>
                  </div>
                )}
              </For>
            </div>
          </Show>
        </div>

        {/* NEAR Wallet */}
        <div class="bg-input border border-border p-4">
          <div class="text-cyan text-11px mb-3">near wallet</div>

          <Show when={nearAccount()} fallback={
            <>
              <div class="flex py-1 text-12px">
                <span class="text-dim w-24">status:</span>
                <span class="text-err">disconnected</span>
              </div>
              <button
                class="mt-4 bg-bg border border-accent-dim text-accent px-4 py-2 text-13px cursor-pointer hover:bg-accent-dim hover:text-bg disabled:opacity-50"
                onClick={connectNear}
                disabled={connecting()}
              >
                {connecting() ? 'connecting...' : '> connect near'}
              </button>
            </>
          }>
            <div class="flex py-1 text-12px">
              <span class="text-dim w-24">status:</span>
              <span class="text-accent">connected</span>
            </div>
            <div class="flex py-1 text-12px">
              <span class="text-dim w-24">account:</span>
              <span class="text-text">{nearAccount()}</span>
            </div>

            <div class="mt-4 pt-3 border-t border-border">
              <div class="text-11px text-dim mb-2">balances (public)</div>
              <div class="flex justify-between py-1 text-11px">
                <div>
                  <span class="text-text">NEAR</span>
                  <span class="ml-2 text-10px text-accent">[native]</span>
                </div>
                <span class="text-text">125.50</span>
              </div>
              <div class="flex justify-between py-1 text-11px">
                <div>
                  <span class="text-text">USDC</span>
                  <span class="ml-2 text-10px text-warn">[NEP-141]</span>
                </div>
                <span class="text-text">500.00</span>
              </div>
            </div>
          </Show>
        </div>
      </div>

      {/* Your Factory Tokens */}
      <Show when={penumbraAddress()}>
        <div class="bg-input border border-border p-3 mb-4">
          <div class="text-cyan text-11px mb-2">your factory tokens</div>
          <div class="space-y-2">
            <div class="flex justify-between items-center text-11px py-2 border-b border-border">
              <div>
                <span class="text-text font-bold">MYTOKEN</span>
                <div class="text-10px text-dim truncate max-w-xs">factory/a3907529773e18ff422ad69e89d522bac28ba131...</div>
              </div>
              <div class="text-right">
                <div class="text-text">500,000 supply</div>
                <div class="text-10px text-accent">fairlaunch</div>
              </div>
            </div>
            <div class="flex justify-between items-center text-11px py-2">
              <div>
                <span class="text-text font-bold">BRIDGETEST</span>
                <div class="text-10px text-dim truncate max-w-xs">factory/32bc0bc48bf93f042ce54b27639ac13460a08...</div>
              </div>
              <div class="text-right">
                <div class="text-text">0 supply</div>
                <div class="text-10px text-warn">mintable (seq: 0)</div>
              </div>
            </div>
          </div>
        </div>
      </Show>

      {/* Privacy Comparison */}
      <div class="bg-input border border-border p-3">
        <div class="text-cyan text-11px mb-2">privacy comparison</div>
        <div class="grid grid-cols-3 gap-2 text-11px">
          <div></div>
          <div class="text-warn">NEAR (public)</div>
          <div class="text-purple">Penumbra (shielded)</div>

          <div class="text-dim">balances</div>
          <div class="text-err">visible</div>
          <div class="text-accent">hidden</div>

          <div class="text-dim">transactions</div>
          <div class="text-err">public</div>
          <div class="text-accent">encrypted</div>

          <div class="text-dim">recipients</div>
          <div class="text-err">visible</div>
          <div class="text-accent">hidden</div>

          <div class="text-dim">MEV risk</div>
          <div class="text-err">high</div>
          <div class="text-accent">none</div>
        </div>
      </div>
    </div>
  );
}
