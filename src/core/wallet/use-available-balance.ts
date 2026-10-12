import { identityQuote } from '@/core/fx/convert';
import { availableBalance, type AvailableBalance } from './available-balance';
import { useWalletsQuery } from './use-wallets-query';

const DOLLARS = identityQuote('USD');

type AvailableBalanceState = {
  balance: AvailableBalance | undefined;
  isPending: boolean;
  isError: boolean;
  refetch: () => Promise<unknown>;
};

export function useAvailableBalance(): AvailableBalanceState {
  const wallets = useWalletsQuery();

  return {
    balance: wallets.data === undefined ? undefined : availableBalance(wallets.data, DOLLARS),
    isPending: wallets.isPending,
    isError: wallets.isError,
    refetch: () => wallets.refetch(),
  };
}
