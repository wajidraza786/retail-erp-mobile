import { QueryClient } from '@tanstack/react-query';

import { onDataChanged } from '@/db/events';

/**
 * Local SQLite queries are cheap, so every committed write simply invalidates all
 * cached lists and reports (PRD §2: "invalidated after every write").
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: Infinity, gcTime: 5 * 60_000, retry: false, networkMode: 'always' },
    mutations: { networkMode: 'always' },
  },
});

onDataChanged(() => {
  void queryClient.invalidateQueries();
});
