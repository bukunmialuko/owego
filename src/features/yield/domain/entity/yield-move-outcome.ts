export type YieldNotSentReason =
  | 'failed'
  | 'expired'
  | 'pinLocked'
  | 'incorrectPin'
  | 'rejected'
  | 'quoteChanged'
  | 'rateLimited'
  | 'invalidRequest';

export type YieldMoveOutcome =
  | { type: 'succeeded' }
  | { type: 'processing' }
  | { type: 'unconfirmed' }
  | { type: 'failedOnChain' }
  | { type: 'cancelled' }
  | { type: 'notSent'; reason: YieldNotSentReason };

export type YieldEnding = 'succeeded' | 'processing' | 'unconfirmed' | 'failedOnChain';

export function endingOf(outcome: YieldMoveOutcome): YieldEnding | undefined {
  switch (outcome.type) {
    case 'succeeded':
    case 'processing':
    case 'unconfirmed':
    case 'failedOnChain':
      return outcome.type;
    case 'cancelled':
    case 'notSent':
      return undefined;
  }
}
