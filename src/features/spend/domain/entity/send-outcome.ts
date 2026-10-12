export type NotSentReason =
  'failed' | 'expired' | 'pinLocked' | 'incorrectPin' | 'insufficientBalance' | 'invalidRequest';

export type SendOutcome =
  | { type: 'sent' }
  | { type: 'processing' }
  | { type: 'unconfirmed' }
  | { type: 'cancelled' }
  | { type: 'notSent'; reason: NotSentReason };

export type SentOutcome = 'sent' | 'processing' | 'unconfirmed';

export function mayHaveMovedMoney(outcome: SendOutcome): boolean {
  switch (outcome.type) {
    case 'sent':
    case 'processing':
    case 'unconfirmed':
      return true;
    case 'cancelled':
    case 'notSent':
      return false;
  }
}
