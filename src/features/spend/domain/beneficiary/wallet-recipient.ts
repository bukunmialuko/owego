import type { TransferRecipient } from '../entity/asset-transfer';
import type { Beneficiary } from '../entity/beneficiary';
import { PaymentMethodCode } from '../entity/beneficiary-form';
import { cryptoWallet } from '../corridor/crypto';
import { recipientFor } from '../corridor/recipient-corridor';
import type { PaidRecipient } from '../usecase/save-paid-recipient-usecase';
import { findSavedCopy } from './find-saved-copy';

export function walletRecipientFor(paid: TransferRecipient, walletTag: string): PaidRecipient {
  return {
    currency: cryptoWallet.currency,
    method: PaymentMethodCode.Crypto,
    values: { walletTag: walletTag.trim(), network: paid.networkCode, walletAddress: paid.address },
    labels: {},
  };
}

export function savedWalletFor(
  paid: TransferRecipient,
  existing: readonly Beneficiary[],
): Beneficiary | undefined {
  const fields = recipientFor(cryptoWallet, walletRecipientFor(paid, '').values, () => '');

  return findSavedCopy(fields, existing);
}
