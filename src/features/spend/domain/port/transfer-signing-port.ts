import type { AppError } from '@/core/errors/app-error';
import type { Result } from '@/core/result/result';
import type { TransferChallenge } from '../entity/transfer-challenge';

export type TransferSigningStatus =
  'unknown' | 'pending' | 'in-progress' | 'complete' | 'failed' | 'expired';

type TransferSigningResultType = 'transaction' | 'other';

export type TransferSigningFailure =
  | 'challenge-invalid'
  | 'pin-locked'
  | 'incorrect-pin'
  | 'insecure-pin'
  | 'biometrics-unavailable'
  | 'network'
  | 'unknown';

export type TransferSigningOutcome =
  | { type: 'settled'; status: TransferSigningStatus; resultType: TransferSigningResultType }
  | { type: 'cancelled' }
  | { type: 'failed'; reason: TransferSigningFailure };

export interface TransferSigningPort {
  sign(challenge: TransferChallenge): Promise<Result<TransferSigningOutcome, AppError>>;
}
