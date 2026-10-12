import type { WalletBalancePort } from '@/core/wallet/wallet';
import type { WalletRepository } from '../../domain/repository/wallet-repository';

export function createWalletBalanceAdapter(walletRepository: WalletRepository): WalletBalancePort {
  return {
    listWallets() {
      return walletRepository.getWallets();
    },
  };
}
