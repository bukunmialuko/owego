import { asFunction, type NameAndRegistrationPair } from 'awilix';
import type { AppCradle } from '@/core/di/container';
import {
  createAccountRemoteDataSource,
  type AccountRemoteDataSource,
} from '../data/datasource/account-remote-datasource';
import { createAccountRepositoryImpl } from '../data/repository/account-repository-impl';
import type { AccountRepository } from '../domain/repository/account-repository';
import type { PendingTransactionsPort } from '../domain/port/pending-transactions-port';
import {
  createDeleteAccountUseCase,
  type DeleteAccountUseCase,
} from '../domain/usecase/delete-account-usecase';
import type { SettingsNotificationsPort } from '../domain/port/settings-notifications-port';
import type { SettingsVerificationPort } from '../domain/port/settings-verification-port';
import type { SettingsPinPort } from '../domain/port/settings-pin-port';
import type { SettingsProfilePort } from '../domain/port/settings-profile-port';
import type { SettingsSecurityPort } from '../domain/port/settings-security-port';

declare module '@/core/di/container' {
  interface AppCradle {
    settingsProfilePort: SettingsProfilePort;
    settingsNotificationsPort: SettingsNotificationsPort;
    settingsSecurityPort: SettingsSecurityPort;
    settingsPinPort: SettingsPinPort;
    settingsVerificationPort: SettingsVerificationPort;
    accountRemoteDataSource: AccountRemoteDataSource;
    accountRepository: AccountRepository;
    deleteAccountUseCase: DeleteAccountUseCase;
    pendingTransactionsPort: PendingTransactionsPort;
  }
}

type Cradle = AppCradle;

export const profileRegistrations: NameAndRegistrationPair<Cradle> = {
  accountRemoteDataSource: asFunction(({ apiClient }: Cradle) =>
    createAccountRemoteDataSource(apiClient),
  ).singleton(),

  accountRepository: asFunction(({ accountRemoteDataSource }: Cradle) =>
    createAccountRepositoryImpl(accountRemoteDataSource),
  ).singleton(),

  deleteAccountUseCase: asFunction(
    ({ walletBalancePort, pendingTransactionsPort, accountRepository }: Cradle) =>
      createDeleteAccountUseCase({
        walletBalancePort,
        pendingTransactionsPort,
        accountRepository,
      }),
  ).singleton(),
};
