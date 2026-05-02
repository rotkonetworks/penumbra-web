import { useQuery } from '@tanstack/react-query';
import { ViewService } from '@penumbra-zone/protobuf';
import { bech32mAddress } from '@penumbra-zone/bech32m/penumbra';
import { penumbra } from '@/shared/const/penumbra';
import { connectionStore } from '@/shared/model/connection';

/**
 * Resolves the Penumbra IBC deposit address for the currently selected
 * subaccount.
 *
 * We use `ephemeralAddress` rather than `addressByIndex` because:
 *   - it is the documented pattern for receiving inbound IBC transfers;
 *   - it avoids leaking the long-term subaccount address to third parties
 *     (Coinbase / Skip route partners) by issuing a fresh randomised address
 *     for this deposit only.
 *
 * The user's subaccount index is taken from `connectionStore.subaccount`. The
 * returned bech32m string is what the user pastes into the bridge's
 * `destinationAddress` field (or what we pre-fill via Skip's
 * `connectedAddresses`).
 */
export const useDepositAddress = () => {
  const subaccount = connectionStore.subaccount;
  const connected = connectionStore.connected;

  return useQuery({
    queryKey: ['deposit-address', 'ephemeral', subaccount],
    enabled: connected,
    // Generate a new ephemeral address per dialog open; cache briefly so the
    // user can re-render the dialog without rotation surprising them.
    staleTime: 60_000,
    queryFn: async () => {
      const { address } = await penumbra.service(ViewService).ephemeralAddress({
        addressIndex: { account: subaccount },
      });
      if (!address) {
        throw new Error('view service returned no address for current subaccount');
      }
      return bech32mAddress(address);
    },
  });
};
