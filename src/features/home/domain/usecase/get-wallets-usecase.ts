import type { AppError } from '@/core/errors/app-error';
import { map, type Result } from '@/core/result/result';
import type { TokenBalance, Wallet } from '@/core/wallet/wallet';
import type { WalletBalancePort } from '@/core/wallet/wallet';

interface GetWalletsUseCase {
  execute(): Promise<Result<Wallet[], AppError>>;
}

/** @public */
export function createGetWalletsUseCase(walletBalancePort: WalletBalancePort): GetWalletsUseCase {
  return {
    execute: () => walletBalancePort.listWallets(),
  };
}

export interface GetSpendableBalanceUseCase {
  execute(tokenSymbol: string): Promise<Result<TokenBalance | undefined, AppError>>;
}

export function createGetSpendableBalanceUseCase(
  walletBalancePort: WalletBalancePort,
): GetSpendableBalanceUseCase {
  return {
    async execute(tokenSymbol) {
      const wallets = await walletBalancePort.listWallets();

      return map(wallets, (list) =>
        list
          .flatMap((wallet) => wallet.balances)
          .find((balance) => balance.symbol.toLowerCase() === tokenSymbol.toLowerCase()),
      );
    },
  };
}
