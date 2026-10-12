import { identityQuote } from './convert';
import type { FxQuote } from './fx-rate';
import { priceTwoWay } from './two-way-amount';

const USD_NGN: FxQuote = { baseCurrency: 'USD', quoteCurrency: 'NGN', rate: 1_500 };

describe('priceTwoWay', () => {
  it("prices dollars typed against the quote in the quote's currency", () => {
    expect(priceTwoWay({ currency: 'USD', minor: 1_000 }, USD_NGN)).toEqual({
      quoteMinor: 1_500_000,
      counterpart: { currency: 'NGN', minor: 1_500_000 },
    });
  });

  it('takes an amount typed in the quote currency as it stands, and prices the dollars back', () => {
    expect(priceTwoWay({ currency: 'NGN', minor: 1_500_000 }, USD_NGN)).toEqual({
      quoteMinor: 1_500_000,
      counterpart: { currency: 'USD', minor: 1_000 },
    });
  });

  it('leaves both sides equal at an identity quote', () => {
    expect(priceTwoWay({ currency: 'USD', minor: 1_234 }, identityQuote('USD'))).toEqual({
      quoteMinor: 1_234,
      counterpart: { currency: 'USD', minor: 1_234 },
    });
  });

  it('refuses a currency the quote does not name, which is a caller bug', () => {
    expect(() => priceTwoWay({ currency: 'KES', minor: 100 }, USD_NGN)).toThrow(TypeError);
  });
});
