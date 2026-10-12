import { map, type Result } from '@/core/result/result';
import type { AppError } from '@/core/errors/app-error';
import { isUsableWallet } from '@/core/wallet/wallet';
import type { WalletRepository } from '../../domain/repository/wallet-repository';

export function createWalletProvisioningAdapter(walletRepository: WalletRepository) {
  return {
    hasProvisionedWallet(): Promise<Result<boolean, AppError>> {
      return walletRepository
        .getWallets()
        .then((result) => map(result, (wallets) => wallets.some(isUsableWallet)));
    },
  };
}
