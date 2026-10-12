import type { AppError } from '@/core/errors/app-error';
import type { Result } from '@/core/result/result';
import type { YieldChallenge } from '../entity/yield-move';

export type YieldSigningStatus =
  'unknown' | 'pending' | 'in-progress' | 'complete' | 'failed' | 'expired';

export type YieldSigningFailure =
  | 'challenge-invalid'
  | 'pin-locked'
  | 'incorrect-pin'
  | 'insecure-pin'
  | 'biometrics-unavailable'
  | 'network'
  | 'unknown';

export type YieldSigningOutcome =
  | {
      type: 'settled';
      status: YieldSigningStatus;
      resultType: 'signature' | 'transaction' | 'other';
      signedTransaction?: string;
    }
  | { type: 'cancelled' }
  | { type: 'failed'; reason: YieldSigningFailure };

export interface YieldSigningPort {
  sign(challenge: YieldChallenge): Promise<Result<YieldSigningOutcome, AppError>>;
}
