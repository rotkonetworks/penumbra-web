import { createSignal, Show } from 'solid-js';
import { TokenList } from './components/TokenList';
import { WalletConnect } from './components/WalletConnect';
import { Shield } from './components/Shield';
import { Unshield } from './components/Unshield';
import { NearBridge } from './components/NearBridge';
import { NearWalletConnect } from './components/NearWalletConnect';
import { LaunchPad } from './pages/LaunchPad';
import { penumbraStore } from './lib/penumbra';
import { nearStore } from './lib/near';

const LOGO = `   ___  _  __  _           _
  |_  || |/ / | |__   ___ | |_
   / / | ' /  | '_ \\ / _ \\| __|
 _/ /_ | . \\  | |_) | (_) | |_
|____||_|\\_\\ |_.__/ \\___/ \\__|`;

type Tab = 'tokens' | 'launch' | 'shield' | 'unshield' | 'bridge' | 'wallet';

export default function App() {
  const [tab, setTab] = createSignal<Tab>('tokens');
  const { connection, wallet } = penumbraStore;
  const { connection: nearConnection } = nearStore;

  // Update header status reactively
  const penumbraStatus = () => (connection.connected ? 'ok' : '--');
  const nearStatus = () => (nearConnection.connected ? 'ok' : '--');

  return (
    <div class="h-screen flex flex-col max-w-5xl mx-auto p-2 font-mono">
      {/* Header */}
      <div class="bg-panel border border-border px-3 py-1 flex justify-between items-center mb-2">
        <span class="text-accent font-bold">zk.bot</span>
        <div class="flex gap-4 text-12px">
          <span class={connection.connected ? 'text-accent' : 'text-err'}>
            [penumbra: {penumbraStatus()}]
          </span>
          <span class={nearConnection.connected ? 'text-accent' : 'text-err'}>
            [near: {nearStatus()}]
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div class="flex gap-0.5 mb-2 flex-wrap">
        <button
          class={`bg-panel border border-border border-b-0 px-3 py-1.5 text-11px cursor-pointer ${tab() === 'tokens' ? 'text-accent border-accent-dim bg-input' : 'text-dim hover:text-text'}`}
          onClick={() => setTab('tokens')}
        >
          [1] tokens
        </button>
        <button
          class={`bg-panel border border-border border-b-0 px-3 py-1.5 text-11px cursor-pointer ${tab() === 'launch' ? 'text-accent border-accent-dim bg-input' : 'text-dim hover:text-text'}`}
          onClick={() => setTab('launch')}
        >
          [2] launch
        </button>
        <button
          class={`bg-panel border border-border border-b-0 px-3 py-1.5 text-11px cursor-pointer ${tab() === 'shield' ? 'text-accent border-accent-dim bg-input' : 'text-dim hover:text-text'}`}
          onClick={() => setTab('shield')}
        >
          [3] shield
        </button>
        <button
          class={`bg-panel border border-border border-b-0 px-3 py-1.5 text-11px cursor-pointer ${tab() === 'unshield' ? 'text-accent border-accent-dim bg-input' : 'text-dim hover:text-text'}`}
          onClick={() => setTab('unshield')}
        >
          [4] unshield
        </button>
        <button
          class={`bg-panel border border-border border-b-0 px-3 py-1.5 text-11px cursor-pointer ${tab() === 'bridge' ? 'text-warn border-warn bg-input' : 'text-dim hover:text-text'}`}
          onClick={() => setTab('bridge')}
        >
          [5] near
        </button>
        <button
          class={`bg-panel border border-border border-b-0 px-3 py-1.5 text-11px cursor-pointer ${tab() === 'wallet' ? 'text-accent border-accent-dim bg-input' : 'text-dim hover:text-text'}`}
          onClick={() => setTab('wallet')}
        >
          [6] wallet
        </button>
      </div>

      {/* Content */}
      <div class="flex-1 bg-panel border border-border p-4 overflow-y-auto">
        <pre class="text-accent text-11px leading-tight mb-4">{LOGO}</pre>

        <Show when={tab() === 'tokens'}>
          <div class="mb-4">
            <div class="text-cyan text-12px mb-2 pb-1 border-b border-border">// token factory</div>
            <p class="text-dim text-12px mb-4">snipe-proof tokens with encrypted mempool + 256-bit random nonces. no MEV.</p>
          </div>
          <TokenList onSelect={(token) => console.log('Selected:', token)} />
        </Show>

        <Show when={tab() === 'launch'}>
          <LaunchPad onConnect={() => {}} />
        </Show>

        <Show when={tab() === 'shield'}>
          <Shield onSuccess={() => penumbraStore.refreshBalances()} />
        </Show>

        <Show when={tab() === 'unshield'}>
          <Unshield onSuccess={() => penumbraStore.refreshBalances()} />
        </Show>

        <Show when={tab() === 'bridge'}>
          <NearBridge onSuccess={() => penumbraStore.refreshBalances()} />
        </Show>

        <Show when={tab() === 'wallet'}>
          <WalletPage />
        </Show>
      </div>

      {/* Footer */}
      <div class="bg-panel border border-border px-3 py-1 mt-2 flex justify-between text-11px text-dim">
        <span>zk.bot v0.1 | penumbra + near bridge</span>
        <span class="text-10px">
          {connection.chainId ? `chain: ${connection.chainId}` : 'not connected'}
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// Wallet Page - Uses real Penumbra connection
// ============================================================================

function WalletPage() {
  const { connection, wallet, refreshBalances } = penumbraStore;

  return (
    <div>
      <div class="mb-4">
        <div class="text-cyan text-12px mb-2 pb-1 border-b border-border">// wallet</div>
        <p class="text-dim text-12px">connect your wallets to view balances and interact with penumbra.</p>
      </div>

      <div class="grid grid-cols-2 gap-4 mb-4">
        {/* Penumbra Wallet */}
        <WalletConnect />

        {/* NEAR Wallet */}
        <NearWalletConnect />
      </div>

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

      <Show when={connection.connected}>
        <button
          class="mt-4 bg-bg border border-border text-dim px-4 py-1.5 text-11px cursor-pointer hover:text-text"
          onClick={refreshBalances}
        >
          refresh balances
        </button>
      </Show>
    </div>
  );
}

