import type { ParsedEmvQr } from './emv/parse-emv-qr';
import type { SchemeIdentification } from './scheme/identify-scheme';

type UnreadableReason = 'malformedQr' | 'unsupportedChain' | 'unknownCode';

export type PaymentIdentifier =
  | { kind: 'merchantQr'; parsed: ParsedEmvQr; scheme: SchemeIdentification }
  | { kind: 'cryptoAddress'; address: string; networkCode: string | undefined }
  | { kind: 'phoneNumber'; e164: string; countryCode: string }
  | { kind: 'nigerianAccount'; accountNumber: string }
  | { kind: 'unknown'; reason: UnreadableReason };
