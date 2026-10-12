import type { AmountValidation } from './validate-amount-usecase';

const VALID: AmountValidation = { valid: true };

const MINOR_SCALE = 100;

export function validateTransferAmount(
  amountMinor: number,
  balanceMinor: number | undefined,
): AmountValidation {
  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
    return { valid: false, problem: { messageKey: 'spend.amountRequired', values: {} } };
  }

  if (balanceMinor === undefined || amountMinor > balanceMinor) {
    return {
      valid: false,
      problem: {
        messageKey: 'spend.insufficientBalance',
        values: { balance: (balanceMinor ?? 0) / MINOR_SCALE },
      },
    };
  }

  return VALID;
}
