import { map, type Result } from '@/core/result/result';
import type { AppError } from '@/core/errors/app-error';
import type { TransactionSlice } from '../../domain/entity/transaction-page';
import type { TransactionHistoryRepository } from '../../domain/repository/home-repository';
import type { HomeRemoteDataSource } from '../datasource/home-remote-datasource';
import { toTransaction } from '../mapper/home-mapper';

type Dependencies = {
  remoteDataSource: HomeRemoteDataSource;
};

export function createTransactionHistoryRepositoryImpl({
  remoteDataSource,
}: Dependencies): TransactionHistoryRepository {
  return {
    async getPage(page, limit): Promise<Result<TransactionSlice, AppError>> {
      const response = await remoteDataSource.getTransactionPage(page, limit);

      return map(response, (slice) => ({
        transactions: slice.data.map(toTransaction),
        total: slice.total,
        pageSize: slice.limit,
      }));
    },
  };
}
