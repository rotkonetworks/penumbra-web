import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usePathSymbols } from '@/pages/trade/model/use-path.ts';
import { DurationWindow } from '@/shared/utils/duration.ts';
import { fetchSummary, Summary } from '@/shared/api/server/summary';
import { useAssets } from '@/shared/api/assets';
import { deserialize, serialize } from '@/shared/utils/serializer';
import { Metadata } from '@penumbra-zone/protobuf/penumbra/core/asset/v1/asset_pb';

interface SummaryWithMetadata extends Summary {
  start: Metadata;
  end: Metadata;
}

export const useSummary = (
  window: DurationWindow,
  baseSymbolProp?: string,
  quoteSymbolProp?: string,
) => {
  const { baseSymbol: baseSymbolFromPath, quoteSymbol: quoteSymbolFromPath } = usePathSymbols();
  const baseSymbol = baseSymbolProp ?? baseSymbolFromPath;
  const quoteSymbol = quoteSymbolProp ?? quoteSymbolFromPath;

  const { data: assets } = useAssets();
  // Memoize the asset lookup — Summary re-renders on every mid-price tick
  // (book updates), but the asset.find pair only changes when the trading
  // pair (or registry) does. Keep the queryKey-relevant references stable.
  const { start, end } = useMemo(
    () => ({
      start: assets.find(x => x.symbol === baseSymbol),
      end: assets.find(x => x.symbol === quoteSymbol),
    }),
    [assets, baseSymbol, quoteSymbol],
  );
  const startAsset = start?.penumbraAssetId;
  const endAsset = end?.penumbraAssetId;

  const query = useQuery({
    queryKey: ['summary', baseSymbol, quoteSymbol],
    retry: 1,
    enabled: startAsset !== undefined && endAsset !== undefined,
    // 24h aggregates (high/low/volume/change) genuinely shift on a minute-
    // scale, not block-scale. Refresh every 30s only while the tab is
    // focused — that's plenty fresh for the header strip while cutting
    // ~10x the request load vs the previous useRefetchOnNewBlock cadence
    // (1 block ≈ 5s on Penumbra mainnet). Live mid-price stays fast via
    // useMarketPrice/useBook, which is the actual price-tracking signal.
    staleTime: 30_000,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    queryFn: async (): Promise<SummaryWithMetadata | undefined> => {
      if (
        startAsset === undefined ||
        endAsset === undefined ||
        start === undefined ||
        end === undefined
      ) {
        return undefined;
      }
      const res = await fetchSummary(serialize(startAsset), serialize(endAsset), window);
      const out = deserialize<Summary>(res);
      return { ...out, start, end };
    },
  });

  return query;
};
