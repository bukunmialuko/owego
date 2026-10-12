import {
  PaymentMethodCode,
  fieldsFor,
  withOptions,
  type FieldOption,
} from '../entity/beneficiary-form';
import {
  RailCode,
  SERVER_SAVES_NO_PAYEE,
  type BeneficiarySpec,
  type CorridorSpec,
} from './corridor-spec';
import { recipientRecord, row, valueOf } from './recipient-record';

function mobileMoneyFields(providers: readonly FieldOption[]) {
  return withOptions(fieldsFor(PaymentMethodCode.MobileMoney), 'provider', providers);
}

const PROVIDER_NAMES: Readonly<Record<string, string>> = {
  wave: 'Wave',
  orange: 'Orange Money',
  mpesa: 'M-Pesa',
};

function providerOf(bankName: string, providers: readonly FieldOption[]): string {
  const wanted = bankName.trim().toLowerCase();
  const match = providers.find(
    (provider) => PROVIDER_NAMES[provider.value]?.toLowerCase() === wanted,
  );

  return match?.value ?? '';
}

function mobileMoneyBeneficiary(providers: readonly FieldOption[]): BeneficiarySpec {
  return {
    saveable: true,
    steps: [{ fields: mobileMoneyFields(providers) }],

    toRecipient: (values, { countryCode }) =>
      recipientRecord({
        bankCountry: countryCode,
        bankName: PROVIDER_NAMES[valueOf(values, 'provider')] ?? '',
        accountHolder: valueOf(values, 'beneficiaryName'),
        accountNumber: valueOf(values, 'phoneNumber'),
      }),

    fromRecipient: (fields) => ({
      provider: providerOf(fields.bankName, providers),
      beneficiaryName: fields.accountHolder,
      phoneNumber: fields.accountNumber,
    }),

    details: (fields) => [
      ...row('spend.mobileMoneyProvider', fields.bankName),
      ...row('spend.phoneNumber', fields.accountNumber),
    ],
  };
}

const XOF_PROVIDERS: readonly FieldOption[] = [
  { value: 'wave', labelKey: 'spend.providerWave' },
  { value: 'orange', labelKey: 'spend.providerOrange' },
];

const KES_PROVIDERS: readonly FieldOption[] = [{ value: 'mpesa', labelKey: 'spend.providerMpesa' }];

const mobileMoneySummary: CorridorSpec['summarise'] = (values, labelOf) => ({
  displayName: values['beneficiaryName'] ?? '',
  subtitle: `${labelOf('provider')} • ${values['phoneNumber'] ?? ''}`,
});

export const xofMobileMoney: CorridorSpec = {
  currency: 'XOF',
  method: PaymentMethodCode.MobileMoney,
  rail: RailCode.MobileMoney,
  endpoint: '/transaction/wallet-to-bank',
  entry: 'form',
  payable: true,
  requiresNarration: false,
  steps: [{ fields: mobileMoneyFields(XOF_PROVIDERS) }],

  summarise: mobileMoneySummary,

  toBody: (values, common) => ({
    wallet_id: common.walletId,
    wallet_address: common.walletAddress,
    amount: common.amountMinor,
    currency: common.currency,
    destination_type: 'mobile_money',
    provider: values['provider'] ?? '',
    country: common.countryCode,
    msisdn: values['phoneNumber'] ?? '',
    recipient_name: values['beneficiaryName'] ?? '',
    ...SERVER_SAVES_NO_PAYEE,
  }),

  beneficiary: mobileMoneyBeneficiary(XOF_PROVIDERS),
};

export const kesMobileMoney: CorridorSpec = {
  currency: 'KES',
  method: PaymentMethodCode.MobileMoney,
  rail: RailCode.KesMobileMoney,
  endpoint: '/transaction/wallet-to-bank',
  entry: 'form',
  payable: true,
  requiresNarration: true,
  steps: [{ fields: mobileMoneyFields(KES_PROVIDERS) }],

  summarise: mobileMoneySummary,

  toBody: (values, common) => ({
    wallet_id: common.walletId,
    wallet_address: common.walletAddress,
    amount: common.amountMinor,
    currency: common.currency,
    token_id: common.tokenId,
    msisdn: values['phoneNumber'] ?? '',
    recipient_name: values['beneficiaryName'] ?? '',
    narration: common.narration,
    ...SERVER_SAVES_NO_PAYEE,
  }),

  beneficiary: mobileMoneyBeneficiary(KES_PROVIDERS),
};
