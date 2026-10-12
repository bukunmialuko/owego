import { flagFor, flagForCurrency, flagSvgFor } from './flag';

describe('flagFor', () => {
  it('builds a flag from a two-letter code', () => {
    expect(flagFor('GB')).toBe('🇬🇧');
    expect(flagFor('NG')).toBe('🇳🇬');
  });

  it('accepts the fixture casing', () => {
    expect(flagFor('gb')).toBe(flagFor('GB'));
  });

  it('returns nothing for an unusable code rather than a broken glyph', () => {
    expect(flagFor('')).toBe('');
    expect(flagFor('GBR')).toBe('');
    expect(flagFor('1A')).toBe('');
  });
});

describe('flagForCurrency', () => {
  it('derives the country from the currency code', () => {
    expect(flagForCurrency('GBP')).toBe('🇬🇧');
    expect(flagForCurrency('USD')).toBe('🇺🇸');
    expect(flagForCurrency('NGN')).toBe('🇳🇬');
  });

  it('maps the exceptions explicitly', () => {
    expect(flagForCurrency('XOF')).toBe(flagFor('CI'));
  });
});

describe('flagSvgFor', () => {
  it('returns artwork for a supported country', () => {
    expect(flagSvgFor('ke')).toContain('<svg');
  });

  it('accepts whatever casing the caller holds the code in', () => {
    expect(flagSvgFor('KE')).toBe(flagSvgFor('ke'));
  });

  it('covers far more than the payout fixture does', () => {
    const beyondTheFixture = ['jp', 'is', 'fj', 'bt', 'gl', 'mn'];

    expect(beyondTheFixture.every((code) => flagSvgFor(code) !== undefined)).toBe(true);
  });

  it('has nothing for a code that is not a country', () => {
    expect(flagSvgFor('zz')).toBeUndefined();
    expect(flagSvgFor('global')).toBeUndefined();
    expect(flagSvgFor('')).toBeUndefined();
  });
});
