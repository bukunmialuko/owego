import type { QueryClient } from '@tanstack/react-query';
import type { SessionCleanupTask } from '@/core/session/session-cleanup';

export function createQueryCacheCleanupTask(queryClient: QueryClient): SessionCleanupTask {
  return {
    name: 'query-cache',
    run() {
      queryClient.clear();

      return Promise.resolve();
    },
  };
}
