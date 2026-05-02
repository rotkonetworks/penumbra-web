import { createSignal, Show } from 'solid-js';
import { connectWallet } from '../lib/escrow';
import { connectPrax, isPraxInstalled, formatPenumbraAddress } from '../lib/penumbra';

interface Props {
  onPenumbraConnect: (address: string) => void;
  onEvmConnect: (address: string) => void;
  penumbraAddress: string | null;
  evmAddress: string | null;
}

export function WalletConnect(props: Props) {
  const [loading, setLoading] = createSignal<'penumbra' | 'evm' | null>(null);
  const [error, setError] = createSignal<string | null>(null);

  const handlePenumbraConnect = async () => {
    setLoading('penumbra');
    setError(null);
    try {
      const addr = await connectPrax();
      if (addr) {
        props.onPenumbraConnect(addr);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(null);
    }
  };

  const handleEvmConnect = async () => {
    setLoading('evm');
    setError(null);
    try {
      const addr = await connectWallet();
      props.onEvmConnect(addr);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(null);
    }
  };

  const copyAddress = (addr: string) => {
    navigator.clipboard.writeText(addr);
  };

  return (
    <div class="bg-#f3f3f3 border border-#ccc p-2 my-2">
      <div class="font-bold text-sm mb-2">Wallets</div>

      <div class="flex gap-4 flex-wrap">
        {/* Penumbra/Prax */}
        <div class="flex-1 min-w-48">
          <div class="text-xs font-bold mb-1">Penumbra (Prax)</div>
          <Show
            when={props.penumbraAddress}
            fallback={
              <button
                class="btn w-full"
                onClick={handlePenumbraConnect}
                disabled={loading() !== null}
              >
                {loading() === 'penumbra' ? 'Connecting...' : 'Connect Prax'}
              </button>
            }
          >
            <div
              class="font-mono text-xs break-all cursor-pointer p-1 bg-#f0f0f0 border border-#ccc hover:bg-#e0e0e0"
              onClick={() => copyAddress(props.penumbraAddress!)}
              title="Click to copy"
            >
              {formatPenumbraAddress(props.penumbraAddress!)}
            </div>
          </Show>
        </div>

        {/* EVM (Paseo Asset Hub) */}
        <div class="flex-1 min-w-48">
          <div class="text-xs font-bold mb-1">Paseo Asset Hub (EVM)</div>
          <Show
            when={props.evmAddress}
            fallback={
              <button
                class="btn w-full"
                onClick={handleEvmConnect}
                disabled={loading() !== null}
              >
                {loading() === 'evm' ? 'Connecting...' : 'Connect MetaMask'}
              </button>
            }
          >
            <div
              class="font-mono text-xs break-all cursor-pointer p-1 bg-#f0f0f0 border border-#ccc hover:bg-#e0e0e0"
              onClick={() => copyAddress(props.evmAddress!)}
              title="Click to copy"
            >
              {props.evmAddress!.slice(0, 10)}...{props.evmAddress!.slice(-8)}
            </div>
          </Show>
        </div>
      </div>

      <Show when={error()}>
        <div class="mt-2 p-2 bg-#fcc border border-#800 text-xs">
          {error()}
        </div>
      </Show>

      <Show when={!isPraxInstalled()}>
        <div class="mt-2 text-xs text-#666">
          Prax wallet not detected.{' '}
          <a
            href="https://chrome.google.com/webstore/detail/prax-wallet/lkpmkhpnhknhmibgnmmhdhgdilepfghe"
            target="_blank"
            class="text-#000066 underline"
          >
            Install Prax
          </a>
        </div>
      </Show>
    </div>
  );
}
