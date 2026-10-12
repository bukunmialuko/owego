import { asFunction, type NameAndRegistrationPair } from 'awilix';
import type { AppCradle } from '@/core/di/container';
import { createSolanaWalletAddressAdapter } from '../data/adapter/solana-wallet-address-adapter';
import { createSplashWalletsAdapter } from '../data/adapter/splash-wallets-adapter';
import { createSettingsPinAdapter } from '../data/adapter/settings-pin-adapter';
import { createTransferSigningAdapter } from '../data/adapter/transfer-signing-adapter';
import { createYieldSigningAdapter } from '../data/adapter/yield-signing-adapter';
import { createWalletBalanceAdapter } from '../data/adapter/wallet-balance-adapter';
import { createCircleSdkAdapter } from '../data/adapter/circle-sdk-adapter';
import { createWalletProvisioningAdapter } from '../data/adapter/wallet-provisioning-adapter';
import {
  createWalletRemoteDataSource,
  type WalletRemoteDataSource,
} from '../data/datasource/wallet-remote-datasource';
import { createWalletRepositoryImpl } from '../data/repository/wallet-repository-impl';
import type { CircleWalletPort } from '../domain/port/circle-wallet-port';
import type { WalletRepository } from '../domain/repository/wallet-repository';
import {
  createCreateWalletUseCase,
  type CreateWalletUseCase,
} from '../domain/usecase/create-wallet-usecase';
import {
  createStreamWalletProvisioningUseCase,
  type StreamWalletProvisioningUseCase,
} from '../domain/usecase/stream-wallet-provisioning-usecase';

declare module '@/core/di/container' {
  interface AppCradle {
    walletRemoteDataSource: WalletRemoteDataSource;
    walletRepository: WalletRepository;
    circleWalletPort: CircleWalletPort;
    createWalletUseCase: CreateWalletUseCase;
    streamWalletProvisioningUseCase: StreamWalletProvisioningUseCase;
  }
}

type Cradle = AppCradle;

export const walletRegistrations: NameAndRegistrationPair<Cradle> = {
  walletRemoteDataSource: asFunction(({ apiClient }: Cradle) =>
    createWalletRemoteDataSource(apiClient),
  ).singleton(),

  walletRepository: asFunction(({ walletRemoteDataSource, cache }: Cradle) =>
    createWalletRepositoryImpl({ remoteDataSource: walletRemoteDataSource, cache }),
  ).singleton(),

  circleWalletPort: asFunction(({ config, i18n }: Cradle) =>
    createCircleSdkAdapter({
      appId: config.circleAppId,
      translate: (key) => i18n.t(key),
    }),
  ).singleton(),

  createWalletUseCase: asFunction(({ walletRepository, circleWalletPort }: Cradle) =>
    createCreateWalletUseCase({ walletRepository, circleWalletPort }),
  ).singleton(),

  streamWalletProvisioningUseCase: asFunction(({ walletRepository }: Cradle) =>
    createStreamWalletProvisioningUseCase({ walletRepository }),
  ).singleton(),
};

export const walletProvisioningRegistration = {
  walletProvisioning: asFunction(({ walletRepository }: Cradle) =>
    createWalletProvisioningAdapter(walletRepository),
  ).singleton(),
};

export const settingsPinRegistration = {
  settingsPinPort: asFunction(({ walletRepository, circleWalletPort }: Cradle) =>
    createSettingsPinAdapter(walletRepository, circleWalletPort),
  ).singleton(),
};

export const transferSigningRegistration = {
  transferSigningPort: asFunction(({ circleWalletPort }: Cradle) =>
    createTransferSigningAdapter(circleWalletPort),
  ).singleton(),
};

export const yieldSigningRegistration = {
  yieldSigningPort: asFunction(({ circleWalletPort }: Cradle) =>
    createYieldSigningAdapter(circleWalletPort),
  ).singleton(),
};

export const walletBalanceRegistration = {
  walletBalancePort: asFunction(({ walletRepository }: Cradle) =>
    createWalletBalanceAdapter(walletRepository),
  ).singleton(),

  splashWalletsPort: asFunction(({ walletRepository, cache }: Cradle) =>
    createSplashWalletsAdapter(walletRepository, cache),
  ).singleton(),
};

export const solanaWalletAddressRegistration = {
  solanaWalletAddressPort: asFunction(({ walletRepository }: Cradle) =>
    createSolanaWalletAddressAdapter(walletRepository),
  ).singleton(),
};
