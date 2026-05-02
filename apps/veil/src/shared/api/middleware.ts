import { NextResponse, NextRequest } from 'next/server';
import { ChainRegistryClient } from '@penumbra-labs/registry';
import { getClientSideEnv } from '@/shared/api/env/getClientSideEnv';
import { assetPatterns } from '@penumbra-zone/types/assets';

const LAST_PAIR_COOKIE = 'veil_last_pair';
const LAST_PAIR_COOKIE_MAX_AGE = 60 * 60 * 24 * 90; // 90 days

export const routingMiddleware = async (request: NextRequest) => {
  const { pathname } = request.nextUrl;

  if (pathname === '/') {
    // Redirect the default homepage to the 'explore' page.
    // TODO: Replace this with a path to a fully designed landing page.
    return NextResponse.redirect(new URL(`/explore`, request.url));
  }

  // Remember the last viewed pair so /trade can redirect back to it.
  const tradePairMatch = pathname.match(/^\/trade\/([^/]+)\/([^/]+)\/?$/);
  if (tradePairMatch) {
    const [, base, quote] = tradePairMatch;
    if (base && quote) {
      const cookieValue = `${base}/${quote}`;
      const existing = request.cookies.get(LAST_PAIR_COOKIE)?.value;
      if (existing !== cookieValue) {
        const response = NextResponse.next();
        response.cookies.set(LAST_PAIR_COOKIE, cookieValue, {
          path: '/',
          maxAge: LAST_PAIR_COOKIE_MAX_AGE,
          sameSite: 'lax',
        });
        return response;
      }
    }
    return NextResponse.next();
  }

  // /trade — redirect to the last viewed pair, or default.
  if (pathname === '/trade') {
    const lastPair = request.cookies.get(LAST_PAIR_COOKIE)?.value;
    if (lastPair && /^[^/]+\/[^/]+$/.test(lastPair)) {
      return NextResponse.redirect(new URL(`/trade/${lastPair}`, request.url));
    }

    const { PENUMBRA_CHAIN_ID } = getClientSideEnv();
    const chainRegistryClient = new ChainRegistryClient();
    const registry = await chainRegistryClient.remote.get(PENUMBRA_CHAIN_ID);
    const allAssets = registry
      .getAllAssets()
      .filter(m => !assetPatterns.delegationToken.matches(m.display))
      .toSorted((a, b) => Number(b.priorityScore - a.priorityScore));

    const baseAsset = allAssets[0]?.symbol;
    const quoteAsset = allAssets[1]?.symbol;
    if (!baseAsset || !quoteAsset) {
      return NextResponse.redirect(new URL('not-found', request.url));
    }

    return NextResponse.redirect(new URL(`/trade/${baseAsset}/${quoteAsset}`, request.url));
  }

  return NextResponse.next();
};
