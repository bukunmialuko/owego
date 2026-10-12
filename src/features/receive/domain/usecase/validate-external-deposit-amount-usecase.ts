type DepositAmountProblem = 'empty' | 'exceedsBalance';

export type DepositAmountValidation =
  { valid: true } | { valid: false; problem: DepositAmountProblem };

export function validateExternalDepositAmount(
  amountMinor: number,
  balanceMinor: number | undefined,
): DepositAmountValidation {
  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
    return { valid: false, problem: 'empty' };
  }
  if (balanceMinor !== undefined && amountMinor > balanceMinor) {
    return { valid: false, problem: 'exceedsBalance' };
  }
  return { valid: true };
}
