import { createSignal, For } from 'solid-js';
import { Log, LogEntry } from '../components/Log';

interface Props {
  onPenumbra: () => void;
  onNear: () => void;
}

type Direction = 'near-to-penumbra' | 'penumbra-to-near';

interface Asset {
  symbol: string;
  name: string;
  balance: string;
  network: 'near' | 'penumbra';
}

const ASSETS: Asset[] = [
  { symbol: 'NEAR', name: 'NEAR Protocol', balance: '100.00', network: 'near' },
  { symbol: 'USDC', name: 'USD Coin', balance: '1,000.00', network: 'near' },
  { symbol: 'wETH', name: 'Wrapped Ether', balance: '0.5', network: 'near' },
  { symbol: 'UM', name: 'Penumbra', balance: '500.00', network: 'penumbra' },
];

export function Bridge(props: Props) {
  const [direction, setDirection] = createSignal<Direction>('near-to-penumbra');
  const [asset, setAsset] = createSignal('NEAR');
  const [amount, setAmount] = createSignal('');
  const [bridging, setBridging] = createSignal(false);
  const [logs, setLogs] = createSignal<LogEntry[]>([
    { time: time(), type: 'info', msg: 'bridge ready' }
  ]);

  function time() {
    return new Date().toLocaleTimeString();
  }

  function log(type: LogEntry['type'], msg: string) {
    setLogs(prev => [...prev, { time: time(), type, msg }]);
  }

  const sourceAssets = () => {
    const network = direction() === 'near-to-penumbra' ? 'near' : 'penumbra';
    return ASSETS.filter(a => a.network === network);
  };

  async function bridge() {
    if (!amount()) {
      log('err', 'amount required');
      return;
    }

    setBridging(true);
    const dir = direction();
    const sym = asset();

    if (dir === 'near-to-penumbra') {
      log('info', `bridging ${amount()} ${sym} from NEAR...`);
      props.onNear();

      await new Promise(r => setTimeout(r, 1000));
      log('info', 'locking tokens on NEAR...');

      await new Promise(r => setTimeout(r, 1500));
      log('info', 'MPC signature collected (3/5 threshold)');

      await new Promise(r => setTimeout(r, 1000));
      log('info', 'minting wrapped tokens on Penumbra...');
      props.onPenumbra();

      await new Promise(r => setTimeout(r, 500));
      log('ok', `${amount()} w${sym} minted to shielded pool`);
    } else {
      log('info', `bridging ${amount()} ${sym} from Penumbra...`);
      props.onPenumbra();

      await new Promise(r => setTimeout(r, 1000));
      log('info', 'burning wrapped tokens...');

      await new Promise(r => setTimeout(r, 1500));
      log('info', 'generating MPC signature...');

      await new Promise(r => setTimeout(r, 1000));
      log('info', 'unlocking on NEAR...');
      props.onNear();

      await new Promise(r => setTimeout(r, 500));
      log('ok', `${amount()} ${sym.replace('w', '')} released on NEAR`);
    }

    setAmount('');
    setBridging(false);
  }

  return (
    <div>
      <div class="mb-4">
        <div class="text-cyan text-12px mb-2 pb-1 border-b border-border">// mpc bridge</div>
        <p class="text-dim text-12px">trustless bridge powered by MPC threshold signatures. no centralized custody.</p>
      </div>

      <div class="grid grid-cols-2 gap-4 mb-4">
        {/* Bridge Form */}
        <div class="bg-input border border-border p-4">
          <div class="text-cyan text-11px mb-3">transfer</div>

          {/* Direction toggle */}
          <div class="flex mb-4 text-11px">
            <button
              class={`flex-1 py-2 border cursor-pointer ${direction() === 'near-to-penumbra' ? 'border-accent text-accent bg-bg' : 'border-border text-dim hover:text-text'}`}
              onClick={() => { setDirection('near-to-penumbra'); setAsset('NEAR'); }}
            >
              NEAR → Penumbra
            </button>
            <button
              class={`flex-1 py-2 border border-l-0 cursor-pointer ${direction() === 'penumbra-to-near' ? 'border-accent text-accent bg-bg' : 'border-border text-dim hover:text-text'}`}
              onClick={() => { setDirection('penumbra-to-near'); setAsset('UM'); }}
            >
              Penumbra → NEAR
            </button>
          </div>

          {/* Asset selection */}
          <div class="mb-3">
            <label class="text-dim text-11px block mb-1">asset</label>
            <select
              class="w-full bg-bg border border-border text-text px-3 py-2 text-13px focus:outline-none focus:border-accent-dim cursor-pointer"
              value={asset()}
              onChange={e => setAsset(e.currentTarget.value)}
            >
              <For each={sourceAssets()}>
                {a => <option value={a.symbol}>{a.symbol} - {a.name}</option>}
              </For>
            </select>
          </div>

          {/* Amount */}
          <div class="mb-4">
            <label class="text-dim text-11px block mb-1">amount</label>
            <div class="flex">
              <input
                type="text"
                class="flex-1 bg-bg border border-border text-text px-3 py-2 text-13px focus:outline-none focus:border-accent-dim"
                placeholder="0.00"
                value={amount()}
                onInput={e => setAmount(e.currentTarget.value.replace(/[^0-9.]/g, ''))}
              />
              <button
                class="bg-bg border border-border border-l-0 px-3 text-dim text-11px hover:text-text cursor-pointer"
                onClick={() => {
                  const a = sourceAssets().find(x => x.symbol === asset());
                  if (a) setAmount(a.balance.replace(',', ''));
                }}
              >
                MAX
              </button>
            </div>
          </div>

          <button
            class="w-full bg-bg border border-accent-dim text-accent px-4 py-2 text-13px cursor-pointer hover:bg-accent-dim hover:text-bg disabled:opacity-50"
            onClick={bridge}
            disabled={bridging()}
          >
            {bridging() ? 'bridging...' : '> bridge'}
          </button>
        </div>

        {/* Bridge Info */}
        <div class="bg-input border border-border p-4">
          <div class="text-cyan text-11px mb-3">mpc security</div>

          <div class="text-12px">
            <div class="flex py-1"><span class="text-dim w-32">threshold:</span><span class="text-accent">3 of 5</span></div>
            <div class="flex py-1"><span class="text-dim w-32">key gen:</span><span class="text-accent">FROST DKG</span></div>
            <div class="flex py-1"><span class="text-dim w-32">signatures:</span><span class="text-accent">Schnorr</span></div>
            <div class="flex py-1"><span class="text-dim w-32">custody:</span><span class="text-accent">none (trustless)</span></div>
            <div class="flex py-1"><span class="text-dim w-32">operators:</span><span class="text-accent">distributed</span></div>
          </div>

          <div class="mt-4 pt-3 border-t border-border">
            <div class="text-11px text-dim mb-2">tvl</div>
            <div class="grid grid-cols-2 gap-2 text-11px">
              <div>
                <span class="text-warn">NEAR:</span>
                <span class="text-text ml-2">12,345.00</span>
              </div>
              <div>
                <span class="text-purple">UM:</span>
                <span class="text-text ml-2">45,678.00</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent bridges */}
      <div class="bg-input border border-border p-3 mb-4">
        <div class="text-cyan text-11px mb-2">recent bridges</div>
        <div class="text-11px space-y-1">
          <div class="flex justify-between text-dim">
            <span><span class="text-warn">100 NEAR</span> → <span class="text-purple">Penumbra</span></span>
            <span>2m ago</span>
          </div>
          <div class="flex justify-between text-dim">
            <span><span class="text-purple">50 UM</span> → <span class="text-warn">NEAR</span></span>
            <span>15m ago</span>
          </div>
          <div class="flex justify-between text-dim">
            <span><span class="text-warn">500 USDC</span> → <span class="text-purple">Penumbra</span></span>
            <span>1h ago</span>
          </div>
        </div>
      </div>

      <Log entries={logs()} />
    </div>
  );
}
