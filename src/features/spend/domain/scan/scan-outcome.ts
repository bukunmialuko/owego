import type { PayoutRecipient } from '../entity/payout-recipient';

export type UnsupportedReason =
  | 'malformedQr'
  | 'cardSchemeQr'
  | 'currencyNotOffered'
  | 'comingSoon'
  | 'remoteAmount'
  | 'corridorUnavailable'
  | 'unsupportedChain'
  | 'oneTimeCode'
  | 'unknownCode';

export type ScanOutcome =
  | {
      kind: 'merchant';
      recipient: PayoutRecipient;
      amountMinor: number | undefined;
      qrString: string;
    }
  | { kind: 'account'; recipient: PayoutRecipient; isVerified: boolean }
  | { kind: 'prefillRecipient'; currency: string; values: Readonly<Record<string, string>> }
  | { kind: 'prefillAddress'; address: string; networkCode: string | undefined }
  | {
      kind: 'unsupported';
      reason: UnsupportedReason;
      currencyName?: string;
    };
