import type { CurrencyDto } from '@/core/reference-data/reference-data';
import {
  buildMerchantCode as merchantCode,
  KHQR_PAYLOAD,
  PIX_DYNAMIC_PAYLOAD,
  QRIS_PAYLOAD,
  TANQR_PAYLOAD,
  YACARE_NONSTANDARD_PAYLOAD,
} from '@/test/qr-payloads';
import { resolveCapturedAccount, resolveScanOutcome } from './resolve-scan-outcome-usecase';

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
  currency({ code: 'KHR', name: 'Cambodian Riel', country_code: 'KH' }),
  currency({ code: 'THB', name: 'Thai Baht', country_code: 'TH', coming_soon: true }),
  currency({ code: 'BRL', name: 'Brazilian Real', country_code: 'BR', coming_soon: true }),
  currency({
    code: 'NGN',
    name: 'Nigerian Naira',
    country_code: 'NG',
    payment_method: 'bank',
    symbol: '₦',
  }),
  currency({
    code: 'XOF',
    name: 'West African Franc',
    country_code: 'CI',
    payment_method: 'mobile_money',
  }),
  currency({
    code: 'KES',
    name: 'Kenyan Shilling',
    country_code: 'KE',
    payment_method: 'mobile_money',
  }),
];

describe('resolveScanOutcome', () => {
  it('refuses a code that carries text after its checksum', () => {
    expect(resolveScanOutcome(YACARE_NONSTANDARD_PAYLOAD)).toEqual({
      kind: 'unsupported',
      reason: 'malformedQr',
    });
  });

  it('pays an Indonesian QRIS sticker in rupiah, with the amount left to the payer', () => {
    expect(resolveScanOutcome(QRIS_PAYLOAD)).toMatchObject({
      kind: 'merchant',
      amountMinor: undefined,
      qrString: QRIS_PAYLOAD,
      recipient: {
        displayName: 'EXAMPLE MERCHANT COFFEE',
        currency: 'IDR',
        countryCode: 'ID',
        endpoint: '/transaction/qr-pay',
      },
    });
  });

  describe('a merchant code in a currency owego pays', () => {
    it('carries the amount, the currency, the destination and the payload through unchanged', () => {
      const raw = merchantCode({ currencyNumeric: '704', country: 'VN', amount: '100000' });
      const outcome = resolveScanOutcome(raw, CATALOG);

      expect(outcome).toMatchObject({
        kind: 'merchant',
        amountMinor: 10_000_000,
        qrString: raw,
        recipient: {
          displayName: 'EXAMPLE MERCHANT LTD',
          currency: 'VND',
          endpoint: '/transaction/qr-pay',
          rail: 'wallet',
          countryCode: 'VN',
          requiresNarration: false,
          values: { qrString: raw, merchantName: 'EXAMPLE MERCHANT LTD' },
        },
      });
    });

    it.each([
      ['a currency with decimals', '608', 'PH', '1.50', 150],
      ['a whole amount in a currency with decimals', '608', 'PH', '2', 200],
      ['a currency without decimals', '116', 'KH', '4000', 400_000],
      ['an amount at the top of the range', '704', 'VN', '9500000', 950_000_000],
    ])('reads %s', (_case, numeric, country, amount, amountMinor) => {
      expect(
        resolveScanOutcome(merchantCode({ currencyNumeric: numeric, country, amount }), CATALOG),
      ).toMatchObject({
        kind: 'merchant',
        amountMinor,
      });
    });

    describe('leaves the amount for the payer to type', () => {
      it.each([
        ['when the code carries none', '704', 'VN', undefined],
        ['when the code carries a zero', '704', 'VN', '0'],
        ['when the code carries a zero with decimals', '608', 'PH', '0.00'],
      ])('%s', (_case, numeric, country, amount) => {
        expect(
          resolveScanOutcome(merchantCode({ currencyNumeric: numeric, country, amount }), CATALOG),
        ).toMatchObject({ kind: 'merchant', amountMinor: undefined });
      });
    });

    it('takes the currency from the country when the code names no number for it', () => {
      const raw = merchantCode({ currencyNumeric: '', country: 'VN', amount: '100000' });

      expect(resolveScanOutcome(raw, CATALOG)).toMatchObject({
        kind: 'merchant',
        recipient: { currency: 'VND' },
      });
    });
  });

  describe('refuses an amount it cannot read exactly', () => {
    it.each([
      ['more decimals than the currency has', '608', 'PH', '1.505'],
      ['a decimal in a currency that has none', '704', 'VN', '100000.5'],
      ['scientific notation', '704', 'VN', '1e5'],
      ['a blank amount', '704', 'VN', ' '],
      ['a negative amount', '704', 'VN', '-100'],
      ['a thousands separator', '704', 'VN', '100,000'],
      ['a currency symbol', '704', 'VN', '₫100000'],
    ])('%s', (_case, numeric, country, amount) => {
      expect(
        resolveScanOutcome(merchantCode({ currencyNumeric: numeric, country, amount }), CATALOG),
      ).toEqual({
        kind: 'unsupported',
        reason: 'malformedQr',
      });
    });

    it('before deciding whether the currency is open', () => {
      expect(
        resolveScanOutcome(
          merchantCode({ currencyNumeric: '764', country: 'TH', amount: '23.725' }),
          CATALOG,
        ),
      ).toMatchObject({
        reason: 'malformedQr',
      });
    });
  });

  describe('declines what it cannot pay', () => {
    it('names the currency owego has announced but not opened', () => {
      expect(
        resolveScanOutcome(
          merchantCode({ currencyNumeric: '764', country: 'TH', amount: '100' }),
          CATALOG,
        ),
      ).toEqual({
        kind: 'unsupported',
        reason: 'comingSoon',
        currencyName: 'Thai Baht',
      });
    });

    it('declines a currency it does not offer at all', () => {
      expect(resolveScanOutcome(TANQR_PAYLOAD, CATALOG)).toEqual({
        kind: 'unsupported',
        reason: 'currencyNotOffered',
      });
    });

    it('declines a Cambodian code priced in dollars, because the number says so', () => {
      expect(resolveScanOutcome(KHQR_PAYLOAD, CATALOG)).toMatchObject({
        kind: 'unsupported',
        reason: 'currencyNotOffered',
      });
    });

    it('declines a card-scheme code with a reason of its own', () => {
      const cardOnly = merchantCode({
        currencyNumeric: '704',
        country: 'VN',
        guid: '4000000000000001',
        guidTag: '02',
      });

      expect(resolveScanOutcome(cardOnly, CATALOG)).toEqual({
        kind: 'unsupported',
        reason: 'cardSchemeQr',
      });
    });

    it('declines a code whose amount lives somewhere it cannot reach', () => {
      const brlIsOpen = CATALOG.map((entry) =>
        entry.code === 'BRL' ? { ...entry, coming_soon: false } : entry,
      );

      expect(resolveScanOutcome(PIX_DYNAMIC_PAYLOAD, brlIsOpen)).toEqual({
        kind: 'unsupported',
        reason: 'remoteAmount',
      });
    });

    it('declines a currency the catalog has dropped', () => {
      const withoutDong = CATALOG.filter((entry) => entry.code !== 'VND');

      expect(
        resolveScanOutcome(merchantCode({ currencyNumeric: '704', country: 'VN' }), withoutDong),
      ).toMatchObject({
        reason: 'currencyNotOffered',
      });
    });

    it('declines a currency the catalog offers but no merchant rail reaches', () => {
      expect(
        resolveScanOutcome(merchantCode({ currencyNumeric: '566', country: 'NG' }), CATALOG),
      ).toEqual({ kind: 'unsupported', reason: 'corridorUnavailable' });
    });
  });

  describe('half-filled forms', () => {
    it.each([
      ['an Ivorian number', '+2250701234567', 'XOF', 'phoneNumber'],
      ['a Kenyan number', 'tel:+254712345678', 'KES', 'phoneNumber'],
    ])('opens the recipient form for %s', (_case, raw, expected, field) => {
      const outcome = resolveScanOutcome(raw, CATALOG);

      expect(outcome).toMatchObject({ kind: 'prefillRecipient', currency: expected });
      expect(outcome).toMatchObject({
        values: { [field]: raw.replace(/^tel:/, '') },
      });
    });

    it('opens the recipient form for a ten-digit account number', () => {
      expect(resolveScanOutcome('0123456789', CATALOG)).toEqual({
        kind: 'prefillRecipient',
        currency: 'NGN',
        values: { accountNumber: '0123456789' },
      });
    });

    it('declines a phone number whose currency the catalog has dropped', () => {
      const withoutFranc = CATALOG.filter((entry) => entry.code !== 'XOF');

      expect(resolveScanOutcome('+2250701234567', withoutFranc)).toMatchObject({
        reason: 'corridorUnavailable',
      });
    });

    it('opens the send screen for a Solana address, on the network its alphabet names', () => {
      expect(
        resolveScanOutcome('solana:Cxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx4', CATALOG),
      ).toEqual({
        kind: 'prefillAddress',
        address: 'Cxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx4',
        networkCode: 'SOL',
      });
    });

    it('leaves the network unchosen for an address that cannot name one', () => {
      expect(
        resolveScanOutcome('0x1111111111111111111111111111111111111111', CATALOG),
      ).toMatchObject({ kind: 'prefillAddress', networkCode: undefined });
    });
  });

  describe('passes an unreadable scan straight through', () => {
    it.each([
      [
        'a chain owego cannot reach',
        'bitcoin:1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
        'unsupportedChain',
      ],
      ['a broken merchant code', '0002010102115802', 'malformedQr'],
      ['a sentence', 'thanks for your custom', 'unknownCode'],
      ['nothing at all', '', 'unknownCode'],
    ])('%s', (_case, raw, reason) => {
      expect(resolveScanOutcome(raw, CATALOG)).toEqual({ kind: 'unsupported', reason });
    });
  });
});

describe('Colombia', () => {
  const BRE_B = merchantCode({
    currencyNumeric: '170',
    country: 'CO',
    amount: '50000',
    guid: 'CO.COM.RBM.LLA',
    guidTag: '26',
    merchantName: 'TIENDA BOGOTA',
  });

  it('pays a Bre-B code from the shipped catalog', () => {
    expect(resolveScanOutcome(BRE_B)).toMatchObject({
      kind: 'merchant',
      amountMinor: 5_000_000,
      recipient: {
        displayName: 'TIENDA BOGOTA',
        currency: 'COP',
        countryCode: 'CO',
        endpoint: '/transaction/qr-pay',
      },
    });
  });

  it('carries the payload through for the backend to re-read', () => {
    const outcome = resolveScanOutcome(BRE_B);

    expect(outcome).toMatchObject({ recipient: { values: { qrString: BRE_B } } });
  });
});

describe('resolveCapturedAccount', () => {
  const CAPTURED = {
    accountNumber: '0123578038',
    bankCode: '058',
    bankName: 'Guaranty Trust Bank',
    accountName: 'Precious Jameson',
    isVerified: true,
  };

  it('builds the recipient the Nigerian payout takes', () => {
    expect(resolveCapturedAccount(CAPTURED, CATALOG)).toEqual({
      kind: 'account',
      isVerified: true,
      recipient: {
        displayName: 'Precious Jameson',
        subtitle: 'Guaranty Trust Bank • 0123578038',
        currency: 'NGN',
        method: 'bank_transfer',
        rail: 'bank_transfer',
        endpoint: '/transaction/wallet-to-bank',
        requiresNarration: true,
        limits: [],
        countryCode: 'NG',
        values: {
          bankCode: '058',
          accountNumber: '0123578038',
          accountName: 'Precious Jameson',
        },
        labels: { bankCode: 'Guaranty Trust Bank' },
      },
    });
  });

  it('keeps the bank name out of the values the payment is built from', () => {
    const { recipient } = resolveCapturedAccount(CAPTURED, CATALOG) as {
      recipient: { values: Record<string, string> };
    };

    expect(Object.values(recipient.values)).not.toContain('Guaranty Trust Bank');
  });

  it('reports an unverified account without refusing it', () => {
    expect(resolveCapturedAccount({ ...CAPTURED, isVerified: false }, CATALOG)).toMatchObject({
      kind: 'account',
      isVerified: false,
    });
  });

  it('declines when the naira is not in the catalog', () => {
    const withoutNaira = CATALOG.filter((entry) => entry.code !== 'NGN');

    expect(resolveCapturedAccount(CAPTURED, withoutNaira)).toMatchObject({
      kind: 'unsupported',
      reason: 'corridorUnavailable',
    });
  });
});
