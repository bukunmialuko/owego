import { QueryClient } from '@tanstack/react-query';
import { createQueryCacheCleanupTask } from './query-cache-cleanup-task';

describe('createQueryCacheCleanupTask', () => {
  it('leaves nothing of the previous account behind', async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(['settings', 'profile'], {
      email: 'precious.james@gmail.com',
      phone: '+2340123456789',
    });
    queryClient.setQueryData(['wallets'], [{ id: 'w1', balances: [] }]);
    queryClient.setQueryData(['home', 'wallets'], [{ id: 'w1' }]);

    await createQueryCacheCleanupTask(queryClient).run();

    expect(queryClient.getQueryData(['settings', 'profile'])).toBeUndefined();
    expect(queryClient.getQueryData(['wallets'])).toBeUndefined();
    expect(queryClient.getQueryData(['home', 'wallets'])).toBeUndefined();
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
  });

  it('names itself, so a failure is legible in the registry', () => {
    expect(createQueryCacheCleanupTask(new QueryClient()).name).toBe('query-cache');
  });
});
