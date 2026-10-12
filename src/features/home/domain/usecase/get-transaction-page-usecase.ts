import type { AppError } from '@/core/errors/app-error';
import { map, type Result } from '@/core/result/result';
import type { TransactionPage, TransactionSlice } from '../entity/transaction-page';
import type { TransactionHistoryRepository } from '../repository/home-repository';

export const TRANSACTION_PAGE_SIZE = 20;

type Dependencies = {
  transactionHistoryRepository: TransactionHistoryRepository;
};

export interface GetTransactionPageUseCase {
  execute(page: number): Promise<Result<TransactionPage, AppError>>;
}

export function createGetTransactionPageUseCase({
  transactionHistoryRepository,
}: Dependencies): GetTransactionPageUseCase {
  return {
    async execute(page) {
      if (!Number.isInteger(page) || page < 1) {
        throw new RangeError(`Transaction pages are numbered from 1, not ${String(page)}`);
      }

      const slice = await transactionHistoryRepository.getPage(page, TRANSACTION_PAGE_SIZE);

      return map(slice, (loaded) => ({
        transactions: loaded.transactions,
        nextPage: hasMoreAfter(page, loaded) ? page + 1 : undefined,
      }));
    },
  };
}

function hasMoreAfter(page: number, { transactions, total, pageSize }: TransactionSlice) {
  if (transactions.length === 0) return false;

  const size = pageSize > 0 ? pageSize : TRANSACTION_PAGE_SIZE;
  if (transactions.length < size) return false;

  return total === 0 || page * size < total;
}
