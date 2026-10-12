import { validateExternalDepositAmount } from './validate-external-deposit-amount-usecase';

describe('validateExternalDepositAmount', () => {
  it('accepts an amount within the balance', () => {
    expect(validateExternalDepositAmount(1234, 5000)).toEqual({ valid: true });
  });

  it('accepts the whole balance', () => {
    expect(validateExternalDepositAmount(5000, 5000)).toEqual({ valid: true });
  });

  it.each([
    ['nothing typed', 0],
    ['a negative amount', -1],
    ['a fraction of a cent', 1.5],
  ])('refuses %s', (_, amountMinor) => {
    expect(validateExternalDepositAmount(amountMinor, 5000)).toEqual({
      valid: false,
      problem: 'empty',
    });
  });

  it('refuses more than the wallet holds', () => {
    expect(validateExternalDepositAmount(5001, 5000)).toEqual({
      valid: false,
      problem: 'exceedsBalance',
    });
  });

  it('does not block on a balance it could not read', () => {
    expect(validateExternalDepositAmount(1_000_000, undefined)).toEqual({ valid: true });
  });
});
