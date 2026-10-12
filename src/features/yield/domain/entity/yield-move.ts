import type { MovementKind } from './yield-entity';

export type YieldChallenge = { challengeId: string; userToken: string; encryptionKey: string };

export type YieldInitiation = {
  challenge: YieldChallenge;
  transactionId: string;
  echo?: { amountMinor?: number; feeMinor?: number; totalMinor?: number };
};

export type YieldMoveRequest = {
  kind: MovementKind;
  amountMinor: number;
  tokenSymbol: string;
  tokenMint: string;
};

export type SignedYieldMove = { signedTransaction: string; transactionId: string };

export type YieldBroadcastStatus = 'succeeded' | 'failed' | 'pending' | 'unknown';
