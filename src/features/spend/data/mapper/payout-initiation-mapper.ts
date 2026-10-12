import type { PayoutInitiation } from '../../domain/entity/payout-quote';
import type { TransferChallenge } from '../../domain/entity/transfer-challenge';
import type { QrPayDto } from '../model/qr-pay-model';
import type { WalletToBankDto } from '../model/wallet-to-bank-model';

const API_MINOR_SCALE = 100;

function toMinor(decimal: number): number {
  return Math.round(decimal * API_MINOR_SCALE);
}

function toChallenge(dto: {
  challenge_id: string;
  user_token: string;
  encryption_key: string;
}): TransferChallenge {
  return {
    challengeId: dto.challenge_id,
    userToken: dto.user_token,
    encryptionKey: dto.encryption_key,
  };
}

export function fromWalletToBank(dto: WalletToBankDto): PayoutInitiation {
  const totalUsdMinor = toMinor(dto.amount_usdc);
  const recipientUsdMinor =
    dto.base_amount_usdc > 0 ? toMinor(dto.base_amount_usdc) : totalUsdMinor;

  return {
    figures: {
      recipientGetsMinor: Math.round(dto.amount_fiat),
      recipientUsdMinor,
      feeUsdMinor: totalUsdMinor - recipientUsdMinor,
      totalUsdMinor,
      localPerUsd: dto.rate,
    },
    challenge: toChallenge(dto),
  };
}

export function fromQrPay(dto: QrPayDto): PayoutInitiation {
  return {
    figures: {
      recipientGetsMinor: toMinor(dto.amount_local),
      recipientUsdMinor: toMinor(dto.base_amount_usdc),
      feeUsdMinor: toMinor(dto.fee.total_fee),
      totalUsdMinor: toMinor(dto.amount_usdc),
      localPerUsd: dto.rate > 0 ? 1 / dto.rate : 0,
      ...(dto.currency === '' ? {} : { currency: dto.currency }),
    },
    challenge: toChallenge(dto),
  };
}
