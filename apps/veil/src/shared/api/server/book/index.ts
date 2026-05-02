import { NextRequest, NextResponse } from 'next/server';
import { ChainRegistryClient } from '@penumbra-labs/registry';
import {
  SimulateTradeRequest,
  SimulateTradeResponse,
} from '@penumbra-zone/protobuf/penumbra/core/component/dex/v1/dex_pb';
import { Value } from '@penumbra-zone/protobuf/penumbra/core/asset/v1/asset_pb';
import { Amount } from '@penumbra-zone/protobuf/penumbra/core/num/v1/num_pb';
import { RouteBookResponseJson } from '@/shared/api/server/book/types.ts';
import { processSimulation } from '@/shared/api/server/book/helpers.ts';
import { serializeResponse } from '@/shared/api/server/book/serialization.ts';
import { SimulationService } from '@penumbra-zone/protobuf';
import { Client } from '@connectrpc/connect';
import { createClient } from '@/shared/utils/protos/utils.ts';

export const VERY_HIGH_AMOUNT = new Amount({ hi: 10000n }); // Used as default to generate sufficient amount of traces
export const TRACE_LIMIT_DEFAULT = 8;

export type RouteBookApiResponse = RouteBookResponseJson | { error: string };

// Server-side cache for route book responses. pd's simulateTrade is
// CPU-expensive (walks all liquidity positions) so we cache identical
// queries for ~6s (one block). Keyed by base+quote+limit. Concurrent
// requests for the same key share a single in-flight promise so we
// never hammer pd with duplicate work.
type CacheEntry = { data: RouteBookResponseJson; expiresAt: number };
const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<RouteBookResponseJson>>();
const CACHE_TTL_MS = 6_000;

export async function GET(req: NextRequest): Promise<NextResponse<RouteBookApiResponse>> {
  // Prefer a server-only internal endpoint (localhost / private network) to
  // skip TLS, NAT, and reverse-proxy overhead. Falls back to public endpoint.
  const grpcEndpoint =
    process.env['PENUMBRA_GRPC_ENDPOINT_INTERNAL'] ?? process.env['PENUMBRA_GRPC_ENDPOINT'];
  const chainId = process.env['PENUMBRA_CHAIN_ID'];
  if (!grpcEndpoint || !chainId) {
    return NextResponse.json(
      { error: 'PENUMBRA_GRPC_ENDPOINT or PENUMBRA_CHAIN_ID is not set' },
      { status: 500 },
    );
  }

  const { searchParams } = new URL(req.url);
  const baseAssetSymbol = searchParams.get('baseAsset');
  const quoteAssetSymbol = searchParams.get('quoteAsset');
  const traceParam = searchParams.get('traceLimit');
  const limit = traceParam ? Number(traceParam) : TRACE_LIMIT_DEFAULT;
  if (!baseAssetSymbol || !quoteAssetSymbol) {
    return NextResponse.json(
      { error: 'Missing required baseAsset or quoteAsset' },
      { status: 400 },
    );
  }

  const cacheKey = `${baseAssetSymbol.toLowerCase()}|${quoteAssetSymbol.toLowerCase()}|${limit}`;
  const now = Date.now();

  // Fast path: serve from in-memory cache if fresh.
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return NextResponse.json(cached.data, {
      headers: {
        'Cache-Control': 'public, s-maxage=6, stale-while-revalidate=60',
        'X-Cache': 'HIT',
      },
    });
  }

  // Single-flight: if another request for the same key is already
  // computing, await it instead of starting a duplicate pd query.
  const existing = inflight.get(cacheKey);
  if (existing) {
    const data = await existing;
    return NextResponse.json(data, {
      headers: { 'X-Cache': 'INFLIGHT' },
    });
  }

  const compute = (async (): Promise<RouteBookResponseJson> => {
    return await computeRouteBook(grpcEndpoint, chainId, baseAssetSymbol, quoteAssetSymbol, limit);
  })();
  inflight.set(cacheKey, compute);

  let data: RouteBookResponseJson;
  try {
    data = await compute;
    cache.set(cacheKey, { data, expiresAt: Date.now() + CACHE_TTL_MS });
  } finally {
    inflight.delete(cacheKey);
  }

  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 'public, s-maxage=6, stale-while-revalidate=60',
      'X-Cache': 'MISS',
    },
  });
}

async function computeRouteBook(
  grpcEndpoint: string,
  chainId: string,
  baseAssetSymbol: string,
  quoteAssetSymbol: string,
  limit: number,
): Promise<RouteBookResponseJson> {
  const registryClient = new ChainRegistryClient();
  const registry = await registryClient.remote.get(chainId);

  const allAssets = registry.getAllAssets();
  const baseAssetMetadata = allAssets.find(
    a => a.symbol.toLowerCase() === baseAssetSymbol.toLowerCase(),
  );
  const quoteAssetMetadata = allAssets.find(
    a => a.symbol.toLowerCase() === quoteAssetSymbol.toLowerCase(),
  );
  if (!baseAssetMetadata || !quoteAssetMetadata) {
    throw new Error('Base asset or quoteAsset metadata not found in registry');
  }

  const buySideRequest = new SimulateTradeRequest({
    input: new Value({
      assetId: baseAssetMetadata.penumbraAssetId,
      amount: VERY_HIGH_AMOUNT,
    }),
    output: quoteAssetMetadata.penumbraAssetId,
  });

  const sellSideRequest = new SimulateTradeRequest({
    input: new Value({
      assetId: quoteAssetMetadata.penumbraAssetId,
      amount: VERY_HIGH_AMOUNT,
    }),
    output: baseAssetMetadata.penumbraAssetId,
  });

  const client = createClient(grpcEndpoint, SimulationService);
  const [buyRes, sellRes] = await Promise.all([
    simulateTrade(client, buySideRequest),
    simulateTrade(client, sellSideRequest),
  ]);
  const buyMulti = processSimulation({ res: buyRes, registry, limit, quote_to_base: false });
  const sellMulti = processSimulation({ res: sellRes, registry, limit, quote_to_base: true });

  return serializeResponse({
    singleHops: {
      buy: buyMulti.filter(t => t.hops.length === 2),
      sell: sellMulti.filter(t => t.hops.length === 2),
    },
    multiHops: { buy: buyMulti, sell: sellMulti },
  });
}

const simulateTrade = async (
  client: Client<typeof SimulationService>,
  req: SimulateTradeRequest,
) => {
  try {
    return await client.simulateTrade(req);
  } catch (e) {
    // If the error contains 'there are no orders to fulfill this swap', there are no orders to fulfill the trade,
    // so just return an empty array
    if (e instanceof Error && e.message.includes('there are no orders to fulfill this swap')) {
      return new SimulateTradeResponse({});
    }

    throw new Error(`Error retrieving route book: ${String(e)}`);
  }
};
