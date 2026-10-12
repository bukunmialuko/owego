import { asFunction, type NameAndRegistrationPair } from 'awilix';
import type { AppCradle } from '@/core/di/container';
import { hasSkippedKyc } from '@/core/session/kyc-skip';
import {
  createBootstrapSessionUseCase,
  type BootstrapSessionUseCase,
} from '../domain/usecase/bootstrap-session-usecase';
import type {
  AppLockPort,
  ProfilePort,
  PushRegistrationPort,
  WalletsPort,
} from '../domain/port/splash-port';

declare module '@/core/di/container' {
  interface AppCradle {
    bootstrapSessionUseCase: BootstrapSessionUseCase;
    splashProfilePort: ProfilePort;
    appLockPort: AppLockPort;
    splashWalletsPort: WalletsPort;
    pushRegistrationPort: PushRegistrationPort;
  }
}

type Cradle = AppCradle;

export const splashRegistrations: NameAndRegistrationPair<Cradle> = {
  bootstrapSessionUseCase: asFunction(
    ({
      tokenStore,
      refreshTokenService,
      sessionCleanup,
      appLockPort,
      splashProfilePort,
      splashWalletsPort,
      pushRegistrationPort,
      cache,
    }: Cradle) =>
      createBootstrapSessionUseCase({
        tokenStore,
        refreshTokenService,
        sessionCleanup,
        appLockPort,
        profilePort: splashProfilePort,
        walletsPort: splashWalletsPort,
        pushRegistrationPort,
        hasSkippedKyc: () => hasSkippedKyc(cache),
      }),
  ).singleton(),
};
