import { map, type Result } from '@/core/result/result';
import type { AppError } from '@/core/errors/app-error';
import type { KeyValueStorage } from '@/core/storage/key-value-storage';
import { CacheKey } from '@/core/storage/storage-keys';
import { isUsableWallet } from '@/core/wallet/wallet';
import { walletSchema } from '../model/wallet-model';
import { z } from 'zod';
import type { WalletRepository } from '../../domain/repository/wallet-repository';

export function createSplashWalletsAdapter(
  walletRepository: WalletRepository,
  cache: KeyValueStorage,
) {
  return {
    countWallets(): Promise<Result<number, AppError>> {
      return walletRepository
        .getWallets()
        .then((result) => map(result, (list) => list.filter(isUsableWallet).length));
    },

    cachedWalletCount(): number | undefined {
      const cached = cache.getObject(CacheKey.WalletList, z.array(walletSchema));

      return cached.ok ? cached.value?.filter(isUsableWallet).length : undefined;
    },
  };
}
