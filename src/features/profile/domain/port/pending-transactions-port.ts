import type { AppError } from '@/core/errors/app-error';
import type { Result } from '@/core/result/result';

type PendingTransaction = {
  amountMinor: number;
  currency: string;
};

export interface PendingTransactionsPort {
  listPending(): Promise<Result<PendingTransaction[], AppError>>;
}
