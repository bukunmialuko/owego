import { serverError } from '@/core/errors/app-error';
import { err, ok } from '@/core/result/result';
import type { PayoutRemoteDataSource } from '../datasource/payout-remote-datasource';
import type { QrPayDto } from '../model/qr-pay-model';
import type { WalletToBankDto } from '../model/wallet-to-bank-model';
import { createBankTransferRepositoryImpl } from './bank-transfer-repository-impl';

const CHALLENGE_FIELDS = {
  challenge_id: 'challenge-1',
  user_token: 'user-token-1',
  encryption_key: 'encryption-key-1',
};

const WALLET_TO_BANK: WalletToBankDto = {
  amount_fiat: 500_000,
  amount_usdc: 3.58,
  base_amount_usdc: 3.33,
  rate: 1_500,
  ...CHALLENGE_FIELDS,
};

const QR_PAY: QrPayDto = {
  currency: 'VND',
  amount_local: 250_000,
  amount_usdc: 10,
  base_amount_usdc: 9.8,
  fee: { total_fee: 0.2 },
  rate: 0.0000392,
  ...CHALLENGE_FIELDS,
};

const BODY = { wallet_id: 'sol-wallet', amount: 500_000 };

function recordingDataSource({
  walletToBank = WALLET_TO_BANK,
  qrPay = QR_PAY,
}: { walletToBank?: WalletToBankDto; qrPay?: QrPayDto } = {}) {
  const calls: { endpoint: string; body: Record<string, unknown> }[] = [];
  const dataSource: PayoutRemoteDataSource = {
    walletToBank: (body) => {
      calls.push({ endpoint: 'wallet-to-bank', body });
      return Promise.resolve(ok(walletToBank));
    },
    qrPay: (body) => {
      calls.push({ endpoint: 'qr-pay', body });
      return Promise.resolve(ok(qrPay));
    },
  };

  return { dataSource, calls };
}

describe('bank transfer repository', () => {
  it('initiates a bank, mobile-money or Zelle payout through wallet-to-bank', async () => {
    const { dataSource, calls } = recordingDataSource();
    const repository = createBankTransferRepositoryImpl({ remoteDataSource: dataSource });

    const result = await repository.initiate('/transaction/wallet-to-bank', BODY);

    expect(calls).toEqual([{ endpoint: 'wallet-to-bank', body: BODY }]);
    expect(result.ok ? result.value.figures.totalUsdMinor : undefined).toBe(358);
  });

  it('initiates a merchant payment through qr-pay', async () => {
    const { dataSource, calls } = recordingDataSource();
    const repository = createBankTransferRepositoryImpl({ remoteDataSource: dataSource });

    const result = await repository.initiate('/transaction/qr-pay', BODY);

    expect(calls).toEqual([{ endpoint: 'qr-pay', body: BODY }]);
    expect(result.ok ? result.value.figures.currency : undefined).toBe('VND');
  });

  it('refuses the wallet endpoint without a request', async () => {
    const { dataSource, calls } = recordingDataSource();
    const repository = createBankTransferRepositoryImpl({ remoteDataSource: dataSource });

    const result = await repository.initiate('/transaction/challenge-id', BODY);

    expect(result.ok).toBe(false);
    expect(calls).toEqual([]);
  });

  it('passes a failed initiation through', async () => {
    const dataSource: PayoutRemoteDataSource = {
      walletToBank: () => Promise.resolve(err(serverError(400))),
      qrPay: () => Promise.resolve(err(serverError(400))),
    };
    const repository = createBankTransferRepositoryImpl({ remoteDataSource: dataSource });

    expect(await repository.initiate('/transaction/wallet-to-bank', BODY)).toEqual(
      err(serverError(400)),
    );
  });

  describe('refuses a challenge with a blank field before anything can sign it', () => {
    it.each(['challenge_id', 'user_token', 'encryption_key'])('%s', async (field) => {
      const { dataSource } = recordingDataSource({
        walletToBank: { ...WALLET_TO_BANK, [field]: '' },
        qrPay: { ...QR_PAY, [field]: '' },
      });
      const repository = createBankTransferRepositoryImpl({ remoteDataSource: dataSource });

      expect((await repository.initiate('/transaction/wallet-to-bank', BODY)).ok).toBe(false);
      expect((await repository.initiate('/transaction/qr-pay', BODY)).ok).toBe(false);
    });
  });
});
