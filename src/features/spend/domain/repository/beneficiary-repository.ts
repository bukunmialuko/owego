import type { AppError } from '@/core/errors/app-error';
import type { Result } from '@/core/result/result';
import type { Beneficiary, RecipientFields } from '../entity/beneficiary';

export interface BeneficiaryRepository {
  list(): Promise<Result<Beneficiary[], AppError>>;
  getRecent(): Promise<Result<Beneficiary[], AppError>>;
  get(id: string): Promise<Result<Beneficiary, AppError>>;
  create(fields: RecipientFields): Promise<Result<void, AppError>>;
  remove(id: string): Promise<Result<void, AppError>>;
}
