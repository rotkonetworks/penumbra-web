import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { apiPostFetch } from '@/shared/utils/api-fetch';
import {
  LpLeaderboardRequest,
  LpLeaderboardResponse,
  LpLeaderboardSortKey,
  LpLeaderboardSortDirection,
} from './utils';

export const BASE_LIMIT = 10;
export const BASE_PAGE = 1;

export const useLpLeaderboard = ({
  epoch,
  page,
  limit,
  sortKey,
  sortDirection,
  isActive,
  assetId,
}: {
  epoch: number | undefined;
  page: number;
  limit: number;
  sortKey?: LpLeaderboardSortKey | '';
  sortDirection?: LpLeaderboardSortDirection;
  isActive: boolean;
  assetId: string | undefined;
}): UseQueryResult<LpLeaderboardResponse> => {
  const queryKey = ['lp-leaderboard', epoch, page, limit, sortKey, sortDirection, assetId];
  const query = useQuery({
    queryKey,
    // Leaderboard re-ranks as fills accumulate within an epoch —
    // minute-scale at best, not block-scale. The previous form fired
    // on every block (~5s) for an aggregate that doesn't move that
    // fast. 30s polling tracks the actual cadence, paused while the
    // tab is backgrounded so an idle page stops hammering the API.
    staleTime: 30_000,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    queryFn: async () => {
      return apiPostFetch<LpLeaderboardResponse>('/api/tournament/lp-leaderboard', {
        epoch,
        page,
        limit,
        sortKey,
        sortDirection,
        assetId,
      } as LpLeaderboardRequest);
    },
    enabled: typeof epoch === 'number' && isActive,
  });

  return query;
};
