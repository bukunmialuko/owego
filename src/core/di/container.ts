import {
  InjectionMode,
  asFunction,
  asValue,
  createContainer,
  type AwilixContainer,
  type NameAndRegistrationPair,
} from 'awilix';
import type { AppConfig } from '@/core/config/app-config';
import { createAvatarAppearanceRepositoryImpl } from '@/core/avatar/avatar-appearance-repository-impl';
import {
  createAvatarAppearanceStore,
  type AvatarAppearanceStore,
} from '@/core/avatar/avatar-appearance-store';
import {
  createDisplayCurrencyStore,
  type DisplayCurrencyStore,
} from '@/core/display-currency/display-currency-store';
import { createI18n, type I18nInstance } from '@/core/i18n/i18n';
import { andThen } from '@/core/result/result';
import { derivePinKey, type PinKdf } from '@/core/crypto/pin-kdf';
import { secureRandom, type SecureRandom } from '@/core/crypto/secure-random';
import { createStaticFeatureFlags, type FeatureFlags } from '@/core/feature-flags/feature-flags';
import { createFxRateRepositoryImpl } from '@/core/fx/fx-rate-repository-impl';
import type { FxRateRepository } from '@/core/fx/fx-rate';
import { createYieldOverviewRepositoryImpl } from '@/core/yield/yield-overview-repository-impl';
import type { YieldOverviewRepository } from '@/core/yield/yield-overview';
import { createAppLockHold, type AppLockHold } from '@/core/session/app-lock-hold';
import type { PayeePort } from '@/core/payee/payee';
import type { WalletBalancePort } from '@/core/wallet/wallet';
import { createHttpClient, type HttpClient } from '@/core/network/http-client';
import { createTokenStore, type TokenStore } from '@/core/network/auth-tokens';
import {
  createEphemeralTokenPersistence,
  type TokenPersistence,
} from '@/core/network/token-persistence';
import { parseRefreshResponse } from '@/core/network/refresh-response-model';
import {
  createRefreshTokenService,
  type RefreshTokenService,
} from '@/core/network/refresh-token-service';
import { createNoopTelemetry, type Telemetry } from '@/core/observability/telemetry';
import {
  createSessionCleanupRegistry,
  type SessionCleanupRegistry,
} from '@/core/session/session-cleanup';
import { createStorageCleanupTask } from '@/core/session/storage-cleanup-task';
import { createSessionStore, type SessionStore } from '@/core/session/session-store';
import { createSignOutUseCase, type SignOutUseCase } from '@/core/session/sign-out-usecase';
import { createKeyValueStorage } from '@/core/storage/mmkv-key-value-storage';
import { createSecureStorage } from '@/core/storage/keychain-secure-storage';
import type { KeyValueStorage } from '@/core/storage/key-value-storage';
import type { SecureStorage } from '@/core/storage/secure-storage';

export interface AppCradle {
  config: AppConfig;
  i18n: I18nInstance;
  secureStorage: SecureStorage;
  secureRandom: SecureRandom;
  pinKdf: PinKdf;
  cache: KeyValueStorage;
  tokenPersistence: TokenPersistence;
  tokenStore: TokenStore;
  refreshTokenService: RefreshTokenService;
  apiClient: HttpClient;
  publicApiClient: HttpClient;
  telemetry: Telemetry;
  featureFlags: FeatureFlags;
  fxRateRepository: FxRateRepository;
  yieldOverviewRepository: YieldOverviewRepository;
  appLockHold: AppLockHold;
  walletBalancePort: WalletBalancePort;
  payeePort: PayeePort;
  sessionCleanup: SessionCleanupRegistry;
  sessionStore: SessionStore;
  avatarAppearanceStore: AvatarAppearanceStore;
  displayCurrencyStore: DisplayCurrencyStore;
  signOutUseCase: SignOutUseCase;
}

export function createAppContainer(
  config: AppConfig,
  overrides: NameAndRegistrationPair<Partial<AppCradle>> = {},
): AwilixContainer<AppCradle> {
  const container = createContainer<AppCradle>({
    injectionMode: InjectionMode.PROXY,
    strict: true,
  });

  container.register({
    config: asValue(config),
    i18n: asFunction(() => createI18n()).singleton(),

    secureStorage: asFunction(() => createSecureStorage()).singleton(),
    secureRandom: asValue(secureRandom),
    pinKdf: asValue(derivePinKey),
    cache: asFunction(() => createKeyValueStorage('owego')).singleton(),

    tokenPersistence: asFunction(() => createEphemeralTokenPersistence()).singleton(),

    tokenStore: asFunction(({ tokenPersistence }: AppCradle) =>
      createTokenStore(tokenPersistence),
    ).singleton(),

    sessionCleanup: asFunction(({ cache, secureStorage }: AppCradle) => {
      const registry = createSessionCleanupRegistry();
      registry.register(createStorageCleanupTask({ cache, secureStorage }));

      return registry;
    }).singleton(),
    sessionStore: asFunction(() => createSessionStore()).singleton(),
    avatarAppearanceStore: asFunction(({ cache, sessionStore }: AppCradle) =>
      createAvatarAppearanceStore({
        repository: createAvatarAppearanceRepositoryImpl({ cache }),
        sessionStore,
      }),
    ).singleton(),
    displayCurrencyStore: asFunction(({ cache }: AppCradle) =>
      createDisplayCurrencyStore(cache),
    ).singleton(),
    telemetry: asFunction(() => createNoopTelemetry()).singleton(),
    featureFlags: asFunction(() => createStaticFeatureFlags()).singleton(),

    fxRateRepository: asFunction(({ apiClient }: AppCradle) =>
      createFxRateRepositoryImpl(apiClient),
    ).singleton(),

    appLockHold: asFunction(() => createAppLockHold()).singleton(),

    yieldOverviewRepository: asFunction(({ apiClient }: AppCradle) =>
      createYieldOverviewRepositoryImpl(apiClient),
    ).singleton(),

    publicApiClient: asFunction(({ config: appConfig }: AppCradle) =>
      createHttpClient({ baseUrl: appConfig.apiBaseUrl }),
    ).singleton(),

    signOutUseCase: asFunction(({ sessionCleanup, tokenStore, sessionStore }: AppCradle) =>
      createSignOutUseCase({
        sessionCleanup,
        tokenStore,
        signedOut: () => {
          sessionStore.getState().signedOut();
        },
      }),
    ).singleton(),

    refreshTokenService: asFunction(({ tokenStore, publicApiClient }: AppCradle) =>
      createRefreshTokenService({
        tokenStore,
        requestRefresh: async (refreshToken) =>
          andThen(
            await publicApiClient.post<unknown>('/auth/refresh', { refresh_token: refreshToken }),
            parseRefreshResponse,
          ),
      }),
    ).singleton(),

    apiClient: asFunction(
      ({
        config: appConfig,
        tokenStore,
        refreshTokenService,
        sessionStore,
        signOutUseCase,
      }: AppCradle) =>
        createHttpClient({
          baseUrl: appConfig.apiBaseUrl,
          auth: {
            tokenStore,
            refreshService: refreshTokenService,
            onSessionExpired: () => {
              sessionStore.getState().signedOut();
              void signOutUseCase.execute();
            },
          },
        }),
    ).singleton(),

    ...overrides,
  });

  return container;
}
