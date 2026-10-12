import type { CurrencyDto } from '@/core/reference-data/reference-data';
import { buildMerchantCode, PIX_DYNAMIC_PAYLOAD } from '@/test/qr-payloads';
import { resolveMerchantCode } from './resolve-merchant-code-usecase';

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
  currency({ code: 'VND', name: 'Vietnamese Dong', country_code: 'VN' }),
  currency({ code: 'THB', name: 'Thai Baht', country_code: 'TH', coming_soon: true }),
  currency({ code: 'BRL', name: 'Brazilian Real', country_code: 'BR' }),
  currency({ code: 'NGN', name: 'Nigerian Naira', country_code: 'NG', payment_method: 'bank' }),
];

describe('resolveMerchantCode', () => {
  it('fixes the amount a code carries, in the API minor units (₫100,000 → 10,000,000)', () => {
    const raw = buildMerchantCode({ amount: '100000' });

    expect(resolveMerchantCode(raw, CATALOG)).toMatchObject({
      kind: 'merchant',
      amountMinor: 10_000_000,
      qrString: raw,
      recipient: { currency: 'VND', endpoint: '/transaction/qr-pay', values: { qrString: raw } },
    });
  });

  it('leaves the amount open when the code carries none', () => {
    expect(resolveMerchantCode(buildMerchantCode(), CATALOG)).toMatchObject({
      kind: 'merchant',
      amountMinor: undefined,
    });
  });

  it.each([
    ['a bank account number', '0123456789'],
    ['a phone number', '+2250701234567'],
    ['a wallet address', '0x52908400098527886E0F7030069857D2E4169EE7'],
    ['nothing at all', ''],
  ])('refuses %s handed to it as a merchant code', (_, raw) => {
    expect(resolveMerchantCode(raw, CATALOG)).toEqual({
      kind: 'unsupported',
      reason: 'unknownCode',
    });
  });

  it('passes a refusal through with its reason and the currency it names', () => {
    const raw = buildMerchantCode({ currencyNumeric: '764', country: 'TH' });

    expect(resolveMerchantCode(raw, CATALOG)).toEqual({
      kind: 'unsupported',
      reason: 'comingSoon',
      currencyName: 'Thai Baht',
    });
  });

  it('refuses a code whose amount it cannot see', () => {
    expect(resolveMerchantCode(PIX_DYNAMIC_PAYLOAD, CATALOG)).toEqual({
      kind: 'unsupported',
      reason: 'remoteAmount',
    });
  });
});
