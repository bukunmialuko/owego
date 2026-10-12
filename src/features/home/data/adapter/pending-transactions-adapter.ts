import type { AppError } from '@/core/errors/app-error';
import { map, type Result } from '@/core/result/result';
import type { TransactionRepository } from '../../domain/repository/home-repository';

type PendingTransaction = { amountMinor: number; currency: string };

const PENDING_WINDOW = 50;

export function createPendingTransactionsAdapter(transactionRepository: TransactionRepository) {
  return {
    async listPending(): Promise<Result<PendingTransaction[], AppError>> {
      const recent = await transactionRepository.getRecent(PENDING_WINDOW);

      return map(recent, (transactions) =>
        transactions
          .filter((transaction) => transaction.status === 'pending')
          .map((transaction) => ({
            amountMinor: transaction.amountMinor,
            currency: transaction.currency,
          })),
      );
    },
  };
}
