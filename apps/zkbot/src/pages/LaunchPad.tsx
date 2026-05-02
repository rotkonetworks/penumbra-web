/**
 * Token LaunchPad - Create tokens and schedule Dutch Auctions
 *
 * Two modes:
 * 1. Create Token - Use token factory to create new tokens (requires token-factory-enabled node)
 * 2. Sell Token - Schedule Dutch Auctions to sell existing tokens at fair market price
 */

import { createSignal, Show, For, createMemo } from 'solid-js';
import { penumbraStore, type BalanceInfo } from '../lib/penumbra';
import { Log, type LogEntry } from '../components/Log';

interface Props {
  onConnect: () => void;
}

type LaunchMode = 'create' | 'sell';

export function LaunchPad(props: Props) {
  const { connection, wallet, scheduleAuction, getPenumbraAssetId, createToken } = penumbraStore;

  // Mode selection
  const [mode, setMode] = createSignal<LaunchMode>('create');

  // Token creation form state
  const [tokenName, setTokenName] = createSignal('');
  const [tokenSymbol, setTokenSymbol] = createSignal('');
  const [tokenDescription, setTokenDescription] = createSignal('');
  const [tokenSupply, setTokenSupply] = createSignal('');
  const [tokenExponent, setTokenExponent] = createSignal('6');
  const [enableMint, setEnableMint] = createSignal(false);

  // Dutch auction form state
  const [selectedAsset, setSelectedAsset] = createSignal<BalanceInfo | null>(null);
  const [amount, setAmount] = createSignal('');
  const [startPrice, setStartPrice] = createSignal('');
  const [endPrice, setEndPrice] = createSignal('');
  const [duration, setDuration] = createSignal('100');
  const [steps, setSteps] = createSignal('10');

  const [processing, setProcessing] = createSignal(false);
  const [logs, setLogs] = createSignal<LogEntry[]>([
    { time: time(), type: 'info', msg: 'launchpad ready - create tokens or schedule auctions' },
  ]);

  function time() {
    return new Date().toLocaleTimeString();
  }

  function log(type: LogEntry['type'], msg: string) {
    setLogs((prev) => [...prev, { time: time(), type, msg }]);
  }

  // Get sellable tokens (exclude UM/penumbra since that's what we receive)
  const sellableTokens = createMemo(() => {
    return wallet.balances.filter(
      (b) => b.symbol !== 'UM' && b.denom !== 'upenumbra' && parseFloat(b.amount) > 0
    );
  });

  // Handle token creation
  async function handleCreateToken() {
    if (!connection.connected) {
      log('err', 'connect wallet first');
      return;
    }

    const name = tokenName().trim();
    const symbol = tokenSymbol().trim().toUpperCase();
    const supply = tokenSupply();

    if (!name) {
      log('err', 'enter token name');
      return;
    }

    if (!symbol) {
      log('err', 'enter token symbol');
      return;
    }

    if (symbol.length > 32) {
      log('err', 'symbol too long (max 32 chars)');
      return;
    }

    const supplyVal = parseFloat(supply);
    if (isNaN(supplyVal) || supplyVal < 0) {
      log('err', 'enter valid supply');
      return;
    }

    setProcessing(true);

    try {
      log('info', `creating token: ${name} (${symbol})`);
      log('info', `supply: ${supply}, decimals: ${tokenExponent()}`);
      if (enableMint()) {
        log('info', 'minting enabled (mintable token)');
      } else {
        log('info', 'minting disabled (fairlaunch token)');
      }

      const result = await createToken({
        name,
        symbol,
        description: tokenDescription().trim() || undefined,
        initialSupply: supply,
        exponent: parseInt(tokenExponent()),
        enableMint: enableMint(),
      });

      if (result.success) {
        log('ok', 'token created!');
        if (result.tokenId) {
          log('info', `token ID: ${result.tokenId.slice(0, 32)}...`);
        }
        if (result.denom) {
          log('info', `denom: ${result.denom.slice(0, 40)}...`);
        }
        if (result.txHash) {
          log('info', `tx: ${result.txHash.slice(0, 16)}...`);
        }

        // Reset form
        setTokenName('');
        setTokenSymbol('');
        setTokenDescription('');
        setTokenSupply('');
        props.onConnect();
      } else {
        log('err', `failed: ${result.error}`);
        if (result.tokenId) {
          log('info', `prepared token ID: ${result.tokenId.slice(0, 32)}...`);
        }
      }
    } catch (error) {
      log('err', `error: ${error}`);
    } finally {
      setProcessing(false);
    }
  }

  // Handle Dutch auction scheduling
  async function handleScheduleAuction() {
    if (!connection.connected) {
      log('err', 'connect wallet first');
      return;
    }

    const asset = selectedAsset();
    if (!asset) {
      log('err', 'select a token to sell');
      return;
    }

    const amountVal = parseFloat(amount());
    if (!amountVal || amountVal <= 0) {
      log('err', 'enter valid amount');
      return;
    }

    if (amountVal > parseFloat(asset.amount)) {
      log('err', `insufficient balance (have: ${asset.amount})`);
      return;
    }

    const startPriceVal = parseFloat(startPrice());
    const endPriceVal = parseFloat(endPrice());
    if (!startPriceVal || startPriceVal <= 0 || !endPriceVal || endPriceVal <= 0) {
      log('err', 'enter valid price range');
      return;
    }

    if (endPriceVal > startPriceVal) {
      log('err', 'end price must be <= start price');
      return;
    }

    const durationVal = parseInt(duration());
    const stepsVal = parseInt(steps());
    if (!durationVal || durationVal <= 0 || !stepsVal || stepsVal <= 0) {
      log('err', 'enter valid duration and steps');
      return;
    }

    if (durationVal % stepsVal !== 0) {
      log('err', 'duration must be divisible by steps');
      return;
    }

    setProcessing(true);

    try {
      log('info', `scheduling auction: ${amount()} ${asset.symbol}`);
      log('info', `price: ${startPrice()} -> ${endPrice()} UM per token`);
      log('info', `duration: ${duration()} blocks, ${steps()} steps`);

      const totalValue = amountVal;
      const maxOutput = (totalValue * startPriceVal).toFixed(6);
      const minOutput = (totalValue * endPriceVal).toFixed(6);

      log('info', `max receive: ${maxOutput} UM`);
      log('info', `min receive: ${minOutput} UM`);

      const result = await scheduleAuction({
        inputAssetId: asset.assetId,
        inputAmount: amount(),
        inputExponent: asset.exponent,
        outputAssetId: getPenumbraAssetId(),
        maxOutputAmount: maxOutput,
        minOutputAmount: minOutput,
        outputExponent: 6,
        durationBlocks: durationVal,
        stepCount: stepsVal,
      });

      if (result.success) {
        log('ok', 'auction scheduled!');
        if (result.auctionId) {
          log('info', `auction ID: ${result.auctionId}...`);
        }
        if (result.txHash) {
          log('info', `tx: ${result.txHash.slice(0, 16)}...`);
        }
        log('info', 'auction will start in ~10 blocks');

        // Reset form
        setAmount('');
        setStartPrice('');
        setEndPrice('');
        setSelectedAsset(null);
        props.onConnect();
      } else {
        log('err', `failed: ${result.error}`);
      }
    } catch (error) {
      log('err', `error: ${error}`);
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div>
      <div class="mb-4">
        <div class="text-cyan text-12px mb-2 pb-1 border-b border-border">
          // token launchpad
        </div>
        <p class="text-dim text-12px">
          create new tokens or sell existing ones via dutch auction. shielded, fair, no sniping.
        </p>
      </div>

      {/* Mode Tabs */}
      <div class="flex mb-4 border-b border-border">
        <button
          class={`px-4 py-2 text-12px cursor-pointer border-b-2 transition-colors ${
            mode() === 'create'
              ? 'border-accent text-accent'
              : 'border-transparent text-dim hover:text-text'
          }`}
          onClick={() => setMode('create')}
        >
          create token
        </button>
        <button
          class={`px-4 py-2 text-12px cursor-pointer border-b-2 transition-colors ${
            mode() === 'sell'
              ? 'border-accent text-accent'
              : 'border-transparent text-dim hover:text-text'
          }`}
          onClick={() => setMode('sell')}
        >
          sell token (auction)
        </button>
      </div>

      <div class="grid grid-cols-2 gap-4 mb-4">
        {/* Form */}
        <div class="bg-input border border-border p-4">
          <Show
            when={connection.connected}
            fallback={
              <div class="text-center py-4">
                <p class="text-dim text-12px mb-3">connect wallet to continue</p>
                <button
                  class="bg-bg border border-accent-dim text-accent px-4 py-2 text-12px cursor-pointer hover:bg-accent-dim hover:text-bg"
                  onClick={() => penumbraStore.connect()}
                >
                  connect penumbra
                </button>
              </div>
            }
          >
            <Show when={mode() === 'create'}>
              {/* Token Creation Form */}
              <div class="text-cyan text-11px mb-3">create new token</div>

              <div class="mb-3">
                <label class="text-dim text-11px block mb-1">token name *</label>
                <input
                  type="text"
                  class="w-full bg-bg border border-border text-text px-3 py-2 text-13px focus:outline-none focus:border-accent-dim"
                  placeholder="My Token"
                  value={tokenName()}
                  onInput={(e) => setTokenName(e.currentTarget.value)}
                />
              </div>

              <div class="mb-3">
                <label class="text-dim text-11px block mb-1">symbol * (max 32 chars)</label>
                <input
                  type="text"
                  class="w-full bg-bg border border-border text-text px-3 py-2 text-13px uppercase focus:outline-none focus:border-accent-dim"
                  placeholder="MYTKN"
                  maxLength={32}
                  value={tokenSymbol()}
                  onInput={(e) => setTokenSymbol(e.currentTarget.value.toUpperCase())}
                />
              </div>

              <div class="mb-3">
                <label class="text-dim text-11px block mb-1">description</label>
                <textarea
                  class="w-full bg-bg border border-border text-text px-3 py-2 text-13px focus:outline-none focus:border-accent-dim resize-none"
                  rows={2}
                  placeholder="Optional description..."
                  value={tokenDescription()}
                  onInput={(e) => setTokenDescription(e.currentTarget.value)}
                />
              </div>

              <div class="grid grid-cols-2 gap-2 mb-3">
                <div>
                  <label class="text-dim text-11px block mb-1">initial supply *</label>
                  <input
                    type="text"
                    class="w-full bg-bg border border-border text-text px-3 py-2 text-13px focus:outline-none focus:border-accent-dim"
                    placeholder="1000000"
                    value={tokenSupply()}
                    onInput={(e) => setTokenSupply(e.currentTarget.value.replace(/[^0-9.]/g, ''))}
                  />
                </div>
                <div>
                  <label class="text-dim text-11px block mb-1">decimals</label>
                  <select
                    class="w-full bg-bg border border-border text-text px-3 py-2 text-13px focus:outline-none focus:border-accent-dim"
                    value={tokenExponent()}
                    onChange={(e) => setTokenExponent(e.currentTarget.value)}
                  >
                    <option value="0">0</option>
                    <option value="2">2</option>
                    <option value="6">6 (default)</option>
                    <option value="8">8</option>
                    <option value="18">18</option>
                  </select>
                </div>
              </div>

              <div class="mb-4">
                <label class="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    class="mr-2"
                    checked={enableMint()}
                    onChange={(e) => setEnableMint(e.currentTarget.checked)}
                  />
                  <span class="text-dim text-11px">
                    enable minting <span class="text-purple">(for bridges)</span>
                  </span>
                </label>
                <p class="text-dim text-10px mt-1 ml-5">
                  if enabled, you'll receive a mint capability to create more tokens later
                </p>
              </div>

              <button
                class="w-full bg-bg border border-accent-dim text-accent px-4 py-2 text-13px cursor-pointer hover:bg-accent-dim hover:text-bg disabled:opacity-50"
                onClick={handleCreateToken}
                disabled={processing() || !tokenName() || !tokenSymbol()}
              >
                {processing() ? 'creating...' : '> create token'}
              </button>

              <div class="mt-3 p-2 bg-bg border border-warn-dim text-10px">
                <span class="text-warn">note:</span>
                <span class="text-dim ml-1">
                  requires a node running the penumbra-token-factory fork
                </span>
              </div>
            </Show>

            <Show when={mode() === 'sell'}>
              {/* Dutch Auction Form */}
              <div class="text-cyan text-11px mb-3">schedule dutch auction</div>

              <div class="mb-3">
                <label class="text-dim text-11px block mb-1">token to sell</label>
                <select
                  class="w-full bg-bg border border-border text-text px-3 py-2 text-13px focus:outline-none focus:border-accent-dim"
                  onChange={(e) => {
                    const asset = sellableTokens().find((t) => t.assetId === e.currentTarget.value);
                    setSelectedAsset(asset ?? null);
                  }}
                >
                  <option value="">select token...</option>
                  <For each={sellableTokens()}>
                    {(token) => (
                      <option value={token.assetId}>
                        {token.symbol} ({token.amount})
                      </option>
                    )}
                  </For>
                </select>
                <Show when={sellableTokens().length === 0}>
                  <p class="text-warn text-10px mt-1">no tokens available to sell</p>
                </Show>
              </div>

              <div class="mb-3">
                <label class="text-dim text-11px block mb-1">
                  amount to sell
                  <Show when={selectedAsset()}>
                    <span class="text-accent ml-2">(max: {selectedAsset()!.amount})</span>
                  </Show>
                </label>
                <div class="flex">
                  <input
                    type="text"
                    class="flex-1 bg-bg border border-border text-text px-3 py-2 text-13px focus:outline-none focus:border-accent-dim"
                    placeholder="0.00"
                    value={amount()}
                    onInput={(e) => setAmount(e.currentTarget.value.replace(/[^0-9.]/g, ''))}
                  />
                  <Show when={selectedAsset()}>
                    <button
                      class="bg-bg border border-border border-l-0 px-2 text-dim text-10px hover:text-text cursor-pointer"
                      onClick={() => setAmount(selectedAsset()!.amount)}
                    >
                      MAX
                    </button>
                  </Show>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-2 mb-3">
                <div>
                  <label class="text-dim text-11px block mb-1">start price (UM)</label>
                  <input
                    type="text"
                    class="w-full bg-bg border border-border text-text px-3 py-2 text-13px focus:outline-none focus:border-accent-dim"
                    placeholder="1.00"
                    value={startPrice()}
                    onInput={(e) => setStartPrice(e.currentTarget.value.replace(/[^0-9.]/g, ''))}
                  />
                </div>
                <div>
                  <label class="text-dim text-11px block mb-1">end price (UM)</label>
                  <input
                    type="text"
                    class="w-full bg-bg border border-border text-text px-3 py-2 text-13px focus:outline-none focus:border-accent-dim"
                    placeholder="0.50"
                    value={endPrice()}
                    onInput={(e) => setEndPrice(e.currentTarget.value.replace(/[^0-9.]/g, ''))}
                  />
                </div>
              </div>

              <div class="grid grid-cols-2 gap-2 mb-4">
                <div>
                  <label class="text-dim text-11px block mb-1">duration (blocks)</label>
                  <input
                    type="text"
                    class="w-full bg-bg border border-border text-text px-3 py-2 text-13px focus:outline-none focus:border-accent-dim"
                    placeholder="100"
                    value={duration()}
                    onInput={(e) => setDuration(e.currentTarget.value.replace(/[^0-9]/g, ''))}
                  />
                </div>
                <div>
                  <label class="text-dim text-11px block mb-1">price steps</label>
                  <input
                    type="text"
                    class="w-full bg-bg border border-border text-text px-3 py-2 text-13px focus:outline-none focus:border-accent-dim"
                    placeholder="10"
                    value={steps()}
                    onInput={(e) => setSteps(e.currentTarget.value.replace(/[^0-9]/g, ''))}
                  />
                </div>
              </div>

              <button
                class="w-full bg-bg border border-accent-dim text-accent px-4 py-2 text-13px cursor-pointer hover:bg-accent-dim hover:text-bg disabled:opacity-50"
                onClick={handleScheduleAuction}
                disabled={processing() || !selectedAsset()}
              >
                {processing() ? 'scheduling...' : '> schedule auction'}
              </button>
            </Show>
          </Show>
        </div>

        {/* Info Panel */}
        <div class="bg-input border border-border p-4">
          <Show when={mode() === 'create'}>
            <div class="text-cyan text-11px mb-3">token factory</div>

            <div class="text-11px text-dim space-y-2 mb-4">
              <p>create new tokens on penumbra with custom metadata:</p>
              <ul class="list-disc list-inside space-y-1 ml-2">
                <li><span class="text-accent">fairlaunch</span> - fixed supply, no minting</li>
                <li><span class="text-accent">mintable</span> - for bridges, can mint more</li>
              </ul>
            </div>

            <div class="text-12px border-t border-border pt-3 mb-4">
              <div class="flex py-1">
                <span class="text-dim w-28">supply:</span>
                <span class="text-accent">user-defined</span>
              </div>
              <div class="flex py-1">
                <span class="text-dim w-28">decimals:</span>
                <span class="text-accent">configurable</span>
              </div>
              <div class="flex py-1">
                <span class="text-dim w-28">minting:</span>
                <span class="text-accent">optional cap</span>
              </div>
              <div class="flex py-1">
                <span class="text-dim w-28">denom:</span>
                <span class="text-accent">factory/&lt;id&gt;</span>
              </div>
            </div>

            <div class="text-10px text-dim border-t border-border pt-3">
              the mint capability is a unique asset that proves your right to mint tokens.
              spend it to mint, and you'll receive a new capability with an incremented sequence.
            </div>
          </Show>

          <Show when={mode() === 'sell'}>
            <div class="text-cyan text-11px mb-3">how dutch auctions work</div>

            <ol class="text-11px text-dim space-y-2 list-decimal list-inside mb-4">
              <li>Price starts at <span class="text-accent">start price</span></li>
              <li>Price decreases each step towards <span class="text-accent">end price</span></li>
              <li>Anyone can buy at current price</li>
              <li>Auction ends when tokens sold or time expires</li>
            </ol>

            <div class="text-12px border-t border-border pt-3">
              <div class="flex py-1">
                <span class="text-dim w-28">mempool:</span>
                <span class="text-accent">encrypted</span>
              </div>
              <div class="flex py-1">
                <span class="text-dim w-28">balances:</span>
                <span class="text-accent">shielded</span>
              </div>
              <div class="flex py-1">
                <span class="text-dim w-28">sniping:</span>
                <span class="text-accent">impossible</span>
              </div>
              <div class="flex py-1">
                <span class="text-dim w-28">price:</span>
                <span class="text-accent">fair discovery</span>
              </div>
            </div>

            <div class="mt-4 pt-3 border-t border-border text-10px text-dim">
              ~5 seconds per block. 100 blocks = 8 minutes.
            </div>
          </Show>
        </div>
      </div>

      {/* Comparison (shown for sell mode) */}
      <Show when={mode() === 'sell'}>
        <div class="grid grid-cols-2 gap-4 mb-4">
          <div class="bg-input border border-border p-3">
            <div class="text-purple mb-2 text-12px">penumbra (dutch auction)</div>
            <div class="text-10px text-dim leading-relaxed">
              + encrypted mempool - no frontrunning
              <br />
              + shielded balances - no tracking
              <br />
              + batch auctions - fair execution
              <br />
              + price discovery - market decides
            </div>
          </div>
          <div class="bg-input border border-border p-3">
            <div class="text-warn mb-2 text-12px">pump.fun style (avoid)</div>
            <div class="text-10px text-dim leading-relaxed">
              - public mempool - instant sniping
              <br />
              - visible balances - whale tracking
              <br />
              - bonding curves - manipulatable
              <br />
              - fixed pricing - no discovery
            </div>
          </div>
        </div>
      </Show>

      <Log entries={logs()} />
    </div>
  );
}
