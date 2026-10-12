import { fromZodError, type AppError } from '@/core/errors/app-error';
import type { HttpClient } from '@/core/network/http-client';
import { andThen, err, ok, type Result } from '@/core/result/result';
import { bankListResponseSchema, type BankDto } from '../model/bank-list-model';
import {
  resolvedAccountResponseSchema,
  type ResolvedAccountDto,
} from '../model/resolved-account-model';

export interface CorridorLookupRemoteDataSource {
  getBanks(countryCode: string): Promise<Result<BankDto[], AppError>>;
  resolveAccount(
    bankCode: string,
    accountNumber: string,
  ): Promise<Result<ResolvedAccountDto, AppError>>;
}

export function createCorridorLookupRemoteDataSource({
  get,
  post,
}: Pick<HttpClient, 'get' | 'post'>): CorridorLookupRemoteDataSource {
  return {
    async getBanks(countryCode) {
      const response = await get<unknown>(
        `/transaction/list/banks?country=${encodeURIComponent(countryCode)}`,
      );

      return andThen(response, (payload) => {
        const parsed = bankListResponseSchema.safeParse(payload);

        return parsed.success ? ok(parsed.data.data) : err(fromZodError(parsed.error));
      });
    },

    async resolveAccount(bankCode, accountNumber) {
      const response = await post<unknown>('/transaction/resolve-account', {
        account_number: accountNumber,
        bank_code: bankCode,
      });

      return andThen(response, (payload) => {
        const parsed = resolvedAccountResponseSchema.safeParse(payload);

        return parsed.success ? ok(parsed.data.data) : err(fromZodError(parsed.error));
      });
    },
  };
}
