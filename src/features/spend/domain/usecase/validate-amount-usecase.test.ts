import {
  currencyFixture,
  findCurrency,
  type CurrencyDto,
} from '@/core/reference-data/reference-data';
import { validateAmount } from './validate-amount-usecase';

function currency(code: string): CurrencyDto {
  const all = currencyFixture.read();
  if (!all.ok) throw new Error('currency fixture failed to parse');

  const found = findCurrency(all.value, code);
  if (found === undefined) throw new Error(`${code} missing from the fixture`);

  return found;
}

describe('validateAmount', () => {
  it('accepts an amount inside the bounds', () => {
    expect(validateAmount(1000, currency('NGN'))).toEqual({ valid: true });
  });

  it('accepts the exact minimum and maximum', () => {
    expect(validateAmount(50, currency('NGN')).valid).toBe(true);
    expect(validateAmount(2_000_000, currency('NGN')).valid).toBe(true);
  });

  it('rejects an amount below the currency minimum', () => {
    const result = validateAmount(50, currency('USD'));

    expect(result).toEqual({
      valid: false,
      problem: { messageKey: 'spend.amountBelowMinimum', values: { minimum: 1000 } },
    });
  });

  it('rejects an amount above the currency maximum', () => {
    const result = validateAmount(5000, currency('USD'));

    expect(result.valid).toBe(false);
    if (result.valid) return;
    expect(result.problem.messageKey).toBe('spend.amountAboveMaximum');
  });

  describe('per-currency bounds', () => {
    it('accepts a fraction for BRL', () => {
      expect(validateAmount(0.6, currency('BRL')).valid).toBe(true);
      expect(validateAmount(0.5, currency('BRL')).valid).toBe(false);
    });

    it('accepts millions for VND', () => {
      expect(validateAmount(9_000_000, currency('VND')).valid).toBe(true);
      expect(validateAmount(9_500_001, currency('VND')).valid).toBe(false);
    });

    it('rejects an amount that would be fine in another currency', () => {
      expect(validateAmount(500, currency('NGN')).valid).toBe(true);
      expect(validateAmount(500, currency('USD')).valid).toBe(false);
    });
  });

  describe('rejects a non-amount', () => {
    it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])('%p', (value) => {
      expect(validateAmount(value, currency('NGN')).valid).toBe(false);
    });
  });

  it('treats a null bound as no limit', () => {
    const unbounded: CurrencyDto = { ...currency('USD'), min_amount: null, max_amount: null };

    expect(validateAmount(0.01, unbounded).valid).toBe(true);
    expect(validateAmount(10_000_000, unbounded).valid).toBe(true);
  });
});
