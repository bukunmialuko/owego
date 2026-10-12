import { asFunction, type NameAndRegistrationPair } from 'awilix';
import type { AppCradle } from '@/core/di/container';
import { createPendingTransactionsAdapter } from '../data/adapter/pending-transactions-adapter';
import { createTokenBalanceAdapter } from '../data/adapter/token-balance-adapter';
import { createAbsentVerificationRepository } from '../data/repository/absent-home-repository';
import {
  createHomeRemoteDataSource,
  type HomeRemoteDataSource,
} from '../data/datasource/home-remote-datasource';
import { createTransactionRepositoryImpl } from '../data/repository/home-repository-impl';
import { createTransactionDetailRepositoryImpl } from '../data/repository/transaction-detail-repository-impl';
import { createTransactionHistoryRepositoryImpl } from '../data/repository/transaction-history-repository-impl';
import type {
  TransactionDetailRepository,
  TransactionHistoryRepository,
  TransactionRepository,
  VerificationRepository,
} from '../domain/repository/home-repository';
import {
  createGetTransactionDetailUseCase,
  type GetTransactionDetailUseCase,
} from '../domain/usecase/get-transaction-detail-usecase';
import {
  createGetTransactionPageUseCase,
  type GetTransactionPageUseCase,
} from '../domain/usecase/get-transaction-page-usecase';

declare module '@/core/di/container' {
  interface AppCradle {
    homeRemoteDataSource: HomeRemoteDataSource;
    transactionRepository: TransactionRepository;
    transactionHistoryRepository: TransactionHistoryRepository;
    getTransactionPageUseCase: GetTransactionPageUseCase;
    transactionDetailRepository: TransactionDetailRepository;
    getTransactionDetailUseCase: GetTransactionDetailUseCase;
    verificationRepository: VerificationRepository;
  }
}

type Cradle = AppCradle;

export const homeRegistrations: NameAndRegistrationPair<Cradle> = {
  homeRemoteDataSource: asFunction(({ apiClient }: Cradle) =>
    createHomeRemoteDataSource(apiClient),
  ).singleton(),

  transactionRepository: asFunction(({ homeRemoteDataSource, cache }: Cradle) =>
    createTransactionRepositoryImpl({ remoteDataSource: homeRemoteDataSource, cache }),
  ).singleton(),

  transactionHistoryRepository: asFunction(({ homeRemoteDataSource }: Cradle) =>
    createTransactionHistoryRepositoryImpl({ remoteDataSource: homeRemoteDataSource }),
  ).singleton(),

  getTransactionPageUseCase: asFunction(({ transactionHistoryRepository }: Cradle) =>
    createGetTransactionPageUseCase({ transactionHistoryRepository }),
  ).singleton(),

  transactionDetailRepository: asFunction(({ homeRemoteDataSource }: Cradle) =>
    createTransactionDetailRepositoryImpl({ remoteDataSource: homeRemoteDataSource }),
  ).singleton(),

  getTransactionDetailUseCase: asFunction(({ transactionDetailRepository, config }: Cradle) =>
    createGetTransactionDetailUseCase({
      transactionDetailRepository,
      solanaCluster: config.solanaCluster,
    }),
  ).singleton(),

  verificationRepository: asFunction(() => createAbsentVerificationRepository()).singleton(),
};

export const tokenBalanceRegistration = {
  tokenBalancePort: asFunction(({ walletBalancePort }: Cradle) =>
    createTokenBalanceAdapter(walletBalancePort),
  ).singleton(),
};

export const pendingTransactionsRegistration = {
  pendingTransactionsPort: asFunction(({ transactionRepository }: Cradle) =>
    createPendingTransactionsAdapter(transactionRepository),
  ).singleton(),
};
