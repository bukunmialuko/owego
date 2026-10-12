import { map, type Result } from '@/core/result/result';
import type { AppError } from '@/core/errors/app-error';
import type { KeyValueStorage } from '@/core/storage/key-value-storage';
import type { Transaction } from '../../domain/entity/home-entity';
import type { TransactionRepository } from '../../domain/repository/home-repository';
import type { HomeRemoteDataSource } from '../datasource/home-remote-datasource';
import { toTransaction } from '../mapper/home-mapper';

type Dependencies = {
  remoteDataSource: HomeRemoteDataSource;
  cache: KeyValueStorage;
};

export function createTransactionRepositoryImpl({
  remoteDataSource,
}: Dependencies): TransactionRepository {
  return {
    async getRecent(limit): Promise<Result<Transaction[], AppError>> {
      const response = await remoteDataSource.getTransactionPage(1, limit);

      return map(response, (page) => page.data.map(toTransaction));
    },
  };
}
