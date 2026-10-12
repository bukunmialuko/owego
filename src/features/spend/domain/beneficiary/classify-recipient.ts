import { CHAIN_METADATA } from '@/core/reference-data/chain-metadata';
import { RailCode } from '../corridor/corridor-spec';
import type { RecipientFields } from '../entity/beneficiary';

export type RecipientRail = 'bank' | 'crypto' | 'unknown';

const BANK_PAYMENT_METHODS = new Set<string>([
  RailCode.BankTransfer,
  RailCode.MobileMoney,
  RailCode.KesMobileMoney,
  RailCode.ZelleTransfer,
]);

const CRYPTO_PAYMENT_METHODS = new Set<string>();

const MIN_CRYPTO_ADDRESS_LENGTH = 26;

const ALPHANUMERIC = /^[A-Za-z0-9]+$/;

export function networkCodeOf(raw: string): string | undefined {
  const wanted = raw.trim().toLowerCase();
  return Object.entries(CHAIN_METADATA).find(
    ([code, chain]) => code.toLowerCase() === wanted || chain.name.toLowerCase() === wanted,
  )?.[0];
}

export function classifyRecipient(fields: RecipientFields): RecipientRail {
  const method = fields.paymentMethod.trim().toLowerCase();
  if (BANK_PAYMENT_METHODS.has(method)) return 'bank';
  if (CRYPTO_PAYMENT_METHODS.has(method)) return 'crypto';

  if (fields.bankCountry.trim() !== '') return 'bank';

  if (networkCodeOf(fields.bankName) !== undefined) return 'crypto';

  const looksLikeAddress =
    fields.bankCode === '' &&
    fields.swiftNumber === '' &&
    fields.accountNumber.length >= MIN_CRYPTO_ADDRESS_LENGTH &&
    ALPHANUMERIC.test(fields.accountNumber);

  return looksLikeAddress ? 'crypto' : 'unknown';
}

export function surfaceAccepts(surface: 'bank' | 'crypto', rail: RecipientRail): boolean {
  switch (surface) {
    case 'bank':
      return rail === 'bank' || rail === 'unknown';
    case 'crypto':
      return rail === 'crypto';
  }
}
