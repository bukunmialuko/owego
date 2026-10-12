import { millisecondsUntilExpiry } from './expiry';
import type { FxQuote } from './fx-rate';

const NOW = Date.parse('2026-08-20T17:00:00.000Z');

const quoteExpiring = (offsetMs: number): FxQuote => ({
  baseCurrency: 'USD',
  quoteCurrency: 'GBP',
  rate: 0.74,
  expiresAt: new Date(NOW + offsetMs).toISOString(),
});

describe('millisecondsUntilExpiry', () => {
  it('counts down to a future expiry', () => {
    expect(millisecondsUntilExpiry(quoteExpiring(60_000), NOW)).toBe(60_000);
  });

  describe('has no answer for a quote whose expiry cannot schedule a refresh', () => {
    it.each([
      ['already past its expiry', quoteExpiring(-60_000)],
      ['expiring this very instant', quoteExpiring(0)],
      ['with no expiry', { baseCurrency: 'USD', quoteCurrency: 'USD', rate: 1 }],
      ['with an unparseable expiry', { ...quoteExpiring(0), expiresAt: 'whenever' }],
      ['that has not arrived', undefined],
      ['that does not exist', null],
    ])('%s', (_case, quote: FxQuote | null | undefined) => {
      expect(millisecondsUntilExpiry(quote, NOW)).toBeUndefined();
    });
  });
});
