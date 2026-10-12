import { BLANK_RECIPIENT_FIELDS, type RecipientFields } from '../entity/beneficiary';
import { PaymentMethodCode } from '../entity/beneficiary-form';
import { payoutPrefillFor, walletPrefillFor } from './prefill';
import { toBeneficiary } from './to-beneficiary';

const SOLANA_ADDRESS = 'Bxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx3';

function saved(fields: Partial<RecipientFields>) {
  return toBeneficiary({
    id: 'r1',
    fields: { ...BLANK_RECIPIENT_FIELDS, ...fields },
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  });
}

describe('payoutPrefillFor', () => {
  it('prefills a Nigerian account, leaving its holder to be resolved again', () => {
    expect(
      payoutPrefillFor(
        saved({
          bankCountry: 'ng',
          bankName: 'Guaranty Trust Bank',
          bankCode: '058',
          accountHolder: 'Hannah Nuggest',
          accountNumber: '0123456789',
        }),
      ),
    ).toEqual({
      currency: 'NGN',
      method: PaymentMethodCode.BankTransfer,
      values: { bankCode: '058', accountNumber: '0123456789' },
    });
  });

  it('prefills a Zelle recipient with its category', () => {
    expect(
      payoutPrefillFor(
        saved({
          bankCountry: 'us',
          bankName: 'Zelle',
          bankCode: 'business',
          accountHolder: 'Precious Jameson',
          accountNumber: 'precious@mail.com',
        }),
      ),
    ).toEqual({
      currency: 'USD',
      method: PaymentMethodCode.Zelle,
      values: {
        category: 'business',
        beneficiaryName: 'Precious Jameson',
        zelleId: 'precious@mail.com',
      },
    });
  });

  it('offers nothing for a beneficiary whose corridor no form can pay', () => {
    expect(
      payoutPrefillFor(saved({ paymentMethod: 'SWIFT', bankCountry: 'gb', accountNumber: '0312' })),
    ).toBeUndefined();
  });

  it('offers nothing for a record it could not place', () => {
    expect(payoutPrefillFor(saved({ bankCountry: 'gb', bankName: 'Barclays' }))).toBeUndefined();
  });

  it('offers nothing for a wallet, which the send form for banks cannot pay', () => {
    expect(
      payoutPrefillFor(saved({ bankName: 'SOL', accountNumber: SOLANA_ADDRESS })),
    ).toBeUndefined();
  });
});

describe('walletPrefillFor', () => {
  it('prefills a wallet with its address and its network', () => {
    expect(walletPrefillFor(saved({ bankName: 'solana', accountNumber: SOLANA_ADDRESS }))).toEqual({
      address: SOLANA_ADDRESS,
      networkCode: 'SOL',
    });
  });

  it('leaves the network to be chosen when the catalog does not know it', () => {
    expect(walletPrefillFor(saved({ bankName: 'Tron', accountNumber: SOLANA_ADDRESS }))).toEqual({
      address: SOLANA_ADDRESS,
    });
  });

  it('offers nothing for a bank beneficiary', () => {
    expect(
      walletPrefillFor(saved({ bankCountry: 'ng', accountNumber: '0123456789' })),
    ).toBeUndefined();
  });
});
