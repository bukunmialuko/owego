import { PaymentMethodCode } from '../entity/beneficiary-form';
import { RailCode, type CorridorSpec } from './corridor-spec';

export function qrCorridor(currency: string): CorridorSpec {
  return {
    currency,
    method: PaymentMethodCode.Crypto,
    rail: RailCode.Wallet,
    endpoint: '/transaction/qr-pay',
    entry: 'scan',
    payable: true,
    requiresNarration: false,
    steps: [],

    summarise: (values) => ({
      displayName: values['merchantName'] ?? '',
      subtitle: currency,
    }),

    unnamedKey: 'spend.merchant.unnamed',

    toBody: (values, common) => ({
      qr_string: values['qrString'] ?? '',
      wallet_id: common.walletId,
      wallet_address: common.walletAddress,
      token_id: common.tokenId,
      amount: common.amountMinor / 100,
    }),
  };
}
