import { asFunction, type NameAndRegistrationPair } from 'awilix';
import type { AppCradle } from '@/core/di/container';
import { createHttpClient, type HttpClient } from '@/core/network/http-client';
import { createMobileWalletAdapter } from '../data/adapter/mobile-wallet-adapter';
import {
  createReceiveRemoteDataSource,
  type ReceiveRemoteDataSource,
} from '../data/datasource/receive-remote-datasource';
import {
  createSolanaRpcDataSource,
  type SolanaRpcDataSource,
} from '../data/datasource/solana-rpc-datasource';
import { createReceiveRepositoryImpl } from '../data/repository/receive-repository-impl';
import { createSolanaNetworkRepositoryImpl } from '../data/repository/solana-network-repository-impl';
import type { ExternalWalletPort } from '../domain/port/external-wallet-port';
import type { SolanaWalletAddressPort } from '../domain/port/solana-wallet-address-port';
import type { ReceiveRepository } from '../domain/repository/receive-repository';
import type { SolanaNetworkRepository } from '../domain/repository/solana-network-repository';
import {
  createAwaitDepositConfirmationUseCase,
  type AwaitDepositConfirmationUseCase,
} from '../domain/usecase/await-deposit-confirmation-usecase';
import {
  createSubmitExternalDepositUseCase,
  type SubmitExternalDepositUseCase,
} from '../domain/usecase/submit-external-deposit-usecase';

const RPC_TIMEOUT_MS = 15_000;

declare module '@/core/di/container' {
  interface AppCradle {
    receiveRemoteDataSource: ReceiveRemoteDataSource;
    receiveRepository: ReceiveRepository;
    solanaWalletAddressPort: SolanaWalletAddressPort;
    solanaRpcClient: HttpClient;
    solanaRpcDataSource: SolanaRpcDataSource;
    solanaNetworkRepository: SolanaNetworkRepository;
    externalWalletPort: ExternalWalletPort;
    submitExternalDepositUseCase: SubmitExternalDepositUseCase;
    awaitDepositConfirmationUseCase: AwaitDepositConfirmationUseCase;
  }
}

type Cradle = AppCradle;

export const receiveRegistrations: NameAndRegistrationPair<Cradle> = {
  receiveRemoteDataSource: asFunction(({ apiClient }: Cradle) =>
    createReceiveRemoteDataSource(apiClient),
  ).singleton(),

  receiveRepository: asFunction(({ receiveRemoteDataSource, solanaWalletAddressPort }: Cradle) =>
    createReceiveRepositoryImpl({
      remoteDataSource: receiveRemoteDataSource,
      solanaWalletAddressPort,
    }),
  ).singleton(),

  solanaRpcClient: asFunction(({ config }: Cradle) =>
    createHttpClient({ baseUrl: config.solanaRpcUrl, timeoutMs: RPC_TIMEOUT_MS }),
  ).singleton(),

  solanaRpcDataSource: asFunction(({ solanaRpcClient }: Cradle) =>
    createSolanaRpcDataSource(solanaRpcClient),
  ).singleton(),

  solanaNetworkRepository: asFunction(({ solanaRpcDataSource }: Cradle) =>
    createSolanaNetworkRepositoryImpl({ solanaRpcDataSource }),
  ).singleton(),

  externalWalletPort: asFunction(({ config }: Cradle) =>
    createMobileWalletAdapter({ cluster: config.solanaCluster }),
  ).singleton(),

  submitExternalDepositUseCase: asFunction(
    ({ config, solanaWalletAddressPort, solanaNetworkRepository, externalWalletPort }: Cradle) =>
      createSubmitExternalDepositUseCase({
        cluster: config.solanaCluster,
        solanaWalletAddressPort,
        solanaNetworkRepository,
        externalWalletPort,
      }),
  ).singleton(),

  awaitDepositConfirmationUseCase: asFunction(({ solanaNetworkRepository }: Cradle) =>
    createAwaitDepositConfirmationUseCase({ solanaNetworkRepository }),
  ).singleton(),
};
