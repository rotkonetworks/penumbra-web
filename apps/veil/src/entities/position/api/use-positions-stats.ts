import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/shared/utils/api-fetch.ts';
import { PositionsStatsResponse } from '@/shared/api/server/position/stats/types';

export const usePositionsStats = (positionIds: string[]) => {
  // Order-independent key so the same set of positions hits the same slot.
  const sorted = [...positionIds].sort();
  return useQuery({
    queryKey: ['positionsStats', sorted],
    enabled: sorted.length > 0,
    staleTime: 60_000,
    queryFn: () =>
      apiFetch<PositionsStatsResponse>('/api/position/stats', {
        positionIds: sorted.join(','),
      }),
  });
};
