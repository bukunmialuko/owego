import { asFunction, type NameAndRegistrationPair } from 'awilix';
import { getLocales } from 'react-native-localize';
import type { AppCradle } from '@/core/di/container';
import { hasSkippedKyc } from '@/core/session/kyc-skip';
import { countryFixture } from '@/core/reference-data/reference-data';
import { CacheKey, PreferenceKey } from '@/core/storage/storage-keys';
import { unwrapOr } from '@/core/result/result';
import { createAppLockAdapter } from '../data/adapter/app-lock-adapter';
import { createBiometricAdapter } from '../data/adapter/biometric-adapter';
import { createAppleAuthenticator } from '../data/adapter/apple-authenticator';
import { createGoogleAuthenticator } from '../data/adapter/google-authenticator';
import { createGoogleSessionCleanupTask } from '../data/adapter/google-session-cleanup-task';
import { createSettingsSecurityAdapter } from '../data/adapter/settings-security-adapter';
import { createProfileAdapter } from '../data/adapter/profile-adapter';
import { createAuthRemoteDataSource } from '../data/datasource/auth-remote-datasource';
import {
  createProfileRemoteDataSource,
  type ProfileRemoteDataSource,
} from '../data/datasource/profile-remote-datasource';
import { createProfileRepositoryImpl } from '../data/repository/profile-repository-impl';
import { createAuthRepositoryImpl } from '../data/repository/auth-repository-impl';
import { createSignInSettingsRepositoryImpl } from '../data/repository/sign-in-settings-repository-impl';
import { createAdaptiveTokenPersistence } from '../data/repository/adaptive-token-persistence';
import { createSealedSessionVault } from '../data/repository/sealed-session-vault';
import { createPinRepositoryImpl } from '../data/repository/pin-repository-impl';
import { createUnlockAttemptStore } from '../data/repository/unlock-attempt-store';
import type { AuthRemoteDataSource } from '../data/datasource/auth-remote-datasource';
import type {
  BiometricPort,
  OAuthAuthenticator,
  SessionVault,
  UnlockAttemptStore,
  WalletProvisioningPort,
} from '../domain/port/auth-port';
import type {
  AuthRepository,
  PinRepository,
  ProfileRepository,
  SignInSettingsRepository,
} from '../domain/repository/auth-repository';
import {
  createResolveCountryUseCase,
  type ResolveCountryUseCase,
} from '../domain/usecase/resolve-country-usecase';
import { createSignInUseCase, type SignInUseCase } from '../domain/usecase/sign-in-usecase';
import {
  createBiometricSignInToggleUseCase,
  type BiometricSignInToggleUseCase,
} from '../domain/usecase/biometric-sign-in-toggle-usecase';
import {
  createPinSignInToggleUseCase,
  type PinSignInToggleUseCase,
} from '../domain/usecase/pin-sign-in-toggle-usecase';
import {
  createReadSignInSecurityUseCase,
  type ReadSignInSecurityUseCase,
} from '../domain/usecase/read-sign-in-security-usecase';
import { createUnlockUseCase, type UnlockUseCase } from '../domain/usecase/unlock-usecase';
import { cachedProfileSchema } from '../data/model/auth-model';

declare module '@/core/di/container' {
  interface AppCradle {
    authRemoteDataSource: AuthRemoteDataSource;
    profileRemoteDataSource: ProfileRemoteDataSource;
    authRepository: AuthRepository;
    profileRepository: ProfileRepository;
    pinRepository: PinRepository;
    signInSettingsRepository: SignInSettingsRepository;
    googleAuthenticator: OAuthAuthenticator;
    appleAuthenticator: OAuthAuthenticator;
    walletProvisioning: WalletProvisioningPort;
    signInWithGoogleUseCase: SignInUseCase;
    signInWithAppleUseCase: SignInUseCase;
    biometricPort: BiometricPort;
    sessionVault: SessionVault;
    unlockAttemptStore: UnlockAttemptStore;
    unlockUseCase: UnlockUseCase;
    pinSignInToggleUseCase: PinSignInToggleUseCase;
    biometricSignInToggleUseCase: BiometricSignInToggleUseCase;
    readSignInSecurityUseCase: ReadSignInSecurityUseCase;
    resolveCountryUseCase: ResolveCountryUseCase;
  }
}

type Cradle = AppCradle;

export const authRegistrations: NameAndRegistrationPair<Cradle> = {
  authRemoteDataSource: asFunction(({ publicApiClient }: Cradle) =>
    createAuthRemoteDataSource(publicApiClient),
  ).singleton(),

  resolveCountryUseCase: asFunction(({ cache }: Cradle) =>
    createResolveCountryUseCase({
      countries: unwrapOr(countryFixture.read(), []),
      cachedProfileCountry: () =>
        unwrapOr(cache.getObject(CacheKey.UserProfile, cachedProfileSchema), undefined)?.country,
      selectedCountry: () => cache.getString(PreferenceKey.SelectedCountry),
      deviceRegion: () => getLocales()[0]?.countryCode,
    }),
  ).singleton(),

  authRepository: asFunction(
    ({ authRemoteDataSource, tokenStore, cache, resolveCountryUseCase }: Cradle) =>
      createAuthRepositoryImpl({
        remoteDataSource: authRemoteDataSource,
        tokenStore,
        cache,
        resolveCountry: () => resolveCountryUseCase.execute(),
      }),
  ).singleton(),

  profileRemoteDataSource: asFunction(({ apiClient }: Cradle) =>
    createProfileRemoteDataSource(apiClient),
  ).singleton(),

  profileRepository: asFunction(({ profileRemoteDataSource, cache }: Cradle) =>
    createProfileRepositoryImpl({ remoteDataSource: profileRemoteDataSource, cache }),
  ).singleton(),

  pinRepository: asFunction(({ secureStorage, secureRandom, pinKdf }: Cradle) =>
    createPinRepositoryImpl({ secureStorage, random: secureRandom, kdf: pinKdf }),
  ).singleton(),

  signInSettingsRepository: asFunction(({ secureStorage }: Cradle) =>
    createSignInSettingsRepositoryImpl(secureStorage),
  ).singleton(),

  googleAuthenticator: asFunction(({ config }: Cradle) =>
    createGoogleAuthenticator({
      webClientId: config.googleWebClientId,
      iosClientId: config.googleIosClientId,
    }),
  ).singleton(),

  appleAuthenticator: asFunction(() => createAppleAuthenticator()).singleton(),

  biometricPort: asFunction(() => createBiometricAdapter('Unlock owego')).singleton(),

  sessionVault: asFunction(({ secureStorage, secureRandom, pinKdf }: Cradle) =>
    createSealedSessionVault({
      secureStorage,
      random: secureRandom,
      kdf: pinKdf,
      promptMessage: 'Unlock owego',
    }),
  ).singleton(),

  tokenPersistence: asFunction(({ sessionVault, signInSettingsRepository }: Cradle) =>
    createAdaptiveTokenPersistence({ vault: sessionVault, settings: signInSettingsRepository }),
  ).singleton(),

  unlockAttemptStore: asFunction(({ secureStorage }: Cradle) =>
    createUnlockAttemptStore(secureStorage),
  ).singleton(),

  pinSignInToggleUseCase: asFunction(
    ({
      pinRepository,
      signInSettingsRepository,
      unlockAttemptStore,
      tokenStore,
      sessionVault,
    }: Cradle) =>
      createPinSignInToggleUseCase({
        pinRepository,
        settings: signInSettingsRepository,
        attempts: unlockAttemptStore,
        tokenStore,
        vault: sessionVault,
      }),
  ).singleton(),

  biometricSignInToggleUseCase: asFunction(
    ({ biometricPort, signInSettingsRepository, sessionVault }: Cradle) =>
      createBiometricSignInToggleUseCase({
        biometrics: biometricPort,
        settings: signInSettingsRepository,
        vault: sessionVault,
      }),
  ).singleton(),

  readSignInSecurityUseCase: asFunction(({ signInSettingsRepository, biometricPort }: Cradle) =>
    createReadSignInSecurityUseCase({
      settings: signInSettingsRepository,
      biometrics: biometricPort,
    }),
  ).singleton(),

  unlockUseCase: asFunction(
    ({
      biometricPort,
      signInSettingsRepository,
      biometricSignInToggleUseCase,
      sessionVault,
      tokenStore,
      pinRepository,
      unlockAttemptStore,
    }: Cradle) =>
      createUnlockUseCase({
        biometrics: biometricPort,
        settings: signInSettingsRepository,
        biometricSignIn: biometricSignInToggleUseCase,
        vault: sessionVault,
        tokenStore,
        pinRepository,
        attempts: unlockAttemptStore,
      }),
  ).singleton(),

  signInWithGoogleUseCase: asFunction(
    ({
      authRepository,
      walletProvisioning,
      googleAuthenticator,
      cache,
      tokenPersistence,
    }: Cradle) =>
      createSignInUseCase({
        authRepository,
        walletProvisioning,
        authenticator: googleAuthenticator,
        provider: 'google',
        hasSkippedKyc: () => hasSkippedKyc(cache),
        sessionPersists: () => tokenPersistence.persists(),
      }),
  ).singleton(),

  signInWithAppleUseCase: asFunction(
    ({ authRepository, walletProvisioning, appleAuthenticator, cache, tokenPersistence }: Cradle) =>
      createSignInUseCase({
        authRepository,
        walletProvisioning,
        authenticator: appleAuthenticator,
        provider: 'apple',
        hasSkippedKyc: () => hasSkippedKyc(cache),
        sessionPersists: () => tokenPersistence.persists(),
      }),
  ).singleton(),
};

export function installAuthSideEffects(cradle: Cradle): void {
  cradle.sessionCleanup.register(createGoogleSessionCleanupTask());
}

export const profilePortRegistration = {
  kycProfilePort: asFunction(({ profileRepository }: Cradle) =>
    createProfileAdapter(profileRepository),
  ).singleton(),

  splashProfilePort: asFunction(({ profileRepository }: Cradle) =>
    createProfileAdapter(profileRepository),
  ).singleton(),

  settingsProfilePort: asFunction(({ profileRepository }: Cradle) =>
    createProfileAdapter(profileRepository),
  ).singleton(),

  settingsSecurityPort: asFunction(
    ({ pinSignInToggleUseCase, biometricSignInToggleUseCase, readSignInSecurityUseCase }: Cradle) =>
      createSettingsSecurityAdapter({
        pinSignIn: pinSignInToggleUseCase,
        biometricSignIn: biometricSignInToggleUseCase,
        readSecurity: readSignInSecurityUseCase,
      }),
  ).singleton(),

  appLockPort: asFunction(({ tokenStore, tokenPersistence }: Cradle) =>
    createAppLockAdapter(tokenStore, tokenPersistence),
  ).singleton(),
};
