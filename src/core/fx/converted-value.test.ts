import { convertedValue } from './converted-value';
import type { FxQuote } from './fx-rate';

const HOLDING = { valueMinor: 513_698, currency: 'USD' };
const USD_NGN: FxQuote = { baseCurrency: 'USD', quoteCurrency: 'NGN', rate: 0.74 };

describe('convertedValue', () => {
  it('shows no chip when the display currency is the holding’s own', () => {
    expect(
      convertedValue({
        holding: HOLDING,
        displayCurrency: 'USD',
        quote: undefined,
        isQuotePending: false,
        locale: 'en',
      }),
    ).toBeUndefined();
  });

  it('converts the holding into the display currency, rounded down', () => {
    expect(
      convertedValue({
        holding: HOLDING,
        displayCurrency: 'NGN',
        quote: USD_NGN,
        isQuotePending: false,
        locale: 'en',
      }),
    ).toEqual({ kind: 'converted', currency: 'NGN', label: '₦3,801.36' });
  });

  it('holds the chip’s place while the rate loads', () => {
    expect(
      convertedValue({
        holding: HOLDING,
        displayCurrency: 'NGN',
        quote: undefined,
        isQuotePending: true,
        locale: 'en',
      }),
    ).toEqual({ kind: 'pending' });
  });

  it('shows no chip once the rate has failed to arrive', () => {
    expect(
      convertedValue({
        holding: HOLDING,
        displayCurrency: 'NGN',
        quote: undefined,
        isQuotePending: false,
        locale: 'en',
      }),
    ).toBeUndefined();
  });

  it('ignores a quote for a different pair', () => {
    expect(
      convertedValue({
        holding: HOLDING,
        displayCurrency: 'KES',
        quote: USD_NGN,
        isQuotePending: false,
        locale: 'en',
      }),
    ).toBeUndefined();
  });
});
