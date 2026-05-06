import { Serialized } from '@/shared/utils/serializer.ts';
import { AssetId, Value } from '@penumbra-zone/protobuf/penumbra/core/asset/v1/asset_pb';
import { PositionId } from '@penumbra-zone/protobuf/penumbra/core/component/dex/v1/dex_pb';

export interface PositionStats {
  positionId: PositionId;
  asset1: AssetId;
  asset2: AssetId;
  openingHeight: number;
  openingTime: string;
  openingReserves1: Value;
  openingReserves2: Value;
  fees1: Value;
  fees2: Value;
}

export interface PositionsStatsResponse {
  items: PositionStats[];
}

export type PositionsStatsApiResponse =
  | Serialized<PositionsStatsResponse>
  | { error: string };
