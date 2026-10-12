import { asFunction, type NameAndRegistrationPair } from 'awilix';
import type { AppCradle } from '@/core/di/container';
import { createDiditSdkAdapter } from '../data/adapter/didit-sdk-adapter';
import {
  createKycRemoteDataSource,
  type KycRemoteDataSource,
} from '../data/datasource/kyc-remote-datasource';
import { createKycRepositoryImpl } from '../data/repository/kyc-repository-impl';
import type { DiditPort, KycProfilePort } from '../domain/port/didit-port';
import type { KycRepository } from '../domain/repository/kyc-repository';
import {
  createStartVerificationUseCase,
  type StartVerificationUseCase,
} from '../domain/usecase/start-verification-usecase';

declare module '@/core/di/container' {
  interface AppCradle {
    kycRemoteDataSource: KycRemoteDataSource;
    kycRepository: KycRepository;
    diditPort: DiditPort;
    kycProfilePort: KycProfilePort;
    startVerificationUseCase: StartVerificationUseCase;
  }
}

type Cradle = AppCradle;

export const kycRegistrations: NameAndRegistrationPair<Cradle> = {
  kycRemoteDataSource: asFunction(({ apiClient }: Cradle) =>
    createKycRemoteDataSource(apiClient),
  ).singleton(),

  kycRepository: asFunction(({ kycRemoteDataSource }: Cradle) =>
    createKycRepositoryImpl(kycRemoteDataSource),
  ).singleton(),

  diditPort: asFunction(() => createDiditSdkAdapter()).singleton(),

  startVerificationUseCase: asFunction(({ kycRepository, diditPort, kycProfilePort }: Cradle) =>
    createStartVerificationUseCase({ kycRepository, diditPort, profilePort: kycProfilePort }),
  ).singleton(),
};

export const settingsVerificationRegistration = {
  settingsVerificationPort: asFunction(({ startVerificationUseCase }: Cradle) => ({
    start: () => startVerificationUseCase.execute(),
  })).singleton(),
};
