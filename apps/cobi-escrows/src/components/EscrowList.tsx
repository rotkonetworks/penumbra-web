import { createSignal, Show, For, onMount } from 'solid-js';
import { STATE_LABELS, EscrowState } from '../lib/config';

interface Props {
  evmAddress: string | null;
}

interface LocalEscrow {
  id: string;
  asset: string;
  amount: string;
  fiatAmount: string;
  fiatCurrency: string;
  role: 'seller' | 'buyer';
  state: EscrowState;
  createdAt: number;
  commitment: string;
  shareFile?: string;
}

export function EscrowList(props: Props) {
  const [escrows, setEscrows] = createSignal<LocalEscrow[]>([]);
  const [loading, setLoading] = createSignal(false);

  // Load escrows from localStorage
  onMount(() => {
    const stored = localStorage.getItem('cobi_escrows');
    if (stored) {
      try {
        setEscrows(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse stored escrows:', e);
      }
    }
  });

  // Demo escrows for UI testing
  const addDemoEscrow = () => {
    const demo: LocalEscrow = {
      id: `0x${Math.random().toString(16).slice(2)}`,
      asset: 'UM',
      amount: '100',
      fiatAmount: '50',
      fiatCurrency: 'USD',
      role: 'seller',
      state: EscrowState.Created,
      createdAt: Date.now(),
      commitment: `0x${Math.random().toString(16).slice(2)}`,
    };

    const updated = [...escrows(), demo];
    setEscrows(updated);
    localStorage.setItem('cobi_escrows', JSON.stringify(updated));
  };

  const stateColor = (state: EscrowState): string => {
    switch (state) {
      case EscrowState.Created:
        return 'bg-#ffc';
      case EscrowState.BuyerConfirmed:
        return 'bg-#cff';
      case EscrowState.PaymentSent:
        return 'bg-#fcf';
      case EscrowState.Completed:
        return 'bg-#cfc';
      case EscrowState.Disputed:
        return 'bg-#fcc';
      case EscrowState.ResolvedBuyer:
      case EscrowState.ResolvedSeller:
        return 'bg-#ddd';
      default:
        return 'bg-#fff';
    }
  };

  return (
    <div>
      <Show when={!props.evmAddress}>
        <div class="bg-#ffc border border-#880 p-2 my-2 text-xs">
          Connect your EVM wallet to view your escrows.
        </div>
      </Show>

      <Show when={props.evmAddress}>
        <div class="bg-#f3f3f3 border border-#ccc p-3 my-2">
          <div class="flex justify-between items-center mb-3">
            <div class="font-bold text-sm">My Escrows</div>
            <button class="btn text-xs" onClick={addDemoEscrow}>
              + Demo Escrow
            </button>
          </div>

          <Show
            when={escrows().length > 0}
            fallback={
              <div class="text-xs text-#666 p-4 text-center">
                No escrows yet. Create one or import a share file.
              </div>
            }
          >
            <table class="w-full border-collapse border border-#000 text-xs">
              <thead>
                <tr>
                  <th class="bg-#000066 text-white p-1.5 border border-#000 text-left">ID</th>
                  <th class="bg-#000066 text-white p-1.5 border border-#000 text-left">Asset</th>
                  <th class="bg-#000066 text-white p-1.5 border border-#000 text-left">Amount</th>
                  <th class="bg-#000066 text-white p-1.5 border border-#000 text-left">Fiat</th>
                  <th class="bg-#000066 text-white p-1.5 border border-#000 text-left">Role</th>
                  <th class="bg-#000066 text-white p-1.5 border border-#000 text-left">State</th>
                  <th class="bg-#000066 text-white p-1.5 border border-#000 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                <For each={escrows()}>
                  {(escrow, i) => (
                    <tr class={i() % 2 === 0 ? 'bg-#f8f8f8' : 'bg-white'}>
                      <td class="p-1.5 border border-#999 font-mono">
                        {escrow.id.slice(0, 10)}...
                      </td>
                      <td class="p-1.5 border border-#999">{escrow.asset}</td>
                      <td class="p-1.5 border border-#999">{escrow.amount}</td>
                      <td class="p-1.5 border border-#999">
                        {escrow.fiatAmount} {escrow.fiatCurrency}
                      </td>
                      <td class="p-1.5 border border-#999 capitalize">{escrow.role}</td>
                      <td class={`p-1.5 border border-#999 ${stateColor(escrow.state)}`}>
                        {STATE_LABELS[escrow.state]}
                      </td>
                      <td class="p-1.5 border border-#999">
                        <Show when={escrow.state === EscrowState.Created && escrow.role === 'buyer'}>
                          <button class="btn text-xs py-0.5 mr-1">Confirm</button>
                        </Show>
                        <Show when={escrow.state === EscrowState.BuyerConfirmed && escrow.role === 'buyer'}>
                          <button class="btn text-xs py-0.5 mr-1">Payment Sent</button>
                        </Show>
                        <Show when={escrow.state === EscrowState.PaymentSent && escrow.role === 'seller'}>
                          <button class="btn text-xs py-0.5 mr-1">Confirm Payment</button>
                        </Show>
                        <Show when={escrow.state < EscrowState.Completed}>
                          <button class="btn text-xs py-0.5 bg-#fcc">Dispute</button>
                        </Show>
                      </td>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
          </Show>

          <div class="mt-3 pt-3 border-t border-#ccc">
            <div class="text-xs font-bold mb-2">Import Share</div>
            <div class="flex gap-2">
              <input
                type="file"
                accept=".json"
                class="text-xs"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = () => {
                      try {
                        const share = JSON.parse(reader.result as string);
                        console.log('Imported share:', share);
                        // TODO: Add to escrows list
                      } catch (err) {
                        console.error('Invalid share file:', err);
                      }
                    };
                    reader.readAsText(file);
                  }
                }}
              />
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
}
