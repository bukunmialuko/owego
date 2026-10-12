import type { DepositToken } from './deposit-token';

export type DepositTransfer = {
  token: DepositToken;
  source: string;
  destination: string;
  amount: bigint;
};

export type RecentBlockhash = {
  blockhash: string;
  lastValidBlockHeight: bigint;
  minContextSlot: bigint;
};

export type DepositNotSentReason =
  | 'declined'
  | 'notSubmitted'
  | 'authorizationExpired'
  | 'noWallet'
  | 'unreachable'
  | 'unsupported'
  | 'invalidRequest'
  | 'noDestination';

export type DepositSubmission =
  | { type: 'submitted'; signature: string }
  | { type: 'unconfirmed' }
  | { type: 'notSent'; reason: DepositNotSentReason };

export function mayHaveMovedMoney(submission: DepositSubmission): boolean {
  switch (submission.type) {
    case 'submitted':
    case 'unconfirmed':
      return true;
    case 'notSent':
      return false;
  }
}

export type SignatureStatus =
  | { type: 'unknown' }
  | { type: 'landed'; commitment: 'processed' | 'confirmed' | 'finalized'; failed: boolean };

export type DepositConfirmation = 'confirmed' | 'failed' | 'pending';
