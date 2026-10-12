import { unknownError, type AppError } from '@/core/errors/app-error';
import { andThen, err, ok, type Result } from '@/core/result/result';
import type { PayoutInitiation } from '../../domain/entity/payout-quote';
import type { BankTransferRepository } from '../../domain/repository/bank-transfer-repository';
import type { PayoutRemoteDataSource } from '../datasource/payout-remote-datasource';
import { fromQrPay, fromWalletToBank } from '../mapper/payout-initiation-mapper';

export function createBankTransferRepositoryImpl({
  remoteDataSource,
}: {
  remoteDataSource: PayoutRemoteDataSource;
}): BankTransferRepository {
  return {
    async initiate(endpoint, body) {
      switch (endpoint) {
        case '/transaction/wallet-to-bank':
          return andThen(await remoteDataSource.walletToBank(body), (dto) =>
            usable(fromWalletToBank(dto)),
          );
        case '/transaction/qr-pay':
          return andThen(await remoteDataSource.qrPay(body), (dto) => usable(fromQrPay(dto)));
        case '/transaction/challenge-id':
          return err(unknownError('Wallet sends are not initiated as payouts.'));
      }
    },
  };
}

function usable(initiation: PayoutInitiation): Result<PayoutInitiation, AppError> {
  const { challengeId, userToken, encryptionKey } = initiation.challenge;

  return challengeId !== '' && userToken !== '' && encryptionKey !== ''
    ? ok(initiation)
    : err(unknownError('Payout challenge incomplete: the backend returned a blank field.'));
}
