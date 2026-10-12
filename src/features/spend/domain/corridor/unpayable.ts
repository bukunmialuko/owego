import type { TranslationKey } from '@/core/i18n/translation-key';
import type { RecipientFields } from '../entity/beneficiary';
import { PaymentMethodCode, fieldsFor } from '../entity/beneficiary-form';
import { RailCode, type CorridorSpec, type DetailRow } from './corridor-spec';
import { addressLine, recipientRecord, row, valueOf } from './recipient-record';

function unbuildable(): never {
  throw new TypeError('This payout rail is not available on the current backend.');
}

const noSummary: CorridorSpec['summarise'] = (values) => ({
  displayName: values['accountHolder'] ?? '',
  subtitle: values['accountNumber'] ?? '',
});

const categoryField = {
  name: 'category',
  labelKey: 'spend.beneficiaryCategory',
  kind: 'select',
  required: true,
  optionsFrom: 'beneficiaryCategories',
} as const;

const HOLDER_FIELDS = ['accountHolder', 'accountNumber'];

const swiftHolder = fieldsFor(PaymentMethodCode.Swift).filter((field) =>
  HOLDER_FIELDS.includes(field.name),
);
const swiftBankDetails = fieldsFor(PaymentMethodCode.Swift).filter(
  (field) => !HOLDER_FIELDS.includes(field.name),
);

const achBankDetails = swiftBankDetails.filter((field) => field.name !== 'swiftCode');

const ACCOUNT_TYPE_LABELS: Readonly<Record<string, TranslationKey>> = {
  checking: 'spend.accountTypeChecking',
  savings: 'spend.accountTypeSavings',
};

function achRows(fields: RecipientFields): readonly DetailRow[] {
  const accountTypeKey = ACCOUNT_TYPE_LABELS[fields.accountType];

  return [
    ...row('common.bankName', fields.bankName),
    ...row('common.accountNumber', fields.accountNumber),
    ...(accountTypeKey === undefined
      ? row('spend.accountType', fields.accountType)
      : [{ labelKey: 'spend.accountType', valueKey: accountTypeKey } as const]),
    ...row('spend.routingNumber', fields.bankCode),
    ...row('spend.beneficiaries.address', addressLine(fields.contact)),
  ];
}

export const usdAch: CorridorSpec = {
  currency: 'USD',
  method: PaymentMethodCode.Ach,
  rail: RailCode.ZelleTransfer,
  endpoint: '/transaction/wallet-to-bank',
  entry: 'form',
  payable: false,
  requiresNarration: true,
  steps: [{ fields: [categoryField, ...fieldsFor(PaymentMethodCode.Ach)] }],
  summarise: noSummary,
  toBody: unbuildable,

  beneficiary: {
    saveable: true,
    paymentMethod: 'ACH',
    steps: [
      { fields: fieldsFor(PaymentMethodCode.Ach) },
      { titleKey: 'spend.bankDetails', fields: achBankDetails },
    ],

    toRecipient: (values, { countryCode }) =>
      recipientRecord({
        bankCountry: countryCode,
        bankName: valueOf(values, 'bankName'),
        bankCode: valueOf(values, 'routingNumber'),
        accountHolder: valueOf(values, 'accountHolder'),
        accountNumber: valueOf(values, 'accountNumber'),
        accountType: valueOf(values, 'accountType'),
        paymentMethod: 'ACH',
        contact: {
          country: valueOf(values, 'country'),
          state: valueOf(values, 'state'),
          city: valueOf(values, 'city'),
          address: valueOf(values, 'streetAddress'),
          zipCode: valueOf(values, 'postalCode'),
        },
      }),

    fromRecipient: (fields) => ({
      accountHolder: fields.accountHolder,
      routingNumber: fields.bankCode,
      accountNumber: fields.accountNumber,
      accountType: fields.accountType,
      bankName: fields.bankName,
      streetAddress: fields.contact.address,
      country: fields.contact.country,
      city: fields.contact.city,
      state: fields.contact.state,
      postalCode: fields.contact.zipCode,
    }),

    details: achRows,
  },
};

export const usdSwift: CorridorSpec = {
  currency: 'USD',
  method: PaymentMethodCode.Swift,
  rail: RailCode.ZelleTransfer,
  endpoint: '/transaction/wallet-to-bank',
  entry: 'form',
  payable: false,
  requiresNarration: true,
  steps: [
    { fields: [categoryField, ...swiftHolder] },
    { titleKey: 'spend.bankDetails', fields: swiftBankDetails },
  ],
  summarise: noSummary,
  toBody: unbuildable,

  beneficiary: {
    saveable: true,
    paymentMethod: 'SWIFT',
    steps: [{ fields: swiftHolder }, { titleKey: 'spend.bankDetails', fields: swiftBankDetails }],

    toRecipient: (values) =>
      recipientRecord({
        bankCountry: valueOf(values, 'country'),
        bankName: valueOf(values, 'bankName'),
        accountHolder: valueOf(values, 'accountHolder'),
        swiftNumber: valueOf(values, 'swiftCode'),
        accountNumber: valueOf(values, 'accountNumber'),
        paymentMethod: 'SWIFT',
        contact: {
          country: valueOf(values, 'country'),
          state: valueOf(values, 'state'),
          city: valueOf(values, 'city'),
          address: valueOf(values, 'streetAddress'),
          zipCode: valueOf(values, 'postalCode'),
        },
      }),

    fromRecipient: (fields) => ({
      accountHolder: fields.accountHolder,
      accountNumber: fields.accountNumber,
      bankName: fields.bankName,
      swiftCode: fields.swiftNumber,
      streetAddress: fields.contact.address,
      country: fields.contact.country === '' ? fields.bankCountry : fields.contact.country,
      city: fields.contact.city,
      state: fields.contact.state,
      postalCode: fields.contact.zipCode,
    }),

    details: (fields) => [
      ...row('common.bankName', fields.bankName),
      ...row('common.accountNumber', fields.accountNumber),
      ...row('spend.swiftCode', fields.swiftNumber),
      ...row('spend.beneficiaries.address', addressLine(fields.contact)),
    ],
  },
};
