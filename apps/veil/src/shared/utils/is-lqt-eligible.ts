import { Metadata } from '@penumbra-zone/protobuf/penumbra/core/asset/v1/asset_pb';
import { assetPatterns } from '@penumbra-zone/types/assets';
import { useStakingTokenMetadata } from '@/shared/api/registry';

/**
 * Master feature flag for the Liquidity Tournament UI. When false, all
 * LQT-derived UI (the "Rewards" badge in the pair selector, the
 * "LQT Rewards" row in the simple-liquidity order form, the Tournament
 * header link) is suppressed because there's no live epoch.
 *
 * Flip back to true when the next LQT epoch is announced.
 */
export const LQT_ENABLED = false;

/**
 * Checks if any of the provided assets is eligible for rewards in the
 * liquidity tournament. Only IBC assets are eligible. Always returns
 * false when {@link LQT_ENABLED} is off.
 */
export const useIsLqtEligible = (
  asset1: Metadata | undefined,
  asset2: Metadata | undefined,
): boolean => {
  const { data: umMetadata } = useStakingTokenMetadata();

  if (!LQT_ENABLED) {
    return false;
  }

  if (!asset1 || !asset2) {
    return false;
  }

  const isOneIBC = assetPatterns.ibc.matches(asset1.base) || assetPatterns.ibc.matches(asset2.base);
  const isOneUm =
    !!asset1.penumbraAssetId?.equals(umMetadata.penumbraAssetId) ||
    !!asset2.penumbraAssetId?.equals(umMetadata.penumbraAssetId);

  return isOneIBC && isOneUm;
};
