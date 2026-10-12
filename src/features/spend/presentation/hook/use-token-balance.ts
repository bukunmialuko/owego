import { tokenBalanceOf } from '@/core/wallet/token-balance';
import { useWalletsQuery } from '@/core/wallet/use-wallets-query';
import type { AvailableBalance } from '../../domain/port/token-balance-port';

export function useTokenBalance(tokenSymbol: string) {
  return useWalletsQuery(
    (wallets): AvailableBalance | null => tokenBalanceOf(wallets, tokenSymbol) ?? null,
    { enabled: tokenSymbol !== '' },
  );
}
