import { tokenBalanceOf } from '@/core/wallet/token-balance';
import { useWalletsQuery } from '@/core/wallet/use-wallets-query';
import type { FundingOption } from '../../domain/asset/funding-token';
import { SENDABLE_TOKENS } from '../../domain/asset/send-networks';

export type FundingOptions = {
  options: FundingOption[];
  isPending: boolean;
  isError: boolean;
  retry: () => void;
};

export function usePayoutFundingOptions(): FundingOptions {
  const query = useWalletsQuery((wallets) =>
    SENDABLE_TOKENS.flatMap((symbol): FundingOption[] => {
      const balance = tokenBalanceOf(wallets, symbol);

      return balance === undefined ? [] : [{ symbol, balanceMinor: balance.amountMinor }];
    }),
  );

  return {
    options: query.data ?? [],
    isPending: query.isPending,
    isError: query.isError,
    retry: () => {
      void query.refetch();
    },
  };
}
