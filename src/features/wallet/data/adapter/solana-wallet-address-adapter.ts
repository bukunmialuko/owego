import type { Result } from '@/core/result/result';
import { map } from '@/core/result/result';
import type { AppError } from '@/core/errors/app-error';
import { NATIVE_CHAIN_CODE } from '@/core/reference-data/chain-metadata';
import { isOnChain } from '@/core/wallet/chain';
import type { WalletRepository } from '../../domain/repository/wallet-repository';

export function createSolanaWalletAddressAdapter(walletRepository: WalletRepository) {
  return {
    getSolanaAddress(): Promise<Result<string | undefined, AppError>> {
      return walletRepository
        .getWallets()
        .then((result) =>
          map(
            result,
            (wallets) =>
              wallets.find((wallet) => isOnChain(wallet.blockchain, NATIVE_CHAIN_CODE))?.address,
          ),
        );
    },
  };
}
