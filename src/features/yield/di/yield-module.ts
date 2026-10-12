import { asFunction, type NameAndRegistrationPair } from 'awilix';
import type { AppCradle } from '@/core/di/container';
import {
  createYieldRemoteDataSource,
  type YieldRemoteDataSource,
} from '../data/datasource/yield-remote-datasource';
import { createYieldRepositoryImpl } from '../data/repository/yield-repository-impl';
import type { YieldSigningPort } from '../domain/port/yield-signing-port';
import type { YieldRepository } from '../domain/repository/yield-repository';
import {
  createLoadYieldProductsUseCase,
  type LoadYieldProductsUseCase,
} from '../domain/usecase/load-yield-products-usecase';
import {
  createPrepareYieldMoveUseCase,
  type PrepareYieldMoveUseCase,
} from '../domain/usecase/prepare-yield-move-usecase';
import {
  createQuoteYieldDepositUseCase,
  type QuoteYieldDepositUseCase,
} from '../domain/usecase/quote-yield-deposit-usecase';
import {
  createQuoteYieldWithdrawalUseCase,
  type QuoteYieldWithdrawalUseCase,
} from '../domain/usecase/quote-yield-withdrawal-usecase';

declare module '@/core/di/container' {
  interface AppCradle {
    yieldRemoteDataSource: YieldRemoteDataSource;
    yieldRepository: YieldRepository;
    yieldSigningPort: YieldSigningPort;
    loadYieldProductsUseCase: LoadYieldProductsUseCase;
    quoteYieldDepositUseCase: QuoteYieldDepositUseCase;
    quoteYieldWithdrawalUseCase: QuoteYieldWithdrawalUseCase;
    prepareYieldMoveUseCase: PrepareYieldMoveUseCase;
  }
}

type Cradle = AppCradle;

export const yieldRegistrations: NameAndRegistrationPair<Cradle> = {
  yieldRemoteDataSource: asFunction(({ apiClient }: Cradle) =>
    createYieldRemoteDataSource(apiClient),
  ).singleton(),
  yieldRepository: asFunction(({ yieldRemoteDataSource }: Cradle) =>
    createYieldRepositoryImpl({ remote: yieldRemoteDataSource }),
  ).singleton(),
  loadYieldProductsUseCase: asFunction(({ yieldRepository, walletBalancePort }: Cradle) =>
    createLoadYieldProductsUseCase({ yieldRepository, walletBalancePort }),
  ).singleton(),
  quoteYieldDepositUseCase: asFunction(({ yieldRepository, loadYieldProductsUseCase }: Cradle) =>
    createQuoteYieldDepositUseCase({
      yieldRepository,
      loadYieldProducts: loadYieldProductsUseCase,
    }),
  ).singleton(),
  quoteYieldWithdrawalUseCase: asFunction(({ yieldRepository, yieldOverviewRepository }: Cradle) =>
    createQuoteYieldWithdrawalUseCase({ yieldRepository, yieldOverviewRepository }),
  ).singleton(),
  prepareYieldMoveUseCase: asFunction(({ yieldRepository, yieldSigningPort }: Cradle) =>
    createPrepareYieldMoveUseCase({ yieldRepository, yieldSigningPort }),
  ).singleton(),
};
