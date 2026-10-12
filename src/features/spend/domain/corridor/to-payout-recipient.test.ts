import type { CurrencyDto } from '@/core/reference-data/reference-data';
import { ngnBankTransfer } from './ngn-bank-transfer';
import { qrCorridor } from './qr';
import { corridorFor } from './registry';
import { toPayoutRecipient } from './to-payout-recipient';

const NAIRA: CurrencyDto = {
  name: 'Nigerian Naira',
  code: 'NGN',
  country_code: 'NG',
  continent: 'Africa',
  symbol: '₦',
  payment_method: 'bank',
  min_amount: 50,
  max_amount: 2_000_000,
  coming_soon: false,
};

const DONG: CurrencyDto = { ...NAIRA, name: 'Vietnamese Dong', code: 'VND', country_code: 'VN' };

const labelOf = (name: string) => (name === 'bankCode' ? 'Guaranty Trust Bank' : name);

describe('toPayoutRecipient', () => {
  it('collapses a completed Nigerian form into the shape the rest of the flow takes', () => {
    const recipient = toPayoutRecipient(
      ngnBankTransfer,
      { bankCode: '058', accountNumber: '0123578038', accountName: 'Precious Jameson' },
      NAIRA,
      labelOf,
    );

    expect(recipient).toEqual({
      displayName: 'Precious Jameson',
      subtitle: 'Guaranty Trust Bank • 0123578038',
      currency: 'NGN',
      method: 'bank_transfer',
      rail: 'bank_transfer',
      endpoint: '/transaction/wallet-to-bank',
      requiresNarration: true,
      limits: [],
      countryCode: 'NG',
      values: { bankCode: '058', accountNumber: '0123578038', accountName: 'Precious Jameson' },
      labels: { bankCode: 'Guaranty Trust Bank' },
    });
  });

  it('names only the choices, so saving the payee later can write the bank beside its code', () => {
    const recipient = toPayoutRecipient(
      ngnBankTransfer,
      { bankCode: '058', accountNumber: '0123578038', accountName: 'Precious Jameson' },
      NAIRA,
      labelOf,
    );

    expect(recipient.labels).toEqual({ bankCode: 'Guaranty Trust Bank' });
  });

  it('carries a scanned payload through untouched', () => {
    const qrString = '00020101021126390014tz.go.bot.tips6304AB3A';
    const recipient = toPayoutRecipient(
      qrCorridor('VND'),
      { merchantName: 'EXAMPLE MERCHANT LTD', qrString },
      DONG,
      labelOf,
    );

    expect(recipient.values['qrString']).toBe(qrString);
    expect(recipient).toMatchObject({
      displayName: 'EXAMPLE MERCHANT LTD',
      subtitle: 'VND',
      currency: 'VND',
      endpoint: '/transaction/qr-pay',
      countryCode: 'VN',
      requiresNarration: false,
    });
  });

  it("names a merchant whose code names nobody with the corridor's own fallback", () => {
    const recipient = toPayoutRecipient(qrCorridor('VND'), { qrString: 'RAW' }, DONG, labelOf);

    expect(recipient.displayName).toBe('');
    expect(recipient.unnamedKey).toBe('spend.merchant.unnamed');
  });

  it('gives a payee whose form always names them no fallback', () => {
    const recipient = toPayoutRecipient(ngnBankTransfer, {}, NAIRA, labelOf);

    expect(recipient).not.toHaveProperty('unnamedKey');
  });

  it.each([
    ['a Nigerian account', ngnBankTransfer, NAIRA],
    ['a scanned merchant', qrCorridor('VND'), DONG],
  ])('leads back to the corridor that made it, for %s', (_case, corridor, currency) => {
    const recipient = toPayoutRecipient(corridor, {}, currency, labelOf);

    expect(corridorFor(recipient.currency, recipient.method)).toBe(
      corridorFor(corridor.currency, corridor.method),
    );
    expect(corridorFor(recipient.currency, recipient.method)?.endpoint).toBe(corridor.endpoint);
  });

  it('takes the destination country from the currency rather than from the form', () => {
    expect(toPayoutRecipient(qrCorridor('VND'), {}, DONG, labelOf).countryCode).toBe('VN');
  });

  it('answers empty limits when a corridor declares none, so the amount screen can read them', () => {
    expect(toPayoutRecipient(ngnBankTransfer, {}, NAIRA, labelOf).limits).toEqual([]);
  });
});
