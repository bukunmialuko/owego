import { fromZodError, type AppError } from '@/core/errors/app-error';
import type { HttpClient } from '@/core/network/http-client';
import { andThen, err, ok, type Result } from '@/core/result/result';
import {
  transactionDetailResponseSchema,
  transactionListResponseSchema,
  type TransactionDto,
  type TransactionPageDto,
} from '../model/transaction-model';

export interface HomeRemoteDataSource {
  getTransactionPage(page: number, limit: number): Promise<Result<TransactionPageDto, AppError>>;
  getTransaction(id: string): Promise<Result<TransactionDto, AppError>>;
}

export function createHomeRemoteDataSource(apiClient: HttpClient): HomeRemoteDataSource {
  return {
    async getTransactionPage(page, limit) {
      const response = await apiClient.get<unknown>(
        `/transaction?page=${String(page)}&limit=${String(limit)}`,
      );

      return andThen(response, (payload) => {
        const parsed = transactionListResponseSchema.safeParse(payload);
        return parsed.success ? ok(parsed.data.data) : err(fromZodError(parsed.error));
      });
    },

    async getTransaction(id) {
      const response = await apiClient.get<unknown>(`/transaction/${encodeURIComponent(id)}`);

      return andThen(response, (payload) => {
        const parsed = transactionDetailResponseSchema.safeParse(payload);
        return parsed.success ? ok(parsed.data.data) : err(fromZodError(parsed.error));
      });
    },
  };
}
