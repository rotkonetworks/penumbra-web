import { NextRequest, NextResponse } from 'next/server';
import {
  renderTournamentEarningsCanvas,
  TournamentParams,
  queryParamMap,
} from '@/features/tournament-earnings-canvas';
import { registerFonts } from '@/shared/ui/canvas-toolkit';
import { getDisplayDenomExponent } from '@penumbra-zone/getters/metadata';
import { ChainRegistryClient } from '@penumbra-labs/registry';

export async function GET(req: NextRequest) {
  const chainId = process.env['PENUMBRA_CHAIN_ID'];
  if (!chainId) {
    return NextResponse.json({ error: 'PENUMBRA_CHAIN_ID is not set' }, { status: 500 });
  }

  // canvas has a native binding (cairo / pango) that we can't always build at
  // deploy time. Lazy-load it inside the request handler so that the build's
  // page-data collection step doesn't crash on a missing .node when canvas
  // postinstall scripts were skipped.
  const { createCanvas } = await import('canvas');

  const registryClient = new ChainRegistryClient();
  const registry = await registryClient.remote.get(chainId);
  const stakingAssetId = registryClient.bundled.globals().stakingAssetId;
  const stakingMetadata = registry.getMetadata(stakingAssetId);

  const { searchParams } = new URL(req.url);
  const params = Object.entries(queryParamMap).reduce(
    (acc, [shortKey, paramKey]) => ({
      ...acc,
      [paramKey]: searchParams.get(shortKey) ?? shortKey,
    }),
    {},
  ) as TournamentParams;

  registerFonts();
  const canvas = createCanvas(600, 315);

  const exponent = getDisplayDenomExponent(stakingMetadata);

  await renderTournamentEarningsCanvas(canvas as unknown as HTMLCanvasElement, params, exponent, {
    width: 600,
    height: 315,
  });

  return new NextResponse(canvas.toBuffer('image/png'), {
    status: 200,
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  });
}
