import { validateTransferAmount } from './validate-transfer-amount-usecase';

const BALANCE = 513_698;

describe('validateTransferAmount', () => {
  it('accepts an amount inside the balance', () => {
    expect(validateTransferAmount(5_000, BALANCE)).toEqual({ valid: true });
  });

  it('accepts spending the balance exactly, which is what Max does', () => {
    expect(validateTransferAmount(513_698, BALANCE)).toEqual({ valid: true });
  });

  it('rejects a cent more than the balance, naming the balance', () => {
    expect(validateTransferAmount(513_699, BALANCE)).toEqual({
      valid: false,
      problem: { messageKey: 'spend.insufficientBalance', values: { balance: 5136.98 } },
    });
  });

  describe('rejects a non-amount', () => {
    it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])('%p', (value) => {
      expect(validateTransferAmount(value, BALANCE)).toEqual({
        valid: false,
        problem: { messageKey: 'spend.amountRequired', values: {} },
      });
    });
  });

  it('refuses when the balance is unknown rather than treating it as no limit', () => {
    expect(validateTransferAmount(100, undefined).valid).toBe(false);
  });
});
