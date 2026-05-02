import { createSignal, Show, For } from 'solid-js';
import { WalletConnect } from './components/WalletConnect';
import { CreateEscrow } from './components/CreateEscrow';
import { EscrowList } from './components/EscrowList';

export type Tab = 'create' | 'list';

export default function App() {
  const [tab, setTab] = createSignal<Tab>('create');
  const [walletConnected, setWalletConnected] = createSignal(false);
  const [penumbraAddress, setPenumbraAddress] = createSignal<string | null>(null);
  const [evmAddress, setEvmAddress] = createSignal<string | null>(null);

  return (
    <div>
      <h1 class="bg-#000066 text-white px-3 py-2 font-bold text-lg m-0 mb-0.5">
        Cobi Escrows
      </h1>
      <h2 class="bg-#ddd text-black px-3 py-1.5 m-0 mb-2 text-xs font-normal">
        P2P Fiat-to-Crypto with Verifiable Secret Sharing
      </h2>

      <WalletConnect
        onPenumbraConnect={(addr) => {
          setPenumbraAddress(addr);
          setWalletConnected(true);
        }}
        onEvmConnect={(addr) => setEvmAddress(addr)}
        penumbraAddress={penumbraAddress()}
        evmAddress={evmAddress()}
      />

      <div class="bg-#f3f3f3 border border-#ccc p-2 my-2">
        <button
          class={`btn mr-1 ${tab() === 'create' ? 'bg-#d0d0d0' : ''}`}
          onClick={() => setTab('create')}
        >
          Create Escrow
        </button>
        <button
          class={`btn ${tab() === 'list' ? 'bg-#d0d0d0' : ''}`}
          onClick={() => setTab('list')}
        >
          My Escrows
        </button>
      </div>

      <Show when={tab() === 'create'}>
        <CreateEscrow
          penumbraAddress={penumbraAddress()}
          evmAddress={evmAddress()}
        />
      </Show>

      <Show when={tab() === 'list'}>
        <EscrowList evmAddress={evmAddress()} />
      </Show>
    </div>
  );
}
