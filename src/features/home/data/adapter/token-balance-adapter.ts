import { map, type Result } from '@/core/result/result';
import type { AppError } from '@/core/errors/app-error';
import { tokenBalanceOf } from '@/core/wallet/token-balance';
import type { WalletBalancePort } from '@/core/wallet/wallet';

export function createTokenBalanceAdapter(walletBalancePort: WalletBalancePort) {
  return {
    getBalance(
      tokenSymbol: string,
    ): Promise<Result<{ amountMinor: number; currency: string } | undefined, AppError>> {
      return walletBalancePort
        .listWallets()
        .then((result) => map(result, (wallets) => tokenBalanceOf(wallets, tokenSymbol)));
    },
  };
}
