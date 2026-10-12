import { useQuery } from '@tanstack/react-query';
import { useResolve } from '@/core/di/container-provider';
import { AppErrorException } from '@/core/errors/app-error-exception';
import type { YieldOverview } from './yield-overview';

export function useYieldOverview() {
  const yieldOverviewRepository = useResolve('yieldOverviewRepository');

  return useQuery<YieldOverview>({
    queryKey: ['yield', 'overview'],
    queryFn: async () => {
      const result = await yieldOverviewRepository.getOverview();
      if (!result.ok) throw new AppErrorException(result.error);

      return result.value;
    },
  });
}
