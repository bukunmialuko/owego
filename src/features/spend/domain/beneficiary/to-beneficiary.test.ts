import { BLANK_RECIPIENT_FIELDS, type RecipientFields } from '../entity/beneficiary';
import { PaymentMethodCode } from '../entity/beneficiary-form';
import { buildMerchantCode } from '@/test/qr-payloads';
import { toBeneficiary } from './to-beneficiary';

const SOLANA_ADDRESS = 'Bxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx3';

function record(fields: Partial<RecipientFields>) {
  return {
    id: 'r1',
    fields: { ...BLANK_RECIPIENT_FIELDS, ...fields },
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-02-01T00:00:00Z',
  };
}

describe('toBeneficiary', () => {
  it('reads a wallet record as a wallet, named by its tag, on its catalog network', () => {
    expect(
      toBeneficiary(
        record({ accountHolder: 'Main wallet', accountNumber: SOLANA_ADDRESS, bankName: 'sol' }),
      ),
    ).toMatchObject({
      kind: 'wallet',
      id: 'r1',
      tag: 'Main wallet',
      address: SOLANA_ADDRESS,
      networkCode: 'SOL',
      networkName: 'Solana',
    });
  });

  it('keeps a network the catalog does not know under the name it was saved with', () => {
    expect(
      toBeneficiary(record({ accountNumber: SOLANA_ADDRESS, bankName: 'Tron' })),
    ).toMatchObject({ kind: 'wallet', networkCode: 'Tron', networkName: 'Tron' });
  });

  it('reads a bank record with its corridor, its country and its institution', () => {
    expect(
      toBeneficiary(
        record({
          bankCountry: 'ng',
          bankName: 'Guaranty Trust Bank',
          bankCode: '058',
          accountHolder: 'Hannah Nuggest',
          accountNumber: '0123456789',
        }),
      ),
    ).toMatchObject({
      kind: 'bank',
      name: 'Hannah Nuggest',
      institution: 'Guaranty Trust Bank',
      reference: '0123456789',
      countryCode: 'ng',
      corridor: { currency: 'NGN', method: PaymentMethodCode.BankTransfer },
    });
  });

  it('falls back to the address country for the flag when the bank country is missing', () => {
    const beneficiary = toBeneficiary(
      record({
        paymentMethod: 'SWIFT',
        contact: { ...BLANK_RECIPIENT_FIELDS.contact, country: 'gb' },
      }),
    );

    expect(beneficiary.kind === 'bank' ? beneficiary.countryCode : undefined).toBe('gb');
  });

  it('lists a bank record it cannot place, without a corridor', () => {
    const beneficiary = toBeneficiary(record({ bankCountry: 'gb', bankName: 'Barclays' }));

    expect(beneficiary.kind).toBe('bank');
    expect(beneficiary.kind === 'bank' ? beneficiary.corridor : 'n/a').toBeUndefined();
  });

  it('reads a record it cannot classify as a bank record, so it stays reachable', () => {
    const beneficiary = toBeneficiary(record({ accountHolder: 'Someone', accountNumber: '123' }));

    expect(beneficiary.kind).toBe('bank');
    expect(beneficiary.kind === 'bank' ? beneficiary.countryCode : 'n/a').toBeUndefined();
  });

  it('keeps the whole record, for the details screen and a later payment', () => {
    const fields = { ...BLANK_RECIPIENT_FIELDS, bankCountry: 'ng', accountNumber: '0123456789' };

    expect(toBeneficiary(record(fields)).fields).toEqual(fields);
  });
});

describe('a saved QR code', () => {
  const STICKER = buildMerchantCode({ merchantName: 'PHO 24' });

  it('reads as a merchant, named by its code, paying its code', () => {
    const beneficiary = toBeneficiary({
      ...record({ accountHolder: 'PHO 24', bankCountry: 'vn' }),
      merchantCode: STICKER,
    });

    expect(beneficiary).toMatchObject({
      kind: 'merchant',
      id: 'r1',
      qrString: STICKER,
      merchantName: 'PHO 24',
      currency: 'VND',
      countryCode: 'vn',
    });
  });

  it('takes the merchant’s name from the code, not from the record', () => {
    const beneficiary = toBeneficiary({
      ...record({ accountHolder: 'SOMETHING ELSE' }),
      merchantCode: STICKER,
    });

    expect(beneficiary).toMatchObject({ kind: 'merchant', merchantName: 'PHO 24' });
  });
});
