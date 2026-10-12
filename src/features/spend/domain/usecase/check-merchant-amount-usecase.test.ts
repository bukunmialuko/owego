import type { CurrencyDto } from '@/core/reference-data/reference-data';
import { checkMerchantAmount } from './check-merchant-amount-usecase';

const currency = (over: Partial<CurrencyDto> & { code: string }): CurrencyDto => ({
  name: over.code,
  country_code: 'ZZ',
  continent: 'Asia',
  symbol: '',
  payment_method: 'qr_scan',
  min_amount: null,
  max_amount: null,
  coming_soon: false,
  ...over,
});

const CATALOG: CurrencyDto[] = [
  currency({ code: 'VND', min_amount: 10_000, max_amount: 9_500_000 }),
  currency({ code: 'BRL', min_amount: 0.6, max_amount: 3_300 }),
  currency({ code: 'IDR' }),
];

describe('checkMerchantAmount', () => {
  it('takes an amount at or above the currency’s minimum, in API minor units', () => {
    expect(checkMerchantAmount(1_000_000, 'VND', CATALOG)).toEqual({ kind: 'payable' });
  });

  it('refuses an amount below the minimum, and says what the minimum is', () => {
    expect(checkMerchantAmount(999_999, 'VND', CATALOG)).toEqual({
      kind: 'belowMinimum',
      minimumMinor: 1_000_000,
    });
  });

  it('reads a fractional minimum exactly', () => {
    expect(checkMerchantAmount(59, 'BRL', CATALOG)).toEqual({
      kind: 'belowMinimum',
      minimumMinor: 60,
    });
    expect(checkMerchantAmount(60, 'BRL', CATALOG)).toEqual({ kind: 'payable' });
  });

  it('never refuses an amount for being too large', () => {
    expect(checkMerchantAmount(2_000_000_000, 'VND', CATALOG)).toEqual({ kind: 'payable' });
  });

  it('takes any amount in a currency that publishes no minimum', () => {
    expect(checkMerchantAmount(1, 'IDR', CATALOG)).toEqual({ kind: 'payable' });
  });

  it('takes any amount in a currency the catalogue does not list', () => {
    expect(checkMerchantAmount(1, 'ZZZ', CATALOG)).toEqual({ kind: 'payable' });
  });
});
