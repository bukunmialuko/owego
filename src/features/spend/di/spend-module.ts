import { asFunction, asValue, type NameAndRegistrationPair } from 'awilix';
import type { ComponentType } from 'react';
import type { AppCradle } from '@/core/di/container';
import { createPayeePortAdapter } from '../data/adapter/payee-port-adapter';
import {
  createAccountCaptureRemoteDataSource,
  type AccountCaptureRemoteDataSource,
} from '../data/datasource/account-capture-remote-datasource';
import { createAccountCaptureRepositoryImpl } from '../data/repository/account-capture-repository-impl';
import {
  createCorridorLookupRemoteDataSource,
  type CorridorLookupRemoteDataSource,
} from '../data/datasource/corridor-lookup-remote-datasource';
import { createCorridorLookupRepositoryImpl } from '../data/repository/corridor-lookup-repository-impl';
import {
  createExpoCameraScannerAdapter,
  ExpoCameraScannerView,
} from '../data/adapter/expo-camera-scanner-adapter';
import {
  createPayoutRemoteDataSource,
  type PayoutRemoteDataSource,
} from '../data/datasource/payout-remote-datasource';
import { createBankTransferRepositoryImpl } from '../data/repository/bank-transfer-repository-impl';
import { createLastTransferCurrencyRepositoryImpl } from '../data/repository/last-transfer-currency-repository-impl';
import {
  createRecipientRemoteDataSource,
  type RecipientRemoteDataSource,
} from '../data/datasource/recipient-remote-datasource';
import { createBeneficiaryRepositoryImpl } from '../data/repository/beneficiary-repository-impl';
import {
  createTransferChallengeRemoteDataSource,
  type TransferChallengeRemoteDataSource,
} from '../data/datasource/transfer-challenge-remote-datasource';
import { createTransferChallengeRepositoryImpl } from '../data/repository/transfer-challenge-repository-impl';
import type { TransferSigningPort } from '../domain/port/transfer-signing-port';
import type { TransferChallengeRepository } from '../domain/repository/transfer-challenge-repository';
import {
  createSendAssetUseCase,
  type SendAssetUseCase,
} from '../domain/usecase/send-asset-usecase';
import {
  createPrepareBankPayoutUseCase,
  type PrepareBankPayoutUseCase,
} from '../domain/usecase/prepare-bank-payout-usecase';
import type { CameraScannerPort, ScannerViewProps } from '../domain/port/camera-scanner-port';
import type { AccountCaptureRepository } from '../domain/repository/account-capture-repository';
import type { TokenBalancePort } from '../domain/port/token-balance-port';
import type { BankTransferRepository } from '../domain/repository/bank-transfer-repository';
import type { LastTransferCurrencyRepository } from '../domain/repository/last-transfer-currency-repository';
import type { CorridorLookupRepository } from '../domain/repository/corridor-lookup-repository';
import type { BeneficiaryRepository } from '../domain/repository/beneficiary-repository';
import {
  createGetBeneficiaryUseCase,
  type GetBeneficiaryUseCase,
} from '../domain/usecase/get-beneficiary-usecase';
import {
  createRemoveBeneficiaryUseCase,
  type RemoveBeneficiaryUseCase,
} from '../domain/usecase/remove-beneficiary-usecase';
import {
  createSaveBeneficiaryUseCase,
  type SaveBeneficiaryUseCase,
} from '../domain/usecase/save-beneficiary-usecase';
import {
  createSavePaidRecipientUseCase,
  type SavePaidRecipientUseCase,
} from '../domain/usecase/save-paid-recipient-usecase';
import type { MerchantBeneficiaryRepository } from '../domain/repository/merchant-beneficiary-repository';
import {
  createSaveMerchantUseCase,
  type SaveMerchantUseCase,
} from '../domain/usecase/save-merchant-usecase';
import { createMerchantBeneficiaryRepositoryImpl } from '../data/repository/merchant-beneficiary-repository-impl';

declare module '@/core/di/container' {
  interface AppCradle {
    recipientRemoteDataSource: RecipientRemoteDataSource;
    beneficiaryRepository: BeneficiaryRepository;
    merchantBeneficiaryRepository: MerchantBeneficiaryRepository;
    saveMerchantUseCase: SaveMerchantUseCase;
    getBeneficiaryUseCase: GetBeneficiaryUseCase;
    removeBeneficiaryUseCase: RemoveBeneficiaryUseCase;
    saveBeneficiaryUseCase: SaveBeneficiaryUseCase;
    savePaidRecipientUseCase: SavePaidRecipientUseCase;
    payoutRemoteDataSource: PayoutRemoteDataSource;
    bankTransferRepository: BankTransferRepository;
    prepareBankPayoutUseCase: PrepareBankPayoutUseCase;
    lastTransferCurrencyRepository: LastTransferCurrencyRepository;
    tokenBalancePort: TokenBalancePort;
    cameraScannerPort: CameraScannerPort;
    cameraScannerView: ComponentType<ScannerViewProps>;
    accountCaptureRemoteDataSource: AccountCaptureRemoteDataSource;
    accountCaptureRepository: AccountCaptureRepository;
    corridorLookupRemoteDataSource: CorridorLookupRemoteDataSource;
    corridorLookupRepository: CorridorLookupRepository;
    transferChallengeRemoteDataSource: TransferChallengeRemoteDataSource;
    transferChallengeRepository: TransferChallengeRepository;
    transferSigningPort: TransferSigningPort;
    sendAssetUseCase: SendAssetUseCase;
  }
}

type Cradle = AppCradle;

export const spendRegistrations: NameAndRegistrationPair<Cradle> = {
  recipientRemoteDataSource: asFunction(({ apiClient }: Cradle) =>
    createRecipientRemoteDataSource(apiClient),
  ).singleton(),
  beneficiaryRepository: asFunction(({ recipientRemoteDataSource }: Cradle) =>
    createBeneficiaryRepositoryImpl({ remoteDataSource: recipientRemoteDataSource }),
  ).singleton(),
  getBeneficiaryUseCase: asFunction(({ beneficiaryRepository }: Cradle) =>
    createGetBeneficiaryUseCase({ beneficiaryRepository }),
  ).singleton(),
  removeBeneficiaryUseCase: asFunction(({ beneficiaryRepository }: Cradle) =>
    createRemoveBeneficiaryUseCase({ beneficiaryRepository }),
  ).singleton(),
  saveBeneficiaryUseCase: asFunction(({ beneficiaryRepository }: Cradle) =>
    createSaveBeneficiaryUseCase({ beneficiaryRepository }),
  ).singleton(),
  merchantBeneficiaryRepository: asFunction(({ recipientRemoteDataSource }: Cradle) =>
    createMerchantBeneficiaryRepositoryImpl({ remoteDataSource: recipientRemoteDataSource }),
  ).singleton(),
  saveMerchantUseCase: asFunction(({ merchantBeneficiaryRepository }: Cradle) =>
    createSaveMerchantUseCase({ merchantBeneficiaryRepository }),
  ).singleton(),
  savePaidRecipientUseCase: asFunction(
    ({ beneficiaryRepository, saveMerchantUseCase, saveBeneficiaryUseCase }: Cradle) =>
      createSavePaidRecipientUseCase({
        beneficiaryRepository,
        saveMerchantUseCase,
        saveBeneficiaryUseCase,
      }),
  ).singleton(),
  payoutRemoteDataSource: asFunction(({ apiClient }: Cradle) =>
    createPayoutRemoteDataSource(apiClient),
  ).singleton(),
  bankTransferRepository: asFunction(({ payoutRemoteDataSource }: Cradle) =>
    createBankTransferRepositoryImpl({ remoteDataSource: payoutRemoteDataSource }),
  ).singleton(),
  lastTransferCurrencyRepository: asFunction(({ cache }: Cradle) =>
    createLastTransferCurrencyRepositoryImpl({ cache }),
  ).singleton(),
  prepareBankPayoutUseCase: asFunction(
    ({
      walletBalancePort,
      bankTransferRepository,
      transferSigningPort,
      lastTransferCurrencyRepository,
    }: Cradle) =>
      createPrepareBankPayoutUseCase({
        walletBalancePort,
        bankTransferRepository,
        transferSigningPort,
        lastTransferCurrencyRepository,
      }),
  ).singleton(),
  cameraScannerPort: asFunction(() => createExpoCameraScannerAdapter()).singleton(),
  cameraScannerView: asValue(ExpoCameraScannerView),
  accountCaptureRemoteDataSource: asFunction(({ apiClient }: Cradle) =>
    createAccountCaptureRemoteDataSource(apiClient),
  ).singleton(),
  accountCaptureRepository: asFunction(({ accountCaptureRemoteDataSource }: Cradle) =>
    createAccountCaptureRepositoryImpl(accountCaptureRemoteDataSource),
  ).singleton(),
  corridorLookupRemoteDataSource: asFunction(({ apiClient }: Cradle) =>
    createCorridorLookupRemoteDataSource(apiClient),
  ).singleton(),
  corridorLookupRepository: asFunction(({ corridorLookupRemoteDataSource }: Cradle) =>
    createCorridorLookupRepositoryImpl({ remoteDataSource: corridorLookupRemoteDataSource }),
  ).singleton(),
  transferChallengeRemoteDataSource: asFunction(({ apiClient }: Cradle) =>
    createTransferChallengeRemoteDataSource(apiClient),
  ).singleton(),
  transferChallengeRepository: asFunction(({ transferChallengeRemoteDataSource }: Cradle) =>
    createTransferChallengeRepositoryImpl({ remoteDataSource: transferChallengeRemoteDataSource }),
  ).singleton(),
  sendAssetUseCase: asFunction(
    ({ walletBalancePort, transferChallengeRepository, transferSigningPort }: Cradle) =>
      createSendAssetUseCase({
        walletBalancePort,
        transferChallengeRepository,
        transferSigningPort,
      }),
  ).singleton(),
};

export const payeePortRegistration: NameAndRegistrationPair<Cradle> = {
  payeePort: asFunction(({ beneficiaryRepository }: Cradle) =>
    createPayeePortAdapter(beneficiaryRepository),
  ).singleton(),
};
