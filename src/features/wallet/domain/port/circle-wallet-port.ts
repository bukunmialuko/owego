import type { AppError } from '@/core/errors/app-error';
import type { Result } from '@/core/result/result';
import type { WalletChallenge } from '../entity/wallet-entity';

export type CircleExecuteStatus =
  'unknown' | 'pending' | 'in-progress' | 'complete' | 'failed' | 'expired';

export type CircleResultType =
  | 'create-wallet'
  | 'initialize'
  | 'set-pin'
  | 'restore-pin'
  | 'set-security-questions'
  | 'create-transaction'
  | 'set-biometrics-pin'
  | 'sign-transaction'
  | 'other';

export type CircleFailureReason =
  | 'challenge-invalid'
  | 'pin-locked'
  | 'incorrect-pin'
  | 'insecure-pin'
  | 'biometrics-unavailable'
  | 'network'
  | 'unknown';

export type CircleChallengeOutcome =
  | {
      type: 'settled';
      status: CircleExecuteStatus;
      resultType: CircleResultType;
      signedTransaction?: string;
    }
  | { type: 'cancelled' }
  | { type: 'failed'; reason: CircleFailureReason; message: string };

export interface CircleWalletPort {
  executeChallenge(challenge: WalletChallenge): Promise<Result<CircleChallengeOutcome, AppError>>;
}
