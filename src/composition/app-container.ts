import { asFunction, asValue, type AwilixContainer, type NameAndRegistrationPair } from 'awilix';
import { QueryClient } from '@tanstack/react-query';
import { toAppError } from '@/core/errors/app-error-exception';
import type { AppConfig } from '@/core/config/app-config';
import { createAppContainer, type AppCradle } from '@/core/di/container';
import { createQueryCacheCleanupTask } from './query-cache-cleanup-task';
import { createPreviewFxRateRepository } from '@/core/fx/preview-fx-rate-repository';
import { createPreviewYieldOverviewRepository } from '@/core/yield/preview-yield-overview-repository';
import {
  authRegistrations,
  installAuthSideEffects,
  profilePortRegistration,
} from '@/features/auth/di/auth-module';
import { kycRegistrations, settingsVerificationRegistration } from '@/features/kyc/di/kyc-module';
import { profileRegistrations } from '@/features/profile/di/profile-module';
import { splashRegistrations } from '@/features/splash/di/splash-module';
import {
  installNotificationSideEffects,
  notificationPreferencesRegistration,
  notificationRegistrations,
  pushRegistrationRegistration,
} from '@/features/notification/di/notification-module';
import { creditRegistrations } from '@/features/credit/di/credit-module';
import { referRegistrations } from '@/features/refer/di/refer-module';
import { yieldRegistrations } from '@/features/yield/di/yield-module';
import {
  homeRegistrations,
  pendingTransactionsRegistration,
  tokenBalanceRegistration,
} from '@/features/home/di/home-module';
import {
  settingsPinRegistration,
  solanaWalletAddressRegistration,
  transferSigningRegistration,
  walletBalanceRegistration,
  walletProvisioningRegistration,
  walletRegistrations,
  yieldSigningRegistration,
} from '@/features/wallet/di/wallet-module';
import { createPreviewYieldSigningAdapter } from '@/features/wallet/data/adapter/preview-yield-signing-adapter';
import { receiveRegistrations } from '@/features/receive/di/receive-module';
import { payeePortRegistration, spendRegistrations } from '@/features/spend/di/spend-module';
import { travelRegistrations } from '@/features/travel/di/travel-module';
import {
  createPreviewTransactionDetailRepository,
  createPreviewTransactionHistoryRepository,
  createPreviewTransactionRepository,
  createPreviewVerificationRepository,
} from '@/features/home/data/repository/preview-home-repository';
import { createPreviewAccountRepository } from '@/features/profile/data/repository/preview-account-repository';
import { createPreviewProfileRepository } from '@/features/auth/data/repository/preview-profile-repository';
import { createPreviewWalletRepository } from '@/features/wallet/data/repository/preview-wallet-repository';
import { createPreviewCorridorLookupRepository } from '@/features/spend/data/repository/preview-corridor-lookup-repository';
import { createPreviewBeneficiaryRepository } from '@/features/spend/data/repository/preview-beneficiary-repository';
import { createPreviewAccountCaptureRepository } from '@/features/spend/data/repository/preview-account-capture-repository';
import { createPreviewTransferChallengeRepository } from '@/features/spend/data/repository/preview-transfer-challenge-repository';
import { createPreviewTransferSigningAdapter } from '@/features/wallet/data/adapter/preview-transfer-signing-adapter';
import { createPreviewReceiveRepository } from '@/features/receive/data/repository/preview-receive-repository';
import { createPreviewSolanaNetworkRepository } from '@/features/receive/data/repository/preview-solana-network-repository';
import { createPreviewExternalWalletAdapter } from '@/features/receive/data/adapter/preview-external-wallet-adapter';
import { createPreviewNotificationSettingsRepository } from '@/features/notification/data/repository/preview-notification-settings-repository';
import { createPreviewCreditRepository } from '@/features/credit/data/repository/preview-credit-repository';
import { createPreviewReferRepository } from '@/features/refer/data/repository/preview-refer-repository';
import { createPreviewYieldRepository } from '@/features/yield/data/repository/preview-yield-repository';
import {
  createPreviewEsimRepository,
  createPreviewInsuranceRepository,
} from '@/features/travel/data/repository/preview-travel-repository';

export type Cradle = AppCradle;

declare module '@/core/di/container' {
  interface AppCradle {
    queryClient: QueryClient;
  }
}

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: (failureCount, error) => toAppError(error)?.retryable === true && failureCount < 2,
      },
      mutations: { retry: false },
    },
  });
}

export function mergeFeatureRegistrations(
  modules: Record<string, NameAndRegistrationPair<Partial<Cradle>>>,
): NameAndRegistrationPair<Partial<Cradle>> {
  const merged: Record<string, unknown> = {};
  const declaredBy = new Map<string, string>();

  for (const [moduleName, registrations] of Object.entries(modules)) {
    for (const [key, registration] of Object.entries(registrations)) {
      const previous = declaredBy.get(key);

      if (previous !== undefined) {
        throw new Error(
          `Duplicate DI registration "${key}": declared by both ${previous} and ${moduleName}. ` +
            'A port takes exactly one adapter — delete the unused one rather than letting ' +
            'declaration order pick.',
        );
      }

      declaredBy.set(key, moduleName);
      merged[key] = registration;
    }
  }

  return merged;
}

const featureRegistrations = mergeFeatureRegistrations({
  authRegistrations,
  creditRegistrations,
  kycRegistrations,
  notificationRegistrations,
  profileRegistrations,
  splashRegistrations,
  homeRegistrations,
  receiveRegistrations,
  spendRegistrations,
  travelRegistrations,
  referRegistrations,
  yieldRegistrations,
  walletRegistrations,
  walletProvisioningRegistration,
  walletBalanceRegistration,
  solanaWalletAddressRegistration,
  tokenBalanceRegistration,
  payeePortRegistration,
  profilePortRegistration,
  pushRegistrationRegistration,
  notificationPreferencesRegistration,
  settingsPinRegistration,
  transferSigningRegistration,
  yieldSigningRegistration,
  pendingTransactionsRegistration,
  settingsVerificationRegistration,
});

const previewRegistrations: NameAndRegistrationPair<Partial<Cradle>> = {
  walletRepository: asFunction(() => createPreviewWalletRepository()).singleton(),
  profileRepository: asFunction(() => createPreviewProfileRepository()).singleton(),
  accountRepository: asFunction(() => createPreviewAccountRepository()).singleton(),
  transactionRepository: asFunction(() => createPreviewTransactionRepository()).singleton(),
  transactionHistoryRepository: asFunction(() =>
    createPreviewTransactionHistoryRepository(),
  ).singleton(),
  transactionDetailRepository: asFunction(() =>
    createPreviewTransactionDetailRepository(),
  ).singleton(),
  fxRateRepository: asFunction(() => createPreviewFxRateRepository()).singleton(),
  yieldOverviewRepository: asFunction(() => createPreviewYieldOverviewRepository()).singleton(),
  verificationRepository: asFunction(() => createPreviewVerificationRepository()).singleton(),
  beneficiaryRepository: asFunction(() => createPreviewBeneficiaryRepository()).singleton(),
  corridorLookupRepository: asFunction(() => createPreviewCorridorLookupRepository()).singleton(),
  accountCaptureRepository: asFunction(() => createPreviewAccountCaptureRepository()).singleton(),
  transferChallengeRepository: asFunction(() =>
    createPreviewTransferChallengeRepository(),
  ).singleton(),
  transferSigningPort: asFunction(() => createPreviewTransferSigningAdapter()).singleton(),
  creditRepository: asFunction(() => createPreviewCreditRepository()).singleton(),
  yieldRepository: asFunction(() => createPreviewYieldRepository()).singleton(),
  yieldSigningPort: asFunction(() => createPreviewYieldSigningAdapter()).singleton(),
  referRepository: asFunction(() => createPreviewReferRepository()).singleton(),
  esimRepository: asFunction(() => createPreviewEsimRepository()).singleton(),
  insuranceRepository: asFunction(() => createPreviewInsuranceRepository()).singleton(),
  receiveRepository: asFunction(() => createPreviewReceiveRepository()).singleton(),
  solanaNetworkRepository: asFunction(() => createPreviewSolanaNetworkRepository()).singleton(),
  externalWalletPort: asFunction(() => createPreviewExternalWalletAdapter()).singleton(),
  notificationSettingsRepository: asFunction(() =>
    createPreviewNotificationSettingsRepository(),
  ).singleton(),
};

export function createComposedContainer(
  config: AppConfig,
  overrides: NameAndRegistrationPair<Partial<Cradle>> = {},
): AwilixContainer<Cradle> {
  const container = createAppContainer(config, {
    queryClient: asValue(createQueryClient()),
    ...featureRegistrations,
    ...(config.usePreviewData ? previewRegistrations : {}),
    ...overrides,
  });

  installAuthSideEffects(container.cradle);
  installNotificationSideEffects(container.cradle);
  container.cradle.sessionCleanup.register(
    createQueryCacheCleanupTask(container.cradle.queryClient),
  );

  return container;
}
