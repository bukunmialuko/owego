import { map } from '@/core/result/result';
import type { TransactionDetailRepository } from '../../domain/repository/home-repository';
import type { HomeRemoteDataSource } from '../datasource/home-remote-datasource';
import { toTransactionDetail } from '../mapper/transaction-detail-mapper';

type Dependencies = {
  remoteDataSource: HomeRemoteDataSource;
};

export function createTransactionDetailRepositoryImpl({
  remoteDataSource,
}: Dependencies): TransactionDetailRepository {
  return {
    async getById(id) {
      const response = await remoteDataSource.getTransaction(id);

      return map(response, toTransactionDetail);
    },
  };
}
