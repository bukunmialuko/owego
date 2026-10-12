import { useQuery } from '@tanstack/react-query';
import { useResolve } from '@/core/di/container-provider';
import { AppErrorException } from '@/core/errors/app-error-exception';
import type { Wallet } from './wallet';

export const walletsQueryKey = ['wallets'] as const;

export function useWalletsQuery<T = Wallet[]>(
  select?: (wallets: Wallet[]) => T,
  options: { enabled?: boolean } = {},
) {
  const walletBalancePort = useResolve('walletBalancePort');

  return useQuery<Wallet[], Error, T>({
    queryKey: walletsQueryKey,
    queryFn: async () => {
      const result = await walletBalancePort.listWallets();
      if (!result.ok) throw new AppErrorException(result.error);

      return result.value;
    },
    ...(select === undefined ? {} : { select }),
    ...(options.enabled === undefined ? {} : { enabled: options.enabled }),
  });
}
