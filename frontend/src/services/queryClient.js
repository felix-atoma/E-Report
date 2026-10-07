import { QueryClient } from '@tanstack/react-query';

// Data stays fresh 1 min: going back to a screen or to the tab no longer re-downloads everything.
// After any save, api.js marks all data stale, so the next screen shown reloads what changed.
// One retry instead of three, so an error shows quickly instead of after several slow attempts.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, refetchOnWindowFocus: false, retry: 1 },
  },
});
