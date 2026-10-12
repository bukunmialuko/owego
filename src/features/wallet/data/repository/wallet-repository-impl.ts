import { andThen, err, map, ok, type Result } from '@/core/result/result';
import { unknownError, type AppError } from '@/core/errors/app-error';
import type { KeyValueStorage } from '@/core/storage/key-value-storage';
import { CacheKey } from '@/core/storage/storage-keys';
import type { Wallet, WalletChallenge } from '../../domain/entity/wallet-entity';
import type {
  WalletListRequest,
  WalletRepository,
} from '../../domain/repository/wallet-repository';
import type { WalletRemoteDataSource } from '../datasource/wallet-remote-datasource';
import type { WalletChallengeDto } from '../model/wallet-model';
import { toWallet, toWalletChallenge } from '../mapper/wallet-mapper';

type Dependencies = {
  remoteDataSource: WalletRemoteDataSource;
  cache: KeyValueStorage;
};

export function createWalletRepositoryImpl({
  remoteDataSource,
  cache,
}: Dependencies): WalletRepository {
  return {
    async getWallets(request?: WalletListRequest): Promise<Result<Wallet[], AppError>> {
      const response = await remoteDataSource.getWallets(request);

      if (response.ok) cache.setObject(CacheKey.WalletList, response.value);

      return map(response, (wallets) => wallets.map(toWallet));
    },

    async createChallenge(): Promise<Result<WalletChallenge, AppError>> {
      return usableChallenge(await remoteDataSource.createChallenge());
    },

    async createPinChangeChallenge(): Promise<Result<WalletChallenge, AppError>> {
      return usableChallenge(await remoteDataSource.createPinChangeChallenge());
    },
  };
}

function usableChallenge(
  response: Result<WalletChallengeDto, AppError>,
): Result<WalletChallenge, AppError> {
  return andThen(response, (dto) => {
    const challenge = toWalletChallenge(dto);

    const isUsable =
      challenge.challengeId !== '' && challenge.userToken !== '' && challenge.encryptionKey !== '';

    return isUsable
      ? ok(challenge)
      : err(unknownError('Wallet challenge incomplete: the backend returned a blank field.'));
  });
}
