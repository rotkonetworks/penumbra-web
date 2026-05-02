import { createSignal, Show, For } from 'solid-js';
import { generateSecret, generateShares, exportShareSet, ShareExport } from '../lib/vss';
import { createEscrow, generateEscrowId } from '../lib/escrow';
import { PENUMBRA_ASSETS } from '../lib/config';

interface Props {
  penumbraAddress: string | null;
  evmAddress: string | null;
}

type Asset = 'UM' | 'USDC';

interface GeneratedShares {
  shares: ShareExport[];
  commitment: `0x${string}`;
  escrowPubkey: `0x${string}`;
  shareC: `0x${string}`;
  secret: Uint8Array;
}

export function CreateEscrow(props: Props) {
  const [asset, setAsset] = createSignal<Asset>('UM');
  const [amount, setAmount] = createSignal('');
  const [fiatAmount, setFiatAmount] = createSignal('');
  const [fiatCurrency, setFiatCurrency] = createSignal('USD');
  const [paymentMethod, setPaymentMethod] = createSignal('Bank Transfer');

  const [generatedShares, setGeneratedShares] = createSignal<GeneratedShares | null>(null);
  const [step, setStep] = createSignal<'form' | 'shares' | 'confirm'>('form');
  const [status, setStatus] = createSignal<{ type: 'ok' | 'warn' | 'err'; msg: string } | null>(null);
  const [txHash, setTxHash] = createSignal<string | null>(null);

  const handleGenerateShares = () => {
    if (!amount() || parseFloat(amount()) <= 0) {
      setStatus({ type: 'err', msg: 'Enter a valid amount' });
      return;
    }

    const secret = generateSecret();
    const { shares, commitment, escrowPubkey, shareC } = generateShares(secret);

    setGeneratedShares({
      shares: shares as ShareExport[],
      commitment,
      escrowPubkey,
      shareC,
      secret,
    });
    setStep('shares');
    setStatus({ type: 'ok', msg: 'Shares generated! Save your seller share (Share 0).' });
  };

  const handleCreateOnChain = async () => {
    if (!props.evmAddress) {
      setStatus({ type: 'err', msg: 'Connect EVM wallet first' });
      return;
    }

    const shares = generatedShares();
    if (!shares) return;

    setStatus({ type: 'warn', msg: 'Sending transaction...' });

    try {
      // Generate escrow ID from seller address and timestamp
      const escrowId = generateEscrowId(props.evmAddress, BigInt(Date.now()));

      // Pass all 4 params including shareC
      const hash = await createEscrow(escrowId, shares.commitment, shares.escrowPubkey, shares.shareC);
      setTxHash(hash);
      setStep('confirm');
      setStatus({ type: 'ok', msg: `Escrow created! TX: ${hash.slice(0, 18)}...` });
    } catch (e: any) {
      setStatus({ type: 'err', msg: `Failed: ${e.message}` });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setStatus({ type: 'ok', msg: 'Copied to clipboard!' });
    setTimeout(() => setStatus(null), 2000);
  };

  const downloadShare = (shareIndex: number) => {
    const shares = generatedShares();
    if (!shares) return;

    const shareData = {
      ...shares.shares[shareIndex],
      commitment: shares.commitment,
      escrowPubkey: shares.escrowPubkey,
    };

    const blob = new Blob([JSON.stringify(shareData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `share_${shareIndex}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <Show when={status()}>
        <div
          class={`p-2 my-2 border text-xs ${
            status()!.type === 'ok'
              ? 'bg-#cfc border-#080'
              : status()!.type === 'warn'
              ? 'bg-#ffc border-#880'
              : 'bg-#fcc border-#800'
          }`}
        >
          {status()!.msg}
        </div>
      </Show>

      <Show when={step() === 'form'}>
        <div class="bg-#f3f3f3 border border-#ccc p-3 my-2">
          <div class="font-bold text-sm mb-3">Create New Escrow</div>

          <div class="grid gap-3" style={{ "grid-template-columns": "120px 1fr" }}>
            <label class="text-xs pt-1">Asset:</label>
            <select
              class="border border-#666 px-2 py-1 text-sm"
              value={asset()}
              onChange={(e) => setAsset(e.target.value as Asset)}
            >
              <option value="UM">UM (Penumbra)</option>
              <option value="USDC">USDC</option>
            </select>

            <label class="text-xs pt-1">Amount:</label>
            <input
              type="number"
              class="border border-#666 px-2 py-1 text-sm"
              placeholder={`Amount in ${asset()}`}
              value={amount()}
              onInput={(e) => setAmount(e.target.value)}
            />

            <label class="text-xs pt-1">Fiat Amount:</label>
            <div class="flex gap-1">
              <input
                type="number"
                class="border border-#666 px-2 py-1 text-sm flex-1"
                placeholder="Amount"
                value={fiatAmount()}
                onInput={(e) => setFiatAmount(e.target.value)}
              />
              <select
                class="border border-#666 px-2 py-1 text-sm w-20"
                value={fiatCurrency()}
                onChange={(e) => setFiatCurrency(e.target.value)}
              >
                <option>USD</option>
                <option>EUR</option>
                <option>GBP</option>
              </select>
            </div>

            <label class="text-xs pt-1">Payment:</label>
            <select
              class="border border-#666 px-2 py-1 text-sm"
              value={paymentMethod()}
              onChange={(e) => setPaymentMethod(e.target.value)}
            >
              <option>Bank Transfer</option>
              <option>PayPal</option>
              <option>Wise</option>
              <option>Revolut</option>
              <option>Cash</option>
            </select>
          </div>

          <div class="mt-4">
            <button class="btn" onClick={handleGenerateShares}>
              Generate VSS Shares
            </button>
          </div>
        </div>
      </Show>

      <Show when={step() === 'shares'}>
        <div class="bg-#f3f3f3 border border-#ccc p-3 my-2">
          <div class="font-bold text-sm mb-3">VSS Shares Generated</div>

          <div class="text-xs mb-2">
            <strong>Commitment:</strong>
            <div
              class="font-mono text-xs break-all cursor-pointer p-1 bg-#f0f0f0 border border-#ccc hover:bg-#e0e0e0 mt-1"
              onClick={() => copyToClipboard(generatedShares()!.commitment)}
            >
              {generatedShares()!.commitment}
            </div>
          </div>

          <div class="text-xs mb-3">
            <strong>Escrow Pubkey:</strong>
            <div
              class="font-mono text-xs break-all cursor-pointer p-1 bg-#f0f0f0 border border-#ccc hover:bg-#e0e0e0 mt-1"
              onClick={() => copyToClipboard(generatedShares()!.escrowPubkey)}
            >
              {generatedShares()!.escrowPubkey}
            </div>
          </div>

          <table class="w-full border-collapse border border-#000 text-xs">
            <thead>
              <tr>
                <th class="bg-#000066 text-white p-1.5 border border-#000 text-left">Share</th>
                <th class="bg-#000066 text-white p-1.5 border border-#000 text-left">Role</th>
                <th class="bg-#000066 text-white p-1.5 border border-#000 text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="p-1.5 border border-#999 bg-#f8f8f8">Share 0</td>
                <td class="p-1.5 border border-#999 bg-#f8f8f8">Seller (You)</td>
                <td class="p-1.5 border border-#999 bg-#f8f8f8">
                  <button class="btn text-xs py-0.5" onClick={() => downloadShare(0)}>
                    Download
                  </button>
                </td>
              </tr>
              <tr>
                <td class="p-1.5 border border-#999 bg-white">Share 1</td>
                <td class="p-1.5 border border-#999 bg-white">Buyer</td>
                <td class="p-1.5 border border-#999 bg-white">
                  <button class="btn text-xs py-0.5" onClick={() => downloadShare(1)}>
                    Download
                  </button>
                </td>
              </tr>
              <tr>
                <td class="p-1.5 border border-#999 bg-#f8f8f8">Share 2</td>
                <td class="p-1.5 border border-#999 bg-#f8f8f8">Chain (Escrow)</td>
                <td class="p-1.5 border border-#999 bg-#f8f8f8">
                  <span class="text-#666">Stored on-chain</span>
                </td>
              </tr>
            </tbody>
          </table>

          <div class="mt-3 p-2 bg-#ffc border border-#880 text-xs">
            <strong>Important:</strong> Save Share 0 (seller) securely. Share Share 1 with the buyer.
            Share 2 will be stored on-chain and revealed only during disputes.
          </div>

          <div class="mt-3 flex gap-2">
            <button class="btn" onClick={() => setStep('form')}>
              Back
            </button>
            <button
              class="btn"
              onClick={handleCreateOnChain}
              disabled={!props.evmAddress}
            >
              {props.evmAddress ? 'Create Escrow On-Chain' : 'Connect EVM Wallet First'}
            </button>
          </div>
        </div>
      </Show>

      <Show when={step() === 'confirm'}>
        <div class="bg-#cfc border border-#080 p-3 my-2">
          <div class="font-bold text-sm mb-2">Escrow Created!</div>

          <div class="text-xs mb-2">
            <strong>Transaction Hash:</strong>
            <div
              class="font-mono text-xs break-all cursor-pointer p-1 bg-#f0f0f0 border border-#ccc hover:bg-#e0e0e0 mt-1"
              onClick={() => copyToClipboard(txHash()!)}
            >
              {txHash()}
            </div>
          </div>

          <div class="text-xs">
            Now share the escrow details and Share 1 with your buyer.
            Once they confirm, you can proceed with the trade.
          </div>

          <div class="mt-3">
            <button
              class="btn"
              onClick={() => {
                setStep('form');
                setGeneratedShares(null);
                setTxHash(null);
                setAmount('');
                setFiatAmount('');
              }}
            >
              Create Another
            </button>
          </div>
        </div>
      </Show>
    </div>
  );
}
