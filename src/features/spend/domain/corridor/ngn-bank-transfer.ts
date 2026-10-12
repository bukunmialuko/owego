import { PaymentMethodCode, fieldsFor } from '../entity/beneficiary-form';
import { RailCode, SERVER_SAVES_NO_PAYEE, type CorridorSpec } from './corridor-spec';
import { recipientRecord, row, valueOf } from './recipient-record';

export const ngnBankTransfer: CorridorSpec = {
  currency: 'NGN',
  method: PaymentMethodCode.BankTransfer,
  rail: RailCode.BankTransfer,
  endpoint: '/transaction/wallet-to-bank',
  entry: 'form',
  payable: true,
  requiresNarration: true,
  steps: [{ fields: fieldsFor(PaymentMethodCode.BankTransfer) }],

  verification: {
    dependsOn: ['bankCode', 'accountNumber'],
    resolves: 'accountName',
    call: 'resolveAccount',
  },

  summarise: (values, labelOf) => ({
    displayName: values['accountName'] ?? '',
    subtitle: `${labelOf('bankCode')} • ${values['accountNumber'] ?? ''}`,
  }),

  toBody: (values, common) => ({
    wallet_id: common.walletId,
    wallet_address: common.walletAddress,
    amount: common.amountMinor,
    currency: common.currency,
    token_id: common.tokenId,
    recipient_bank_code: values['bankCode'] ?? '',
    recipient_account_number: values['accountNumber'] ?? '',
    narration: common.narration,
    ...SERVER_SAVES_NO_PAYEE,
  }),

  beneficiary: {
    saveable: true,
    steps: [{ fields: fieldsFor(PaymentMethodCode.BankTransfer) }],

    toRecipient: (values, { countryCode, labelOf }) =>
      recipientRecord({
        bankCountry: countryCode,
        bankName: labelOf('bankCode'),
        bankCode: valueOf(values, 'bankCode'),
        accountHolder: valueOf(values, 'accountName'),
        accountNumber: valueOf(values, 'accountNumber'),
      }),

    fromRecipient: (fields) => ({
      bankCode: fields.bankCode,
      accountNumber: fields.accountNumber,
      accountName: fields.accountHolder,
    }),

    details: (fields) => [
      ...row('common.bankName', fields.bankName),
      ...row('common.accountNumber', fields.accountNumber),
    ],
  },
};
