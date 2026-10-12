import { BLANK_RECIPIENT_FIELDS, type RecipientFields } from '../entity/beneficiary';
import { PaymentMethodCode } from '../entity/beneficiary-form';
import type { FieldValues } from '../corridor/corridor-spec';
import { corridorFor } from '../corridor/registry';
import { recipientFor } from '../corridor/recipient-corridor';
import { buildMerchantCode, KHQR_PAYLOAD } from '@/test/qr-payloads';
import { toMerchantBeneficiary } from './merchant-beneficiary';
import { payAgainDestination } from './pay-again';
import { toBeneficiary } from './to-beneficiary';

const labelOf = (name: string) => (name === 'bankCode' ? 'Guaranty Trust Bank' : '');

function saved(fields: RecipientFields) {
  return toBeneficiary({ id: 'b1', fields, createdAt: '2026-09-01', updatedAt: '2026-09-01' });
}

function savedThrough(currency: string, method: PaymentMethodCode, values: FieldValues) {
  const corridor = corridorFor(currency, method);
  if (corridor === undefined) throw new Error(`no corridor ${currency}:${method}`);

  return saved(recipientFor(corridor, values, labelOf));
}

function savedMerchant(qrString: string) {
  return toMerchantBeneficiary({
    id: 'm1',
    qrString,
    createdAt: '2026-09-01',
    updatedAt: '2026-09-01',
  });
}

describe('payAgainDestination', () => {
  it('sends a saved merchant to the merchant amount page with its code and nothing else', () => {
    const qrString = buildMerchantCode({ merchantName: 'PHO 24' });

    expect(payAgainDestination(savedMerchant(qrString))).toEqual({ kind: 'merchantPay', qrString });
  });

  it('sends a saved merchant whose code owego can no longer pay to their details', () => {
    expect(payAgainDestination(savedMerchant(KHQR_PAYLOAD))).toEqual({ kind: 'details' });
  });

  it('never offers to pay a one-time code again', () => {
    const oneTime = buildMerchantCode({ amount: '100000', initiation: '12' });

    expect(payAgainDestination(savedMerchant(oneTime))).toEqual({ kind: 'details' });
  });

  it('sends a saved wallet to Send, filled in with its address and network', () => {
    const wallet = savedThrough('USDC', PaymentMethodCode.Crypto, {
      walletTag: 'Main wallet',
      network: 'SOL',
      walletAddress: 'Bxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx3',
    });

    expect(payAgainDestination(wallet)).toEqual({
      kind: 'walletSend',
      prefill: { address: 'Bxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx3', networkCode: 'SOL' },
    });
  });

  it('sends a saved Nigerian account to the transfer form without the name it was saved under', () => {
    const account = savedThrough('NGN', PaymentMethodCode.BankTransfer, {
      bankCode: '058',
      accountNumber: '0123456789',
      accountName: 'Hannah Nuggest',
    });

    expect(payAgainDestination(account)).toEqual({
      kind: 'bankTransfer',
      prefill: {
        currency: 'NGN',
        method: PaymentMethodCode.BankTransfer,
        values: { bankCode: '058', accountNumber: '0123456789' },
      },
    });
  });

  it.each<[string, string, PaymentMethodCode, FieldValues]>([
    [
      'M-Pesa',
      'KES',
      PaymentMethodCode.MobileMoney,
      { provider: 'mpesa', beneficiaryName: 'Maya Chen', phoneNumber: '+254712344417' },
    ],
    [
      'Wave',
      'XOF',
      PaymentMethodCode.MobileMoney,
      { provider: 'wave', beneficiaryName: 'Awa Diallo', phoneNumber: '+2250712345678' },
    ],
    [
      'Zelle',
      'USD',
      PaymentMethodCode.Zelle,
      { category: 'individual', beneficiaryName: 'Precious Jameson', zelleId: 'p@mail.com' },
    ],
  ])('sends a saved %s payee to the transfer form', (_name, currency, method, values) => {
    expect(payAgainDestination(savedThrough(currency, method, values))).toEqual({
      kind: 'bankTransfer',
      prefill: { currency, method, values },
    });
  });

  it.each<[string, RecipientFields]>([
    [
      'ACH',
      {
        ...BLANK_RECIPIENT_FIELDS,
        bankCountry: 'us',
        bankName: 'Chase',
        bankCode: '021000021',
        accountHolder: 'Precious Jameson',
        accountNumber: '0123456789',
        paymentMethod: 'ACH',
        accountType: 'checking',
      },
    ],
    [
      'SWIFT',
      {
        ...BLANK_RECIPIENT_FIELDS,
        bankCountry: 'gb',
        bankName: 'Citi bank',
        accountHolder: 'Hannah Nuggest',
        swiftNumber: 'CITIGB2L',
        accountNumber: '031234567890',
        paymentMethod: 'SWIFT',
      },
    ],
    [
      'an unrecognised record',
      {
        ...BLANK_RECIPIENT_FIELDS,
        bankCountry: 'ph',
        bankName: 'BDO Unibank',
        accountHolder: 'Precious Jameson',
        accountNumber: '004870011028',
      },
    ],
  ])('shows the details of %s, which no form can pay', (_name, fields) => {
    expect(payAgainDestination(saved(fields))).toEqual({ kind: 'details' });
  });
});
