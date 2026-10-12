import { map } from '@/core/result/result';
import type { AccountCaptureRepository } from '../../domain/repository/account-capture-repository';
import type { AccountCaptureRemoteDataSource } from '../datasource/account-capture-remote-datasource';
import { toCapturedAccount } from '../mapper/captured-account-mapper';

export function createAccountCaptureRepositoryImpl(
  dataSource: AccountCaptureRemoteDataSource,
): AccountCaptureRepository {
  return {
    readAccount: async (still) =>
      map(await dataSource.readAccount(still), (dto) => {
        const account = toCapturedAccount(dto);
        const isReadable =
          account.accountNumber !== '' && account.bankCode !== '' && account.bankName !== '';

        return isReadable ? account : undefined;
      }),
  };
}
