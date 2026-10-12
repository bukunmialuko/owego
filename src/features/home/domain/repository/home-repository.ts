import type { AppError } from '@/core/errors/app-error';
import type { Result } from '@/core/result/result';
import type { Transaction, VerificationNotice } from '../entity/home-entity';
import type { TransactionDetail } from '../entity/transaction-detail';
import type { TransactionSlice } from '../entity/transaction-page';

export interface TransactionRepository {
  getRecent(limit: number): Promise<Result<Transaction[], AppError>>;
}

export interface TransactionHistoryRepository {
  getPage(page: number, limit: number): Promise<Result<TransactionSlice, AppError>>;
}

export interface TransactionDetailRepository {
  getById(id: string): Promise<Result<TransactionDetail, AppError>>;
}

export interface VerificationRepository {
  getNotice(): Promise<Result<VerificationNotice | undefined, AppError>>;
  dismiss(): Promise<Result<void, AppError>>;
}
