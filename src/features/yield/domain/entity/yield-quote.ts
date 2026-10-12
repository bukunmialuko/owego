import type { MovementKind } from './yield-entity';

export type YieldQuote = {
  kind: MovementKind;
  amountMinor: number;
  feeMinor: number;
  totalMinor: number;
  currency: 'USD';
};

export type DepositQuoteDecision =
  | { type: 'quoted'; quote: YieldQuote }
  | { type: 'adjusted'; quote: YieldQuote; requestedMinor: number }
  | { type: 'feeExceedsBalance'; feeMinor: number }
  | { type: 'exceedsBalance' }
  | { type: 'unknownBalance' }
  | { type: 'noFit' };

export type WithdrawalQuoteDecision =
  | { type: 'quoted'; quote: YieldQuote }
  | { type: 'exceedsPosition' }
  | { type: 'notAboveFee'; feeMinor: number }
  | { type: 'refused' };
