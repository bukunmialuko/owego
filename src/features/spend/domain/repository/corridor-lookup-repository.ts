import type { AppError } from '@/core/errors/app-error';
import type { Result } from '@/core/result/result';
import type { FieldOption, FieldOptionSource } from '../entity/beneficiary-form';

export type ResolvedAccount = {
  accountName: string;
  accountNumber: string;
};

type LookupContext = {
  countryCode: string;
};

export interface CorridorLookupRepository {
  getOptions(
    source: FieldOptionSource,
    context: LookupContext,
  ): Promise<Result<readonly FieldOption[], AppError>>;
  resolveAccount(
    bankCode: string,
    accountNumber: string,
  ): Promise<Result<ResolvedAccount | undefined, AppError>>;
}
