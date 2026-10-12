import { PaymentMethodCode, fieldsFor } from '../entity/beneficiary-form';
import type { TranslationKey } from '@/core/i18n/translation-key';
import {
  RailCode,
  SERVER_SAVES_NO_PAYEE,
  type CorridorSpec,
  type DetailRow,
} from './corridor-spec';
import { recipientRecord, row, valueOf } from './recipient-record';

const INDIVIDUAL_MAX = 2000;
const BUSINESS_MAX = 4000;

const ZELLE = 'Zelle';

const CATEGORY_LABELS: Readonly<Record<string, TranslationKey>> = {
  individual: 'spend.categoryIndividual',
  business: 'spend.categoryBusiness',
};

const CATEGORY_CODES: Readonly<Record<string, string>> = {
  individual: 'zelle_individual',
  business: 'zelle_business',
};

export function zelleCategoryOf(bankCode: string): string | undefined {
  const code = bankCode.trim().toLowerCase();

  return Object.keys(CATEGORY_CODES).find(
    (category) => category === code || CATEGORY_CODES[category] === code,
  );
}

function categoryRow(code: string): DetailRow[] {
  const labelKey = CATEGORY_LABELS[zelleCategoryOf(code) ?? ''];
  if (labelKey !== undefined)
    return [{ labelKey: 'spend.beneficiaryCategory', valueKey: labelKey }];

  return row('spend.beneficiaryCategory', code);
}

const categoryField = {
  name: 'category',
  labelKey: 'spend.beneficiaryCategory',
  kind: 'select',
  required: true,
  optionsFrom: 'beneficiaryCategories',
} as const;

export const usdZelle: CorridorSpec = {
  currency: 'USD',
  method: PaymentMethodCode.Zelle,
  rail: RailCode.ZelleTransfer,
  endpoint: '/transaction/wallet-to-bank',
  entry: 'form',
  payable: true,
  requiresNarration: true,
  steps: [{ fields: [categoryField, ...fieldsFor(PaymentMethodCode.Zelle)] }],

  limits: [
    { when: { field: 'category', equals: 'individual' }, maxAmount: INDIVIDUAL_MAX },
    { when: { field: 'category', equals: 'business' }, maxAmount: BUSINESS_MAX },
  ],

  summarise: (values, labelOf) => ({
    displayName: values['beneficiaryName'] ?? '',
    subtitle: `${labelOf('category')} • ${values['zelleId'] ?? ''}`,
  }),

  toBody: (values, common) => {
    const zelleId = values['zelleId'] ?? '';
    const isEmail = zelleId.includes('@');

    return {
      wallet_id: common.walletId,
      wallet_address: common.walletAddress,
      amount: common.amountMinor,
      currency: common.currency,
      token_id: common.tokenId,
      zelle_recipient_type: values['category'] ?? '',
      zelle_recipient_name: values['beneficiaryName'] ?? '',
      ...(isEmail ? { zelle_recipient_email: zelleId } : { zelle_recipient_phone: zelleId }),
      narration: common.narration,
      ...SERVER_SAVES_NO_PAYEE,
    };
  },

  beneficiary: {
    saveable: true,
    steps: [{ fields: [categoryField, ...fieldsFor(PaymentMethodCode.Zelle)] }],

    claims: (fields) =>
      fields.bankName.trim().toLowerCase() === ZELLE.toLowerCase() ||
      zelleCategoryOf(fields.bankCode) !== undefined,

    toRecipient: (values, { countryCode }) =>
      recipientRecord({
        bankCountry: countryCode,
        bankName: ZELLE,
        bankCode: CATEGORY_CODES[valueOf(values, 'category')] ?? '',
        accountHolder: valueOf(values, 'beneficiaryName'),
        accountNumber: valueOf(values, 'zelleId'),
      }),

    fromRecipient: (fields) => ({
      category: zelleCategoryOf(fields.bankCode) ?? '',
      beneficiaryName: fields.accountHolder,
      zelleId: fields.accountNumber,
    }),

    details: (fields) => [
      ...categoryRow(fields.bankCode),
      ...row('spend.zelleId', fields.accountNumber),
    ],
  },
};
