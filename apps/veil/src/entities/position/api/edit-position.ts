import {
  Position,
  PositionId,
} from '@penumbra-zone/protobuf/penumbra/core/component/dex/v1/dex_pb';
import { TransactionPlannerRequest } from '@penumbra-zone/protobuf/penumbra/view/v1/view_pb';
import { AddressIndex } from '@penumbra-zone/protobuf/penumbra/core/keys/v1/keys_pb';
import { connectionStore } from '@/shared/model/connection';
import { planBuildBroadcast } from '@/entities/transaction';
import { openToast } from '@penumbra-zone/ui/Toast';
import { encodeLiquidityShape, LiquidityDistributionShape } from '@/shared/math/position';
import { updatePositionsQuery } from './use-positions';

// Combines positionClose + positionOpen into one tx so the trader sees a
// single signing prompt and the change is atomic.
export const editPosition = async ({
  oldPositionId,
  newPosition,
  shape,
}: {
  oldPositionId: PositionId;
  newPosition: Position;
  shape: LiquidityDistributionShape;
}): Promise<void> => {
  try {
    const planReq = new TransactionPlannerRequest({
      positionCloses: [{ positionId: oldPositionId }],
      positionOpens: [
        { position: newPosition, positionMeta: { strategy: encodeLiquidityShape(shape) } },
      ],
      source: new AddressIndex({ account: connectionStore.subaccount }),
    });

    await planBuildBroadcast('positionOpen', planReq);
    await updatePositionsQuery();
  } catch (e) {
    openToast({
      type: 'error',
      message: 'Error editing position',
      description: String(e),
    });
  }
};
