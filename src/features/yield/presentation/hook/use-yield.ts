import { useQuery } from '@tanstack/react-query';
import { useResolve } from '@/core/di/container-provider';
import { AppErrorException } from '@/core/errors/app-error-exception';
import type { YieldProduct } from '../../domain/entity/yield-entity';

export function useYieldProducts() {
  const loadYieldProductsUseCase = useResolve('loadYieldProductsUseCase');

  return useQuery<YieldProduct[]>({
    queryKey: ['yield', 'products'],
    queryFn: async () => {
      const result = await loadYieldProductsUseCase.execute();
      if (!result.ok) throw new AppErrorException(result.error);

      return result.value;
    },
  });
}
