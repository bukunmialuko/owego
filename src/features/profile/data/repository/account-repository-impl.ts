import type { AccountRemoteDataSource } from '../datasource/account-remote-datasource';
import type { AccountRepository } from '../../domain/repository/account-repository';

export function createAccountRepositoryImpl(
  remoteDataSource: AccountRemoteDataSource,
): AccountRepository {
  return { deleteAccount: () => remoteDataSource.deleteAccount() };
}
