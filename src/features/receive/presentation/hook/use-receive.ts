import { useQuery } from '@tanstack/react-query';
import { useResolve } from '@/core/di/container-provider';
import { AppErrorException } from '@/core/errors/app-error-exception';
import type { AppError } from '@/core/errors/app-error';
import type { Result } from '@/core/result/result';
import type { Chain, DepositAddress } from '../../domain/entity/receive-entity';

const receiveQueryKey = {
  chains: ['receive', 'chains'] as const,
  address: (chainCode: string) => ['receive', 'address', chainCode] as const,
};

function unwrap<T>(result: Result<T, AppError>): T {
  if (!result.ok) throw new AppErrorException(result.error);

  return result.value;
}

export function useChains() {
  const receiveRepository = useResolve('receiveRepository');

  return useQuery<Chain[]>({
    queryKey: receiveQueryKey.chains,
    queryFn: async () => unwrap(await receiveRepository.getChains()),
  });
}

export function useDepositAddress(chainCode: string) {
  const receiveRepository = useResolve('receiveRepository');

  return useQuery<DepositAddress | null>({
    queryKey: receiveQueryKey.address(chainCode),
    queryFn: async () => unwrap(await receiveRepository.getAddress(chainCode)) ?? null,
    enabled: chainCode !== '',
  });
}
