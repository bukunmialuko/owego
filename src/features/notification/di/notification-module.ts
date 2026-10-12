import { asFunction, type NameAndRegistrationPair } from 'awilix';
import type { AppCradle } from '@/core/di/container';
import {
  createNotificationSettingsRemoteDataSource,
  type NotificationSettingsRemoteDataSource,
} from '../data/datasource/notification-settings-remote-datasource';
import { createNotificationSettingsRepositoryImpl } from '../data/repository/notification-settings-repository-impl';
import type { NotificationSettingsRepository } from '../domain/repository/notification-settings-repository';
import {
  createNotificationPreferencesUseCase,
  type NotificationPreferencesUseCase,
} from '../domain/usecase/notification-preferences-usecase';
import { createFirebaseMessagingAdapter } from '../data/adapter/firebase-messaging-adapter';
import { createPushCleanupTask } from '../data/adapter/push-cleanup-task';
import {
  createPushTokenRemoteDataSource,
  type PushTokenRemoteDataSource,
} from '../data/datasource/push-token-remote-datasource';
import { createPushTokenRepositoryImpl } from '../data/repository/push-token-repository-impl';
import type { PushMessagingPort } from '../domain/port/push-messaging-port';
import type { PushTokenRepository } from '../domain/repository/push-token-repository';
import {
  createRegisterPushTokenUseCase,
  type RegisterPushTokenUseCase,
} from '../domain/usecase/register-push-token-usecase';

declare module '@/core/di/container' {
  interface AppCradle {
    pushMessagingPort: PushMessagingPort;
    pushTokenRemoteDataSource: PushTokenRemoteDataSource;
    pushTokenRepository: PushTokenRepository;
    registerPushTokenUseCase: RegisterPushTokenUseCase;
    notificationSettingsRemoteDataSource: NotificationSettingsRemoteDataSource;
    notificationSettingsRepository: NotificationSettingsRepository;
    notificationPreferencesUseCase: NotificationPreferencesUseCase;
  }
}

type Cradle = AppCradle;

export const notificationRegistrations: NameAndRegistrationPair<Cradle> = {
  notificationSettingsRemoteDataSource: asFunction(({ apiClient }: Cradle) =>
    createNotificationSettingsRemoteDataSource(apiClient),
  ).singleton(),

  notificationSettingsRepository: asFunction(({ notificationSettingsRemoteDataSource }: Cradle) =>
    createNotificationSettingsRepositoryImpl(notificationSettingsRemoteDataSource),
  ).singleton(),

  notificationPreferencesUseCase: asFunction(
    ({ notificationSettingsRepository, pushMessagingPort }: Cradle) =>
      createNotificationPreferencesUseCase({
        notificationSettingsRepository,
        messaging: pushMessagingPort,
      }),
  ).singleton(),

  pushMessagingPort: asFunction(() => createFirebaseMessagingAdapter()).singleton(),

  pushTokenRemoteDataSource: asFunction(({ apiClient, publicApiClient }: Cradle) =>
    createPushTokenRemoteDataSource(apiClient, publicApiClient),
  ).singleton(),

  pushTokenRepository: asFunction(({ pushTokenRemoteDataSource }: Cradle) =>
    createPushTokenRepositoryImpl(pushTokenRemoteDataSource),
  ).singleton(),

  registerPushTokenUseCase: asFunction(
    ({ pushMessagingPort, pushTokenRepository, tokenStore, cache }: Cradle) =>
      createRegisterPushTokenUseCase({
        messaging: pushMessagingPort,
        pushTokenRepository,
        tokenStore,
        cache,
      }),
  ).singleton(),
};

export const notificationPreferencesRegistration = {
  settingsNotificationsPort: asFunction(
    ({ notificationPreferencesUseCase }: Cradle) => notificationPreferencesUseCase,
  ).singleton(),
};

export const pushRegistrationRegistration = {
  pushRegistrationPort: asFunction(({ registerPushTokenUseCase }: Cradle) => ({
    async registerIfNeeded(): Promise<void> {
      await registerPushTokenUseCase.execute();
    },
  })).singleton(),
};

export function installNotificationSideEffects(cradle: Cradle): () => void {
  cradle.sessionCleanup.registerPre(
    createPushCleanupTask({
      pushTokenRepository: cradle.pushTokenRepository,
      tokenStore: cradle.tokenStore,
      cache: cradle.cache,
    }),
  );

  const stopPersistListener = cradle.tokenStore.onTokensPersisted(() => {
    void cradle.registerPushTokenUseCase.execute();
  });

  const stopRefreshListener = cradle.pushMessagingPort.onTokenRefresh(() => {
    void cradle.registerPushTokenUseCase.execute();
  });

  return () => {
    stopPersistListener();
    stopRefreshListener();
  };
}
