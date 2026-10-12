import type { AppError } from '@/core/errors/app-error';
import { err, map, ok, type Result } from '@/core/result/result';
import type { FieldOption } from '../../domain/entity/beneficiary-form';
import type {
  CorridorLookupRepository,
  ResolvedAccount,
} from '../../domain/repository/corridor-lookup-repository';
import type { CorridorLookupRemoteDataSource } from '../datasource/corridor-lookup-remote-datasource';
import { CATEGORY_OPTIONS, countryOptions, networkOptions } from './static-field-options';

type Dependencies = {
  remoteDataSource: CorridorLookupRemoteDataSource;
};

const REFUSED = new Set([400, 404, 422]);

export function createCorridorLookupRepositoryImpl({
  remoteDataSource,
}: Dependencies): CorridorLookupRepository {
  return {
    async getOptions(source, context): Promise<Result<readonly FieldOption[], AppError>> {
      switch (source) {
        case 'bankList': {
          const banks = await remoteDataSource.getBanks(context.countryCode);

          return map(banks, (list) =>
            list
              .filter((bank) => bank.bank_code.trim() !== '' && bank.bank_name.trim() !== '')
              .map((bank) => ({ value: bank.bank_code, label: bank.bank_name })),
          );
        }
        case 'countries':
          return ok(countryOptions());
        case 'beneficiaryCategories':
          return ok(CATEGORY_OPTIONS);
        case 'networks':
          return ok(networkOptions());
        case 'mobileMoneyProviders':
          return ok([]);
      }
    },

    async resolveAccount(bankCode, accountNumber) {
      const resolved = await remoteDataSource.resolveAccount(bankCode, accountNumber);

      if (!resolved.ok) {
        return isRefusal(resolved.error) ? ok(undefined) : err(resolved.error);
      }

      const accountName = resolved.value.account_name.trim();
      const answer: ResolvedAccount | undefined =
        accountName === ''
          ? undefined
          : { accountName, accountNumber: resolved.value.account_number || accountNumber };

      return ok(answer);
    },
  };
}

function isRefusal(error: AppError): boolean {
  return error.httpStatus !== undefined && REFUSED.has(error.httpStatus);
}
