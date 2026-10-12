import { BLANK_RECIPIENT_FIELDS } from '../../domain/entity/beneficiary';
import { PaymentMethodCode } from '../../domain/entity/beneficiary-form';
import { corridorFor } from '../../domain/corridor/registry';
import { recipientFor } from '../../domain/corridor/recipient-corridor';
import type { FieldValues } from '../../domain/corridor/corridor-spec';
import { recipientResponseSchema } from '../model/recipient-model';
import { buildMerchantCode } from '@/test/qr-payloads';
import {
  toCreateQrRecipientBody,
  toCreateRecipientBody,
  toRecipientRecord,
} from './recipient-mapper';

const dto = (data: unknown) => recipientResponseSchema.parse({ data }).data;

describe('toRecipientRecord', () => {
  it('carries the id and both timestamps', () => {
    expect(
      toRecipientRecord(dto({ id: 'r1', created_at: '2026-01-01', updated_at: '2026-02-01' })),
    ).toMatchObject({ id: 'r1', createdAt: '2026-01-01', updatedAt: '2026-02-01' });
  });

  it('renames every bank field', () => {
    const { fields } = toRecipientRecord(
      dto({
        bank_account_information: {
          bank_name: 'Access Bank',
          bank_code: '044',
          account_holder: 'John Doe',
          swift_number: 'ABNGNGLA',
          account_number: '0123456789',
          payment_method: 'bank_transfer',
        },
      }),
    );

    expect(fields).toMatchObject({
      bankName: 'Access Bank',
      bankCode: '044',
      accountHolder: 'John Doe',
      swiftNumber: 'ABNGNGLA',
      accountNumber: '0123456789',
      paymentMethod: 'bank_transfer',
    });
  });

  it('renames every contact field', () => {
    const { fields } = toRecipientRecord(
      dto({
        contact_information: {
          state: 'Lagos',
          city: 'Lekki',
          address: '1 Example Street',
          zip_code: '100001',
          email: 'johndoe@gmail.com',
        },
      }),
    );

    expect(fields.contact).toMatchObject({
      state: 'Lagos',
      city: 'Lekki',
      address: '1 Example Street',
      zipCode: '100001',
      email: 'johndoe@gmail.com',
    });
  });

  it('reads both countries in the casing the app keys on', () => {
    const { fields } = toRecipientRecord(
      dto({
        bank_account_information: { bank_country: 'NG' },
        contact_information: { contact_country: ' GB ' },
      }),
    );

    expect(fields.bankCountry).toBe('ng');
    expect(fields.contact.country).toBe('gb');
  });
});

describe('the account type', () => {
  it('reads in the casing the form keys on', () => {
    const { fields } = toRecipientRecord(
      dto({ bank_account_information: { account_type: 'CHECKING' } }),
    );

    expect(fields.accountType).toBe('checking');
  });

  it('is sent in capitals, as the reference spells it', () => {
    expect(
      toCreateRecipientBody({ ...BLANK_RECIPIENT_FIELDS, accountType: 'savings' })
        .bank_account_information,
    ).toMatchObject({ account_type: 'SAVINGS' });
  });

  it('is never sent empty, so no other corridor starts sending one', () => {
    expect(
      toCreateRecipientBody(BLANK_RECIPIENT_FIELDS).bank_account_information,
    ).not.toHaveProperty('account_type');
  });
});

describe('toCreateRecipientBody', () => {
  const body = (currency: string, method: PaymentMethodCode, values: FieldValues) => {
    const corridor = corridorFor(currency, method);
    if (corridor === undefined) throw new Error(`no corridor ${currency}:${method}`);

    return toCreateRecipientBody(
      recipientFor(corridor, values, (name) => (name === 'bankCode' ? 'Guaranty Trust Bank' : '')),
    );
  };

  it('sends a Nigerian account as v1 did', () => {
    expect(
      body('NGN', PaymentMethodCode.BankTransfer, {
        bankCode: '058',
        accountNumber: '0123456789',
        accountName: 'Hannah Nuggest',
      }),
    ).toEqual({
      bank_account_information: {
        bank_country: 'NG',
        bank_name: 'Guaranty Trust Bank',
        bank_code: '058',
        account_holder: 'Hannah Nuggest',
        swift_number: '',
        account_number: '0123456789',
      },
      contact_information: {
        contact_country: '',
        state: '',
        city: '',
        address: '',
        zip_code: '',
        email: '',
      },
    });
  });

  it('sends a Kenyan mobile-money number with M-Pesa as its institution', () => {
    expect(
      body('KES', PaymentMethodCode.MobileMoney, {
        provider: 'mpesa',
        beneficiaryName: 'Wanjiru Kamau',
        phoneNumber: '+254712345678',
      }).bank_account_information,
    ).toEqual({
      bank_country: 'KE',
      bank_name: 'M-Pesa',
      bank_code: '',
      account_holder: 'Wanjiru Kamau',
      swift_number: '',
      account_number: '+254712345678',
    });
  });

  it('sends a West African mobile-money number with its provider', () => {
    expect(
      body('XOF', PaymentMethodCode.MobileMoney, {
        provider: 'wave',
        beneficiaryName: 'Awa Diallo',
        phoneNumber: '+2250712345678',
      }).bank_account_information,
    ).toEqual({
      bank_country: 'CI',
      bank_name: 'Wave',
      bank_code: '',
      account_holder: 'Awa Diallo',
      swift_number: '',
      account_number: '+2250712345678',
    });
  });

  it('sends a Zelle recipient with the category in the bank code, as staging spells it', () => {
    expect(
      body('USD', PaymentMethodCode.Zelle, {
        category: 'individual',
        beneficiaryName: 'Precious Jameson',
        zelleId: 'precious@mail.com',
      }).bank_account_information,
    ).toEqual({
      bank_country: 'US',
      bank_name: 'Zelle',
      bank_code: 'zelle_individual',
      account_holder: 'Precious Jameson',
      swift_number: '',
      account_number: 'precious@mail.com',
    });
  });

  it('sends SWIFT with its payment method and the address as the contact', () => {
    expect(
      body('USD', PaymentMethodCode.Swift, {
        accountHolder: 'Hannah Nuggest',
        accountNumber: '031234567890',
        bankName: 'Citi bank',
        swiftCode: 'CITIGB2L',
        streetAddress: '33 Canada Square',
        country: 'gb',
        city: 'London',
        state: '',
        postalCode: 'E14 5LB',
      }),
    ).toEqual({
      bank_account_information: {
        bank_country: 'GB',
        bank_name: 'Citi bank',
        bank_code: '',
        account_holder: 'Hannah Nuggest',
        swift_number: 'CITIGB2L',
        account_number: '031234567890',
        payment_method: 'SWIFT',
      },
      contact_information: {
        contact_country: 'GB',
        state: '',
        city: 'London',
        address: '33 Canada Square',
        zip_code: 'E14 5LB',
        email: '',
      },
    });
  });

  it('sends a wallet with no country and no payment method', () => {
    expect(
      body('USDC', PaymentMethodCode.Crypto, {
        walletTag: 'Main wallet',
        network: 'SOL',
        walletAddress: 'Bxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx3',
      }).bank_account_information,
    ).toEqual({
      bank_country: '',
      bank_name: 'SOL',
      bank_code: '',
      account_holder: 'Main wallet',
      swift_number: '',
      account_number: 'Bxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx3',
    });
  });

  it('never sends an empty payment method', () => {
    expect(
      toCreateRecipientBody(BLANK_RECIPIENT_FIELDS).bank_account_information,
    ).not.toHaveProperty('payment_method');
  });
});

describe('a QR code beneficiary', () => {
  const STICKER = buildMerchantCode({ merchantName: 'PHO 24' });

  it('reads the code the record keeps, character for character', () => {
    const record = toRecipientRecord(
      dto({
        id: 'q1',
        beneficiary_type: 'qr',
        meta_data: { qr_string: STICKER, qr_currency: 'VND', qr_is_business: true },
        bank_account_information: {
          account_holder: 'PHO 24',
          bank_country: 'VN',
          account_number: STICKER,
        },
      }),
    );

    expect(record).toMatchObject({ id: 'q1', merchantCode: STICKER });
  });

  it('reads the code from the account number when the meta data carries none', () => {
    const record = toRecipientRecord(
      dto({ beneficiary_type: 'qr', bank_account_information: { account_number: STICKER } }),
    );

    expect(record).toMatchObject({ merchantCode: STICKER });
  });

  it('reads no code from a record of another type, whatever its meta data holds', () => {
    const record = toRecipientRecord(
      dto({ beneficiary_type: 'bank', meta_data: { qr_string: STICKER } }),
    );

    expect(record).not.toHaveProperty('merchantCode');
  });

  it('reads no code from a QR record that carries none anywhere', () => {
    expect(toRecipientRecord(dto({ beneficiary_type: 'qr' }))).not.toHaveProperty('merchantCode');
    expect(
      toRecipientRecord(dto({ beneficiary_type: 'qr', meta_data: [1, 2, 3] })),
    ).not.toHaveProperty('merchantCode');
  });

  it('is sent as its type and its code, and nothing else', () => {
    expect(toCreateQrRecipientBody({ qrString: STICKER })).toEqual({
      beneficiary_type: 'qr',
      meta_data: { qr_string: STICKER },
    });
  });
});
