import { useCallback } from 'react';
import { useRegistry, useRegistryAssets } from '@/shared/api/registry';
import { AssetId, Metadata, Denom } from '@penumbra-zone/protobuf/penumbra/core/asset/v1/asset_pb';

/**
 * Returns the `Metadata[]` based on the provider connection state.
 **/
export const useAssets = () => {
  return useRegistryAssets();
};

export type GetMetadata = (assetId?: AssetId | Denom) => Metadata | undefined;

export const isDenom = (value?: Denom | AssetId): value is Denom =>
  value?.getType().typeName === Denom.typeName;

/**
 * A hook that returns a synchronous function for querying the metadata by assetId.
 * Needed for an optimized client-side asset fetching.
 *
 * Stabilized via useCallback so consumers can pass it as a useMemo / useEffect
 * dep without busting on every parent render — the previous closure form
 * returned a fresh arrow per render which silently invalidated downstream
 * memos (e.g. displayPositions in PositionsTable, the chart's getMetadata
 * threading).
 */
export const useGetMetadata = (): GetMetadata => {
  const registry = useRegistry().data;
  return useCallback(x => x && registry.tryGetMetadata(x), [registry]);
};
