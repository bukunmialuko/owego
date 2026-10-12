import type { QrPayDto } from '../model/qr-pay-model';
import type { WalletToBankDto } from '../model/wallet-to-bank-model';
import { fromQrPay, fromWalletToBank } from './payout-initiation-mapper';

const CHALLENGE_FIELDS = {
  challenge_id: 'challenge-1',
  user_token: 'user-token-1',
  encryption_key: 'encryption-key-1',
};

const CHALLENGE = {
  challengeId: 'challenge-1',
  userToken: 'user-token-1',
  encryptionKey: 'encryption-key-1',
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

describe('fromWalletToBank', () => {
  it('maps the payout and its challenge', () => {
    expect(fromWalletToBank(WALLET_TO_BANK)).toEqual({
      figures: {
        recipientGetsMinor: 500_000,
        recipientUsdMinor: 333,
        feeUsdMinor: 25,
        totalUsdMinor: 358,
        localPerUsd: 1_500,
      },
      challenge: CHALLENGE,
    });
  });

  it('reads amount_fiat as minor units, rounding a float artefact away', () => {
    expect(
      fromWalletToBank({ ...WALLET_TO_BANK, amount_fiat: 499_999.99999 }).figures
        .recipientGetsMinor,
    ).toBe(500_000);
  });

  it.each([
    [100.29, 10_029],
    [0.01, 1],
    [0, 0],
  ])('reads %p USDC as %p cents', (usdc, cents) => {
    expect(
      fromWalletToBank({ ...WALLET_TO_BANK, amount_usdc: usdc, base_amount_usdc: usdc }).figures
        .totalUsdMinor,
    ).toBe(cents);
  });

  it('reads a missing pre-fee amount as no fee at all', () => {
    const { figures } = fromWalletToBank({ ...WALLET_TO_BANK, base_amount_usdc: 0 });

    expect(figures.recipientUsdMinor).toBe(358);
    expect(figures.feeUsdMinor).toBe(0);
  });
});

describe('fromQrPay', () => {
  it('maps the merchant payment and its challenge', () => {
    expect(fromQrPay(QR_PAY)).toEqual({
      figures: {
        recipientGetsMinor: 25_000_000,
        recipientUsdMinor: 980,
        feeUsdMinor: 20,
        totalUsdMinor: 1_000,
        localPerUsd: 1 / 0.0000392,
        currency: 'VND',
      },
      challenge: CHALLENGE,
    });
  });

  it('reads amount_local as a major-unit decimal', () => {
    expect(fromQrPay({ ...QR_PAY, amount_local: 25.5 }).figures.recipientGetsMinor).toBe(2_550);
  });

  it('turns its rate the right way up, and leaves a missing one missing', () => {
    expect(fromQrPay({ ...QR_PAY, rate: 0.04 }).figures.localPerUsd).toBe(25);
    expect(fromQrPay({ ...QR_PAY, rate: 0 }).figures.localPerUsd).toBe(0);
  });

  it('takes the fee as the backend itemised it', () => {
    expect(fromQrPay({ ...QR_PAY, fee: { total_fee: 0.35 } }).figures.feeUsdMinor).toBe(35);
  });

  it('names no currency when the answer names none', () => {
    expect(fromQrPay({ ...QR_PAY, currency: '' }).figures).not.toHaveProperty('currency');
  });
});
