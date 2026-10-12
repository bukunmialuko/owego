import type { TransferRecipient } from '../../domain/entity/asset-transfer';
import type { SentOutcome } from '../../domain/entity/send-outcome';

type AddressPrefill = {
  address: string;
  networkCode?: string;
  tokenSymbol?: string;
};

export type DigitalAssetParamList = {
  Recipient: { prefill?: AddressPrefill } | undefined;
  Amount: { recipient: TransferRecipient };
  Confirm: { recipient: TransferRecipient; amountMinor: number };
  Success: { recipient: TransferRecipient; amountMinor: number; outcome: SentOutcome };
};
