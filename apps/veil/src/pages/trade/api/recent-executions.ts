import { useQuery } from '@tanstack/react-query';
import { usePathSymbols } from '@/pages/trade/model/use-path.ts';
import { apiFetch } from '@/shared/utils/api-fetch.ts';
import { RecentExecution } from '@/shared/api/server/recent-executions.ts';

const LIMIT = 10;

export const useRecentExecutions = () => {
  const { baseSymbol, quoteSymbol } = usePathSymbols();

  const query = useQuery({
    queryKey: ['recent-executions', baseSymbol, quoteSymbol],
    // The market trades tape changes only when fills happen — most pairs see
    // sub-block fill density. Polling every 5s (one Penumbra block) just to
    // re-fetch the same 10 rows wasted ~50% of the requests on quiet pairs
    // and dragged the trades panel into the per-block re-render set.
    // 10s is plenty fresh for a trade tape and the chart's candle stream
    // already shows fills as they land.
    staleTime: 10_000,
    refetchInterval: 10_000,
    refetchIntervalInBackground: false,
    queryFn: async () => {
      return apiFetch<RecentExecution[]>('/api/recent-executions', {
        baseAsset: baseSymbol,
        quoteAsset: quoteSymbol,
        limit: String(LIMIT),
      });
    },
  });

  return query;
};
