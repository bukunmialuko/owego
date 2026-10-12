import { checkYieldAmount } from './check-yield-amount-usecase';

describe('checkYieldAmount', () => {
  it.each([
    [0, 1_000, 'empty'],
    [1_001, 1_000, 'exceedsCeiling'],
    [1_000, 1_000, 'ok'],
    [500, 1_000, 'ok'],
    [500, undefined, 'unknownCeiling'],
    [0, undefined, 'empty'],
  ] as const)('reads %p against a ceiling of %p as %p', (amountMinor, ceilingMinor, expected) => {
    expect(checkYieldAmount({ amountMinor, ceilingMinor })).toBe(expected);
  });
});
