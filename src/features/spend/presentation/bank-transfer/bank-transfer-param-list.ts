import type { PayoutQuote } from '../../domain/entity/payout-quote';
import type { PayoutOrigin, PayoutRecipient } from '../../domain/entity/payout-recipient';
import type { SentOutcome } from '../../domain/entity/send-outcome';

type RecipientPrefill = {
  currency: string;
  method?: string;
  values: Record<string, string>;
  fundingToken?: string;
  origin?: PayoutOrigin;
};

export type BankTransferParamList = {
  Recipient: { prefill?: RecipientPrefill } | undefined;
  BankDetails: {
    currency: string;
    method: string;
    fundingToken: string;
    values: Record<string, string>;
    origin: PayoutOrigin;
  };
  Amount: { recipient: PayoutRecipient; fundingToken: string; origin: PayoutOrigin };
  MerchantAmount: { qrString: string; fundingToken?: string };
  Confirm: {
    recipient: PayoutRecipient;
    fundingToken: string;
    amountMinor: number;
    narration: string;
    origin: PayoutOrigin;
  };
  Success: { recipient: PayoutRecipient; quote: PayoutQuote; outcome: SentOutcome };
};
