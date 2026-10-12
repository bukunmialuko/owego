import type { TranslationKey } from '@/core/i18n/translation-key';

export const PaymentMethodCode = {
  BankTransfer: 'bank_transfer',
  Ach: 'ach',
  Swift: 'swift',
  Zelle: 'zelle',
  MobileMoney: 'mobile_money',
  Crypto: 'crypto',
} as const;

export type PaymentMethodCode = (typeof PaymentMethodCode)[keyof typeof PaymentMethodCode];

/** @public */
export type BeneficiaryCategory = 'individual' | 'business';

export const METHOD_LABEL: Record<PaymentMethodCode, TranslationKey> = {
  [PaymentMethodCode.BankTransfer]: 'spend.methodBankTransfer',
  [PaymentMethodCode.Ach]: 'spend.methodAch',
  [PaymentMethodCode.Swift]: 'spend.methodSwift',
  [PaymentMethodCode.Zelle]: 'spend.methodZelle',
  [PaymentMethodCode.MobileMoney]: 'spend.methodMobileMoney',
  [PaymentMethodCode.Crypto]: 'spend.methodCrypto',
};

export type FieldOption =
  { value: string; labelKey: TranslationKey } | { value: string; label: string };

export function optionLabel(
  option: FieldOption,
  translate: (key: TranslationKey) => string,
): string {
  return 'labelKey' in option ? translate(option.labelKey) : option.label;
}

export type FieldOptionSource =
  'bankList' | 'mobileMoneyProviders' | 'countries' | 'networks' | 'beneficiaryCategories';

export type FieldDescriptor = {
  name: string;
  labelKey: TranslationKey;
  placeholderKey?: TranslationKey;
  kind: 'text' | 'number' | 'email' | 'phone' | 'select';
  required: boolean;
  options?: readonly FieldOption[];
  optionsFrom?: FieldOptionSource;
  pattern?: { regex: string; messageKey: TranslationKey };
  derived?: boolean;
  width?: 'full' | 'half';
  capitalize?: 'none' | 'characters';
};

const PHONE_PATTERN = '^\\+?\\d{7,15}$';

const accountHolder: FieldDescriptor = {
  name: 'accountHolder',
  labelKey: 'spend.accountHolder',
  kind: 'text',
  required: true,
};

const accountType: FieldDescriptor = {
  name: 'accountType',
  labelKey: 'spend.accountType',
  kind: 'select',
  required: true,
  options: [
    { value: 'checking', labelKey: 'spend.accountTypeChecking' },
    { value: 'savings', labelKey: 'spend.accountTypeSavings' },
  ],
};

const FORMS: Record<PaymentMethodCode, readonly FieldDescriptor[]> = {
  [PaymentMethodCode.BankTransfer]: [
    {
      name: 'bankCode',
      labelKey: 'common.bankName',
      kind: 'select',
      required: true,
      optionsFrom: 'bankList',
    },
    {
      name: 'accountNumber',
      labelKey: 'common.accountNumber',
      kind: 'number',
      required: true,
      pattern: { regex: '^\\d{10}$', messageKey: 'spend.accountNumberLength' },
    },
    {
      name: 'accountName',
      labelKey: 'common.accountName',
      kind: 'text',
      required: true,
      derived: true,
    },
  ],

  [PaymentMethodCode.Ach]: [
    accountHolder,
    {
      name: 'routingNumber',
      labelKey: 'spend.routingNumber',
      kind: 'number',
      required: true,
      pattern: { regex: '^\\d{9}$', messageKey: 'spend.routingNumberInvalid' },
    },
    { name: 'accountNumber', labelKey: 'common.accountNumber', kind: 'number', required: true },
    accountType,
  ],

  [PaymentMethodCode.Swift]: [
    accountHolder,
    { name: 'accountNumber', labelKey: 'common.accountNumber', kind: 'text', required: true },
    { name: 'bankName', labelKey: 'common.bankName', kind: 'text', required: true },
    {
      name: 'swiftCode',
      labelKey: 'spend.swiftCode',
      kind: 'text',
      required: true,
      capitalize: 'characters',
      pattern: {
        regex: '^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$',
        messageKey: 'spend.swiftCodeInvalid',
      },
    },
    { name: 'streetAddress', labelKey: 'spend.streetAddress', kind: 'text', required: true },
    {
      name: 'country',
      labelKey: 'common.country',
      kind: 'select',
      required: true,
      optionsFrom: 'countries',
    },
    { name: 'city', labelKey: 'spend.city', kind: 'text', required: true, width: 'half' },
    { name: 'state', labelKey: 'spend.state', kind: 'text', required: false, width: 'half' },
    { name: 'postalCode', labelKey: 'spend.postalCode', kind: 'text', required: true },
  ],

  [PaymentMethodCode.Zelle]: [
    { name: 'beneficiaryName', labelKey: 'common.name', kind: 'text', required: true },
    {
      name: 'zelleId',
      labelKey: 'spend.zelleId',
      kind: 'email',
      required: true,
      pattern: {
        regex: '^(?:[^\\s@]+@[^\\s@]+\\.[^\\s@]+|\\+?\\d{7,15})$',
        messageKey: 'spend.zelleIdInvalid',
      },
    },
  ],

  [PaymentMethodCode.MobileMoney]: [
    {
      name: 'provider',
      labelKey: 'spend.mobileMoneyProvider',
      kind: 'select',
      required: true,
      optionsFrom: 'mobileMoneyProviders',
    },
    { name: 'beneficiaryName', labelKey: 'spend.recipientName', kind: 'text', required: true },
    {
      name: 'phoneNumber',
      labelKey: 'spend.phoneNumber',
      kind: 'phone',
      required: true,
      pattern: { regex: PHONE_PATTERN, messageKey: 'spend.phoneNumberInvalid' },
    },
  ],

  [PaymentMethodCode.Crypto]: [
    {
      name: 'network',
      labelKey: 'spend.network',
      kind: 'select',
      required: true,
      optionsFrom: 'networks',
    },
    {
      name: 'walletAddress',
      labelKey: 'spend.walletAddress',
      kind: 'text',
      required: true,
      capitalize: 'none',
    },
  ],
};

export function fieldsFor(method: PaymentMethodCode): readonly FieldDescriptor[] {
  return FORMS[method];
}

export function withOptions(
  fields: readonly FieldDescriptor[],
  name: string,
  options: readonly FieldOption[],
): readonly FieldDescriptor[] {
  return fields.map((field) => {
    if (field.name !== name) return field;

    const { optionsFrom: _resolved, ...rest } = field;

    return { ...rest, options };
  });
}
