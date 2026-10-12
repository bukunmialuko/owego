import { useQuery } from '@tanstack/react-query';
import { useResolve } from '@/core/di/container-provider';
import { AppErrorException } from '@/core/errors/app-error-exception';
import { baseUnitsToMinor } from '../../../domain/entity/deposit-amount';
import type { DepositToken } from '../../../domain/entity/deposit-token';

export function useExternalWalletBalance(owner: string | undefined, token: DepositToken) {
  const solanaNetworkRepository = useResolve('solanaNetworkRepository');

  return useQuery<number | null>({
    queryKey: ['receive', 'external-wallet', 'balance', owner ?? '', token.mint],
    queryFn: async () => {
      const balance = await solanaNetworkRepository.getTokenBalance(owner ?? '', token);
      if (!balance.ok) throw new AppErrorException(balance.error);

      return baseUnitsToMinor(balance.value, token.decimals) ?? null;
    },
    enabled: owner !== undefined,
  });
}
