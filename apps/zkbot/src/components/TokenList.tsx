import {
  createSignal,
  createResource,
  createMemo,
  For,
  Show,
  onCleanup,
  batch,
  type Accessor,
} from 'solid-js';
import { createStore, produce } from 'solid-js/store';

// ============================================================================
// Types
// ============================================================================

interface TokenMetadata {
  description: string;
  website: string;
}

interface TokenData {
  id: string;
  name: string;
  symbol: string;
  creator: string;
  initialSupply: number;
  mintable: boolean;
  createdAt: number;
  metadata: TokenMetadata;
}

interface MarketData {
  price: number;
  marketCap: number;
  change24h: number;
  volume24h: number;
  holders: number;
}

interface TokenWithMarket extends TokenData {
  market: MarketData;
}

type SortKey = 'new' | 'mcap' | 'change';

interface TokensResponse {
  tokens: TokenData[];
}

// ============================================================================
// Data Fetching
// ============================================================================

const fetchTokens = async (): Promise<TokenData[]> => {
  const res = await fetch('/tokens.json');
  if (!res.ok) throw new Error('Failed to fetch tokens');
  const data: TokensResponse = await res.json();
  return data.tokens;
};

// ============================================================================
// Market Simulation
// ============================================================================

const seedRandom = (seed: number) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

const generateMarketData = (token: TokenData, tick: number): MarketData => {
  // Deterministic but varying prices based on token id hash + tick
  const hash = token.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const base = seedRandom(hash);

  // Price derives from supply (inverse relationship) with some randomness
  const supplyFactor = Math.log10(token.initialSupply + 1);
  const basePrice = (base * 0.01) / supplyFactor;
  const priceVariation = 1 + (seedRandom(hash + tick) - 0.5) * 0.02;
  const price = basePrice * priceVariation;

  // Market cap = price * circulating supply (assume 80% circulating)
  const circulatingSupply = token.initialSupply * 0.8;
  const marketCap = price * circulatingSupply;

  // 24h change based on accumulated ticks
  const change24h = (seedRandom(hash + Math.floor(tick / 10)) - 0.3) * 100;

  // Volume correlates with market cap
  const volume24h = marketCap * (0.1 + seedRandom(hash + tick) * 0.3);

  // Holders grows logarithmically with age
  const ageMs = Date.now() - token.createdAt;
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  const holders = Math.floor(10 + Math.log(ageDays + 1) * 50 * base);

  return { price, marketCap, change24h, volume24h, holders };
};

// ============================================================================
// Formatters
// ============================================================================

const formatNumber = (n: number): string => {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(2)}K`;
  return n.toFixed(2);
};

const formatPrice = (n: number): string => {
  if (n < 0.000001) return n.toExponential(2);
  if (n < 0.0001) return n.toFixed(8);
  if (n < 0.01) return n.toFixed(6);
  if (n < 1) return n.toFixed(4);
  return n.toFixed(2);
};

const timeAgo = (timestamp: number): string => {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
};

// ============================================================================
// Components
// ============================================================================

interface SortButtonProps {
  active: boolean;
  onClick: () => void;
  children: string;
}

const SortButton = (props: SortButtonProps) => (
  <button
    class={`px-2 py-0.5 border cursor-pointer transition-colors ${
      props.active
        ? 'border-accent text-accent'
        : 'border-border text-dim hover:text-text'
    }`}
    onClick={props.onClick}
  >
    {props.children}
  </button>
);

interface TokenCardProps {
  token: TokenData;
  market: Accessor<MarketData>;
  onSelect?: (token: TokenData) => void;
}

const TokenCard = (props: TokenCardProps) => {
  const market = props.market;

  return (
    <div
      class="bg-input border border-border p-3 hover:border-accent-dim cursor-pointer transition-colors"
      onClick={() => props.onSelect?.(props.token)}
    >
      {/* Header */}
      <div class="flex justify-between items-start mb-2">
        <div class="flex items-center gap-2">
          <span class="text-accent font-bold">${props.token.symbol}</span>
          <span class="text-dim text-11px">{props.token.name}</span>
          <Show when={props.token.mintable}>
            <span class="text-warn text-10px border border-warn px-1">MINT</span>
          </Show>
        </div>
        <span class="text-dim text-10px">{timeAgo(props.token.createdAt)}</span>
      </div>

      {/* Stats Grid - fine-grained reactivity on each value */}
      <div class="grid grid-cols-4 gap-4 text-11px">
        <div>
          <div class="text-dim">mcap</div>
          <div class="text-text">${formatNumber(market().marketCap)}</div>
        </div>
        <div>
          <div class="text-dim">price</div>
          <div class="text-text">${formatPrice(market().price)}</div>
        </div>
        <div>
          <div class="text-dim">24h</div>
          <div class={market().change24h >= 0 ? 'text-accent' : 'text-err'}>
            {market().change24h >= 0 ? '+' : ''}
            {market().change24h.toFixed(1)}%
          </div>
        </div>
        <div>
          <div class="text-dim">holders</div>
          <div class="text-text">{market().holders}</div>
        </div>
      </div>

      {/* Token ID */}
      <div class="mt-2 text-10px text-dim truncate">{props.token.id}</div>
    </div>
  );
};

// ============================================================================
// Main Component
// ============================================================================

interface TokenListProps {
  onSelect?: (token: TokenData) => void;
}

export function TokenList(props: TokenListProps) {
  // Fetch token data
  const [tokens] = createResource(fetchTokens);

  // Market data store - reactive per-token updates
  const [marketStore, setMarketStore] = createStore<Record<string, MarketData>>({});

  // UI state
  const [sortBy, setSortBy] = createSignal<SortKey>('new');
  const [tick, setTick] = createSignal(0);

  // Initialize and update market data
  const updateMarkets = () => {
    const tokenList = tokens();
    if (!tokenList) return;

    const currentTick = tick();

    batch(() => {
      setMarketStore(
        produce((store) => {
          for (const token of tokenList) {
            store[token.id] = generateMarketData(token, currentTick);
          }
        })
      );
    });
  };

  // Market tick interval
  const interval = setInterval(() => {
    setTick((t) => t + 1);
    updateMarkets();
  }, 3000);

  onCleanup(() => clearInterval(interval));

  // Initial market data when tokens load
  createMemo(() => {
    if (tokens()) updateMarkets();
  });

  // Sorted tokens - recomputes only when sort key or tokens change
  const sortedTokens = createMemo(() => {
    const list = tokens();
    if (!list) return [];

    const withMarket = list.map((t) => ({
      ...t,
      market: marketStore[t.id] ?? generateMarketData(t, 0),
    }));

    const key = sortBy();
    return [...withMarket].sort((a, b) => {
      switch (key) {
        case 'mcap':
          return b.market.marketCap - a.market.marketCap;
        case 'change':
          return b.market.change24h - a.market.change24h;
        default: // 'new'
          return b.createdAt - a.createdAt;
      }
    });
  });

  // Create stable accessor for each token's market data
  const getMarketAccessor = (tokenId: string): Accessor<MarketData> => {
    return () => marketStore[tokenId] ?? { price: 0, marketCap: 0, change24h: 0, volume24h: 0, holders: 0 };
  };

  return (
    <div>
      {/* Header */}
      <div class="flex justify-between items-center mb-3">
        <div class="text-cyan text-12px">// live tokens</div>
        <div class="flex gap-2 text-11px">
          <SortButton active={sortBy() === 'new'} onClick={() => setSortBy('new')}>
            new
          </SortButton>
          <SortButton active={sortBy() === 'mcap'} onClick={() => setSortBy('mcap')}>
            mcap
          </SortButton>
          <SortButton active={sortBy() === 'change'} onClick={() => setSortBy('change')}>
            gainers
          </SortButton>
        </div>
      </div>

      {/* Loading State */}
      <Show when={tokens.loading}>
        <div class="text-dim text-12px py-8 text-center">loading tokens...</div>
      </Show>

      {/* Error State */}
      <Show when={tokens.error}>
        <div class="text-err text-12px py-8 text-center">
          failed to load tokens: {String(tokens.error)}
        </div>
      </Show>

      {/* Token List */}
      <Show when={tokens()}>
        <div class="grid gap-2">
          <For each={sortedTokens()}>
            {(token) => (
              <TokenCard
                token={token}
                market={getMarketAccessor(token.id)}
                onSelect={props.onSelect}
              />
            )}
          </For>
        </div>

        {/* Footer */}
        <div class="mt-3 text-10px text-dim text-center">
          {sortedTokens().length} tokens | prices update every 3s
        </div>
      </Show>
    </div>
  );
}
