import { useWalletsQuery } from '@/core/wallet/use-wallets-query';
import { isSendableToken } from '../../../domain/asset/send-networks';
import { sendableBalanceMinor } from '../../../domain/asset/sendable-asset';

export function useSendableBalance(networkCode: string, tokenSymbol: string) {
  return useWalletsQuery((wallets): number | null => {
    if (!isSendableToken(tokenSymbol)) return null;

    return sendableBalanceMinor(wallets, networkCode, tokenSymbol) ?? null;
  });
}
