import {
  AddressView,
  AddressView_Decoded,
  AddressIndex,
} from '@penumbra-zone/protobuf/penumbra/core/keys/v1/keys_pb';
import { useQuery } from '@tanstack/react-query';
import { ViewService } from '@penumbra-zone/protobuf';
import { penumbra } from '@/shared/const/penumbra';
import { useBalances } from '@/shared/api/balances';
import { BalancesResponse } from '@penumbra-zone/protobuf/penumbra/view/v1/view_pb';

const fetchQuery = async (balances: BalancesResponse[]): Promise<AddressView[]> => {
  const service = penumbra.service(ViewService);

  // Include main account for fresh wallets to display address view
  let accountIndexes: number[] = [0];

  for (const balance of balances) {
    if (
      balance.accountAddress?.addressView.case === 'decoded' &&
      balance.accountAddress.addressView.value.index?.account !== undefined
    ) {
      accountIndexes.push(balance.accountAddress.addressView.value.index.account);
    }
  }

  // Filter by unique account indices
  accountIndexes = accountIndexes.filter((value, index, self) => self.indexOf(value) === index);

  return Promise.all(
    accountIndexes.map(async index => {
      const response = await service.addressByIndex({ addressIndex: { account: index } });

      return new AddressView({
        addressView: {
          case: 'decoded',
          value: new AddressView_Decoded({
            address: response.address,
            index: new AddressIndex({ account: index }),
          }),
        },
      });
    }),
  );
};

export const useSubaccounts = () => {
  // Query account balances from view service
  const { data: balances, isLoading: balanceLoading } = useBalances();

  // Derive a cheap, stable cache key from the *set* of account indices
  // present in balances. The previous form put the whole balances array
  // (proto objects) in the queryKey, which made React Query stringify-
  // hash it on every render — useSubaccounts is called from
  // useOrderFormStore which re-renders every block via useMarketPrice,
  // so the cost was per-tick. The fetchQuery only cares about which
  // account indices are present, not the full balance details, so this
  // is the meaningful cache dimension.
  const accountKey = balances
    ? Array.from(
        new Set(
          balances
            .map(b =>
              b.accountAddress?.addressView.case === 'decoded'
                ? b.accountAddress.addressView.value.index?.account
                : undefined,
            )
            .filter((n): n is number => typeof n === 'number'),
        ),
      )
        .sort((a, b) => a - b)
        .join(',')
    : '';

  const query = useQuery({
    queryKey: ['view-service-accounts', accountKey],
    queryFn: () => {
      if (!balances) {
        return [];
      }
      return fetchQuery(balances);
    },
    enabled: !balanceLoading,
  });

  // Combines loading states from balances and subaccounts to prevent
  // flickering during balance refetches
  const isLoading = balanceLoading || query.isLoading;

  return {
    ...query,
    isLoading,
  };
};
