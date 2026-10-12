import { convert, convertDown, identityQuote, invert } from './convert';
import type { FxQuote } from './fx-rate';

const USD_GBP: FxQuote = { baseCurrency: 'USD', quoteCurrency: 'GBP', rate: 0.74 };

describe('convert', () => {
  it('applies the rate in minor units', () => {
    expect(convert(1500, USD_GBP)).toBe(1110);
  });

  it('rounds once, at the end', () => {
    expect(convert(513_698, USD_GBP)).toBe(380_137);
  });

  it('treats a non-amount as nothing rather than propagating NaN into a payment', () => {
    expect(convert(Number.NaN, USD_GBP)).toBe(0);
    expect(convert(Number.POSITIVE_INFINITY, USD_GBP)).toBe(0);
  });

  it('leaves an amount alone at an identity rate', () => {
    expect(convert(513_698, identityQuote('USD'))).toBe(513_698);
  });
});

describe('invert', () => {
  it('reads the same rate the other way', () => {
    const inverted = invert(USD_GBP);

    expect(inverted.baseCurrency).toBe('GBP');
    expect(inverted.quoteCurrency).toBe('USD');
    expect(inverted.rate).toBeCloseTo(1 / 0.74, 10);
  });

  it('carries the expiry across, so a swap cannot launder a stale rate into a fresh one', () => {
    const expiring = { ...USD_GBP, expiresAt: '2026-08-20T17:00:00.000Z' };

    expect(invert(expiring).expiresAt).toBe('2026-08-20T17:00:00.000Z');
  });

  it('omits the expiry rather than carrying an undefined one', () => {
    expect(invert(USD_GBP)).not.toHaveProperty('expiresAt');
  });

  it('round-trips to within one minor unit, which is the best rounding allows', () => {
    const there = convert(513_698, USD_GBP);
    const back = convert(there, invert(USD_GBP));

    expect(Math.abs(back - 513_698)).toBeLessThanOrEqual(1);
  });

  it('is exact both ways at an identity rate, where nothing is lost', () => {
    const identity = identityQuote('USD');

    expect(convert(convert(513_698, identity), invert(identity))).toBe(513_698);
  });
});

describe('convertDown', () => {
  it('rounds a converted holding down rather than to the nearest', () => {
    expect(convertDown(513_698, USD_GBP)).toBe(380_136);
  });

  it('rounds down to the smallest unit the currency has', () => {
    const usdVnd: FxQuote = { baseCurrency: 'USD', quoteCurrency: 'VND', rate: 25_000.5 };

    expect(convertDown(1234, usdVnd)).toBe(30_850_600);
  });

  it('absorbs float error before rounding down', () => {
    const usdNgn: FxQuote = { baseCurrency: 'USD', quoteCurrency: 'NGN', rate: 1.1 };

    expect(convertDown(1000, usdNgn)).toBe(1100);
    expect(convertDown(3, usdNgn)).toBe(3);
  });

  it('declines a currency the app cannot format', () => {
    expect(convertDown(1500, { ...USD_GBP, quoteCurrency: 'ZZZ' })).toBeUndefined();
  });
});
