import { useQuery } from '@tanstack/react-query';
import { usePathSymbols } from '@/pages/trade/model/use-path.ts';
import { apiFetch } from '@/shared/utils/api-fetch.ts';
import { RecentExecution } from '@/shared/api/server/recent-executions.ts';
import { useRefetchOnNewBlock } from '@/shared/api/compact-block.ts';

const LIMIT = 10;

export const useRecentExecutions = () => {
  const { baseSymbol, quoteSymbol } = usePathSymbols();

  const query = useQuery({
    queryKey: ['recent-executions', baseSymbol, quoteSymbol],
    // Refetch on every new block via the compact-block stream instead of
    // a fixed 10s poll. Matches the book / candles / my-trades cadence
    // and keeps the trade tape at Penumbra's block rhythm (~5s).
    staleTime: Infinity,
    queryFn: async () => {
      return apiFetch<RecentExecution[]>('/api/recent-executions', {
        baseAsset: baseSymbol,
        quoteAsset: quoteSymbol,
        limit: String(LIMIT),
      });
    },
  });

  useRefetchOnNewBlock(['recent-executions', baseSymbol, quoteSymbol], query);

  return query;
};
