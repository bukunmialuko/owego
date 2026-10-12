import type { TranslationKey } from '@/core/i18n/translation-key';
import type { RecipientFields } from '../entity/beneficiary';
import type { FieldDescriptor, PaymentMethodCode } from '../entity/beneficiary-form';

export const RailCode = {
  BankTransfer: 'bank_transfer',
  MobileMoney: 'mobile_money',
  KesMobileMoney: 'kes_mobile_money',
  ZelleTransfer: 'zelle_transfer',
  Wallet: 'wallet',
} as const;

export type RailCode = (typeof RailCode)[keyof typeof RailCode];

export type PayoutEndpoint =
  '/transaction/wallet-to-bank' | '/transaction/qr-pay' | '/transaction/challenge-id';

export type FieldStep = {
  titleKey?: TranslationKey;
  fields: readonly FieldDescriptor[];
};

export type VerificationSpec = {
  dependsOn: readonly string[];
  resolves: string;
  call: 'resolveAccount';
};

export type LimitRule = {
  when?: { field: string; equals: string };
  maxAmount: number;
};

export type FieldValues = Readonly<Record<string, string>>;

export const SERVER_SAVES_NO_PAYEE = { save_beneficiary: false } as const;

export type PaymentCommon = {
  walletId: string;
  walletAddress: string;
  amountMinor: number;
  currency: string;
  tokenId: string;
  narration: string;
  countryCode: string;
};

export type DetailRow =
  | { labelKey: TranslationKey; value: string }
  | { labelKey: TranslationKey; valueKey: TranslationKey };

type FieldProblem = { field: string; messageKey: TranslationKey };

type RecipientContext = {
  countryCode: string;
  labelOf: (name: string) => string;
};

export type BeneficiarySpec = {
  saveable: boolean;
  steps: readonly FieldStep[];
  paymentMethod?: string;
  claims?: (fields: RecipientFields) => boolean;
  toRecipient: (values: FieldValues, context: RecipientContext) => RecipientFields;
  fromRecipient: (fields: RecipientFields) => FieldValues;
  details: (fields: RecipientFields) => readonly DetailRow[];
  validate?: (values: FieldValues) => FieldProblem | undefined;
};

export type CorridorSpec = {
  currency: string;
  method: PaymentMethodCode;
  rail: RailCode;
  endpoint: PayoutEndpoint;
  entry: 'form' | 'scan';
  payable: boolean;
  requiresNarration: boolean;
  steps: readonly FieldStep[];
  verification?: VerificationSpec;
  limits?: readonly LimitRule[];
  summarise: (
    values: FieldValues,
    labelOf: (name: string) => string,
  ) => {
    displayName: string;
    subtitle: string;
  };
  unnamedKey?: TranslationKey;
  toBody: (values: FieldValues, common: PaymentCommon) => Record<string, unknown>;
  beneficiary?: BeneficiarySpec;
};

export function maxAmountFor(
  limits: readonly LimitRule[] | undefined,
  values: FieldValues,
): number | undefined {
  const applicable = (limits ?? []).filter(
    (limit) => limit.when === undefined || values[limit.when.field] === limit.when.equals,
  );

  if (applicable.length === 0) return undefined;

  return Math.min(...applicable.map((limit) => limit.maxAmount));
}
