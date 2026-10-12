import { useWalletsQuery } from '@/core/wallet/use-wallets-query';
import { sendableOptions } from '../../../domain/asset/sendable-asset';
import type { FundingOptions } from '../../hook/use-payout-funding-options';

export function useSendableOptions(networkCode: string): FundingOptions {
  const query = useWalletsQuery((wallets) => sendableOptions(wallets, networkCode));

  return {
    options: query.data ?? [],
    isPending: query.isPending,
    isError: query.isError,
    retry: () => {
      void query.refetch();
    },
  };
}
