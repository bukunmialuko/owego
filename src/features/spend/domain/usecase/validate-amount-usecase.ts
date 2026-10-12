import type { CurrencyDto } from '@/core/reference-data/reference-data';
import type { TranslationKey } from '@/core/i18n/translation-key';

type AmountProblem = {
  messageKey: TranslationKey;
  values: Record<string, number>;
};

export type AmountValidation = { valid: true } | { valid: false; problem: AmountProblem };

const VALID: AmountValidation = { valid: true };

export function validateAmount(amount: number, currency: CurrencyDto): AmountValidation {
  if (!Number.isFinite(amount) || amount <= 0) {
    return {
      valid: false,
      problem: {
        messageKey: 'spend.amountBelowMinimum',
        values: { minimum: currency.min_amount ?? 0 },
      },
    };
  }

  if (currency.min_amount !== null && amount < currency.min_amount) {
    return {
      valid: false,
      problem: { messageKey: 'spend.amountBelowMinimum', values: { minimum: currency.min_amount } },
    };
  }

  if (currency.max_amount !== null && amount > currency.max_amount) {
    return {
      valid: false,
      problem: { messageKey: 'spend.amountAboveMaximum', values: { maximum: currency.max_amount } },
    };
  }

  return VALID;
}
