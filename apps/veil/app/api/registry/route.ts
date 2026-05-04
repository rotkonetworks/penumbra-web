// Server-side proxy to the chain-registry. The registry is large
// (~250KB pre-gzip on penumbra-1) and changes rarely, so we want it
// fetched once per hour by Next.js and shared across every visitor;
// the client then caches the result in localStorage on top.
//
// Hoisting the fetch off the root layout's RSC payload removes the
// largest single chunk from every page response — previously every
// page was shipping the entire registry inline as part of the RSC
// stream.
import { NextResponse } from 'next/server';
import { fetchJsonRegistryWithGlobals } from '@/shared/api/fetch-registry';

const ONE_HOUR = 60 * 60;

export const revalidate = ONE_HOUR;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const chainId = searchParams.get('chainId') ?? process.env['PENUMBRA_CHAIN_ID'];
  if (!chainId) {
    return NextResponse.json(
      { error: 'chainId not specified and PENUMBRA_CHAIN_ID env not set' },
      { status: 400 },
    );
  }

  try {
    const data = await fetchJsonRegistryWithGlobals(chainId);
    return NextResponse.json(data, {
      headers: {
        // Cache aggressively at the edge — clients also cache in
        // localStorage. If you push a registry update upstream, hit
        // /api/registry?chainId=...&t=now once to force-revalidate.
        'cache-control': `public, s-maxage=${ONE_HOUR}, stale-while-revalidate=86400`,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 502 },
    );
  }
}
