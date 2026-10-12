import type { FieldValues } from '../corridor/corridor-spec';
import { corridorFor } from '../corridor/registry';
import type { Beneficiary } from '../entity/beneficiary';
import type { PaymentMethodCode } from '../entity/beneficiary-form';
import { merchantCodeIn } from '../scan/merchant-code';
import { findSavedMerchant } from './find-saved-copy';

type Payee = { currency: string; method: PaymentMethodCode; values: FieldValues };

export type SaveOffer = { kind: 'none' } | { kind: 'switch' };

export function offerReadsSavedList(recipient: Payee): boolean {
  return corridorFor(recipient.currency, recipient.method)?.entry === 'scan';
}

export function saveOfferFor(
  recipient: Payee,
  saved: readonly Beneficiary[] | undefined,
): SaveOffer {
  const corridor = corridorFor(recipient.currency, recipient.method);
  if (corridor === undefined) return { kind: 'none' };
  if (corridor.entry === 'form') return { kind: 'switch' };

  const code = merchantCodeIn(recipient.values['qrString'] ?? '');
  if (code === undefined || code.isOneTime) return { kind: 'none' };
  if (saved !== undefined && findSavedMerchant(code.raw, saved) !== undefined) {
    return { kind: 'none' };
  }

  return { kind: 'switch' };
}
