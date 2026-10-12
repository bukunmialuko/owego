import type { TranslationKey } from '@/core/i18n/translation-key';
import type { LimitRule, PayoutEndpoint, RailCode, FieldValues } from '../corridor/corridor-spec';
import type { PaymentMethodCode } from './beneficiary-form';

export type PayoutOrigin = 'transfer' | 'scan';

export type PayoutRecipient = {
  displayName: string;
  subtitle: string;
  unnamedKey?: TranslationKey;
  currency: string;
  method: PaymentMethodCode;
  rail: RailCode;
  endpoint: PayoutEndpoint;
  requiresNarration: boolean;
  limits: readonly LimitRule[];
  countryCode: string;
  values: FieldValues;
  labels: FieldValues;
};
