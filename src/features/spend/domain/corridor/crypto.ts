import { minorToDecimalString } from '@/core/money/money';
import { CHAIN_METADATA } from '@/core/reference-data/chain-metadata';
import { PaymentMethodCode, fieldsFor, type FieldDescriptor } from '../entity/beneficiary-form';
import { networkCodeOf } from '../beneficiary/classify-recipient';
import { validateWalletAddress } from '../usecase/validate-wallet-address-usecase';
import { RailCode, type CorridorSpec } from './corridor-spec';
import { recipientRecord, row, valueOf } from './recipient-record';

const walletTag: FieldDescriptor = {
  name: 'walletTag',
  labelKey: 'spend.walletTag',
  placeholderKey: 'spend.walletTagPlaceholder',
  kind: 'text',
  required: true,
};

export const cryptoWallet: CorridorSpec = {
  currency: 'USDC',
  method: PaymentMethodCode.Crypto,
  rail: RailCode.Wallet,
  endpoint: '/transaction/challenge-id',
  entry: 'form',
  payable: true,
  requiresNarration: false,
  steps: [{ fields: fieldsFor(PaymentMethodCode.Crypto) }],

  summarise: (values, labelOf) => ({
    displayName: values['walletAddress'] ?? '',
    subtitle: labelOf('network'),
  }),

  toBody: (values, common) => ({
    wallet_id: common.walletId,
    amount: minorToDecimalString(common.amountMinor),
    destination_address: values['walletAddress'] ?? '',
    token_id: common.tokenId,
  }),

  beneficiary: {
    saveable: true,
    steps: [{ fields: [walletTag, ...fieldsFor(PaymentMethodCode.Crypto)] }],

    toRecipient: (values) =>
      recipientRecord({
        bankName: valueOf(values, 'network'),
        accountHolder: valueOf(values, 'walletTag'),
        accountNumber: valueOf(values, 'walletAddress'),
      }),

    fromRecipient: (fields) => ({
      walletTag: fields.accountHolder,
      network: networkCodeOf(fields.bankName) ?? fields.bankName,
      walletAddress: fields.accountNumber,
    }),

    details: (fields) => {
      const network = networkCodeOf(fields.bankName);

      return [
        ...row(
          'spend.network',
          network === undefined ? fields.bankName : (CHAIN_METADATA[network]?.name ?? network),
        ),
        ...row('spend.walletAddress', fields.accountNumber),
      ];
    },

    validate: (values) => {
      const address = valueOf(values, 'walletAddress');
      if (address === '') return undefined;

      const validation = validateWalletAddress(address, valueOf(values, 'network'));

      return validation.valid
        ? undefined
        : { field: 'walletAddress', messageKey: validation.messageKey };
    },
  },
};
