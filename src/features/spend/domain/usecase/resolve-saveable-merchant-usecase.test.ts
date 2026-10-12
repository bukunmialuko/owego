import type { CurrencyDto } from '@/core/reference-data/reference-data';
import { buildMerchantCode, PIX_DYNAMIC_PAYLOAD } from '@/test/qr-payloads';
import { resolveSaveableMerchant } from './resolve-saveable-merchant-usecase';

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
  currency({ code: 'PHP', name: 'Philippine Peso', country_code: 'PH' }),
  currency({ code: 'BRL', name: 'Brazilian Real', country_code: 'BR' }),
];

describe('resolveSaveableMerchant', () => {
  it('takes a reusable sticker in the currency being saved', () => {
    const raw = buildMerchantCode();

    expect(resolveSaveableMerchant(raw, CATALOG)).toMatchObject({
      kind: 'merchant',
      qrString: raw,
      amountMinor: undefined,
    });
  });

  it('takes a reusable code that names its own amount', () => {
    const raw = buildMerchantCode({ amount: '45000', initiation: '11' });

    expect(resolveSaveableMerchant(raw, CATALOG)).toMatchObject({
      kind: 'merchant',
      amountMinor: 4_500_000,
    });
  });

  it('refuses a code generated for a single payment', () => {
    const raw = buildMerchantCode({ amount: '45000', initiation: '12' });

    expect(resolveSaveableMerchant(raw, CATALOG)).toEqual({
      kind: 'unsupported',
      reason: 'oneTimeCode',
    });
  });

  it('takes a reusable code in whatever currency it is priced in', () => {
    const peso = buildMerchantCode({ currencyNumeric: '608', country: 'PH' });

    expect(resolveSaveableMerchant(peso, CATALOG)).toMatchObject({
      kind: 'merchant',
      recipient: { currency: 'PHP' },
    });
  });

  it('refuses a wallet address or a phone number', () => {
    expect(resolveSaveableMerchant('+2250701234567', CATALOG)).toEqual({
      kind: 'unsupported',
      reason: 'unknownCode',
    });
  });

  it('passes on why a merchant code cannot be paid at all', () => {
    expect(resolveSaveableMerchant(PIX_DYNAMIC_PAYLOAD, CATALOG)).toEqual({
      kind: 'unsupported',
      reason: 'remoteAmount',
    });
  });
});
