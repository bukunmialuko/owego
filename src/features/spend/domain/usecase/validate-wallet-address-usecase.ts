import type { TranslationKey } from '@/core/i18n/translation-key';

export type AddressValidation = { valid: true } | { valid: false; messageKey: TranslationKey };

const VALID: AddressValidation = { valid: true };

const SOLANA = /^[1-9A-HJ-NP-Za-km-z]{43,44}$/;
const EVM = /^0x[0-9a-fA-F]{40}$/;

const FORMAT: Record<string, RegExp> = {
  SOL: SOLANA,
  BASE: EVM,
  MONAD: EVM,
  ARC: EVM,
};

export function validateWalletAddress(address: string, networkCode: string): AddressValidation {
  const trimmed = address.trim();

  if (trimmed === '') return { valid: false, messageKey: 'spend.addressRequired' };

  const format = FORMAT[networkCode];
  if (format === undefined) return VALID;

  return format.test(trimmed) ? VALID : { valid: false, messageKey: 'spend.addressWrongNetwork' };
}
