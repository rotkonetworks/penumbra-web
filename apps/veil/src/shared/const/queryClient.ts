import { QueryClient } from '@tanstack/react-query';

// React Query v5 defaults `refetchOnWindowFocus: true` — every active
// query re-runs whenever the user tabs back to the page. The trade page
// has ~10 active queries (book, candles, summary, recent-executions, ...)
// so a tab refocus fired a thundering herd of network calls for data
// that's already kept fresh by either useRefetchOnNewBlock (block-tied)
// or refetchInterval (the trade-tape, summary, tournament, etc).
//
// Disable globally; queries that genuinely want focus-refresh (rare
// here) can opt in via `refetchOnWindowFocus: true` in their own
// useQuery options.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});
