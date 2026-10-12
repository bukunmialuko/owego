import { baseUnitsToMinor, toTokenBaseUnits } from './deposit-amount';

describe('toTokenBaseUnits', () => {
  it('turns $12.34 into 12,340,000 units of a six-decimal token', () => {
    expect(toTokenBaseUnits(1234, 6)).toBe(12_340_000n);
  });

  it('turns one cent into ten thousand units', () => {
    expect(toTokenBaseUnits(1, 6)).toBe(10_000n);
  });

  it('stays exact where the base units pass the largest safe number', () => {
    expect(toTokenBaseUnits(9_007_199_254_740, 6)).toBe(90_071_992_547_400_000n);
  });

  it('keeps cents as they are for a two-decimal token', () => {
    expect(toTokenBaseUnits(1234, 2)).toBe(1234n);
  });

  it.each([
    ['zero', 0],
    ['a negative amount', -100],
    ['a fraction of a cent', 12.5],
    ['NaN', Number.NaN],
    ['an unsafe integer', Number.MAX_SAFE_INTEGER + 1],
  ])('refuses %s', (_, amountMinor) => {
    expect(toTokenBaseUnits(amountMinor, 6)).toBeUndefined();
  });

  it('refuses a token with fewer decimals than a cent, which could not hold the amount', () => {
    expect(toTokenBaseUnits(1234, 1)).toBeUndefined();
  });
});

describe('baseUnitsToMinor', () => {
  it('floors to the cent below, never rounding a balance up', () => {
    expect(baseUnitsToMinor(12_349_999n, 6)).toBe(1234);
  });

  it('reads an empty account as zero', () => {
    expect(baseUnitsToMinor(0n, 6)).toBe(0);
  });

  it('refuses a balance too large to hold as a number of cents', () => {
    expect(baseUnitsToMinor(10n ** 30n, 6)).toBeUndefined();
  });

  it('refuses a token with fewer decimals than a cent', () => {
    expect(baseUnitsToMinor(5n, 1)).toBeUndefined();
  });
});
