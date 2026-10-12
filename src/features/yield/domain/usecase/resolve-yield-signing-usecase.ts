import type { AppError } from '@/core/errors/app-error';
import type { Result } from '@/core/result/result';
import type { YieldNotSentReason } from '../entity/yield-move-outcome';
import type { YieldSigningFailure, YieldSigningOutcome } from '../port/yield-signing-port';

export type SigningResolution =
  | { type: 'signed'; signedTransaction: string }
  | { type: 'cancelled' }
  | { type: 'notSent'; reason: YieldNotSentReason }
  | { type: 'unconfirmed' };

export function resolveYieldSigning(
  answer: Result<YieldSigningOutcome, AppError> | 'timedOut',
): SigningResolution {
  if (answer === 'timedOut') return { type: 'notSent', reason: 'expired' };
  if (!answer.ok) return { type: 'notSent', reason: 'failed' };

  const outcome = answer.value;
  switch (outcome.type) {
    case 'cancelled':
      return { type: 'cancelled' };
    case 'failed':
      return { type: 'notSent', reason: fromFailure(outcome.reason) };
    case 'settled':
      if (outcome.status === 'expired') return { type: 'notSent', reason: 'expired' };
      if (outcome.resultType !== 'signature') {
        return outcome.status === 'failed'
          ? { type: 'notSent', reason: 'failed' }
          : { type: 'unconfirmed' };
      }

      return outcome.status === 'complete' && outcome.signedTransaction !== undefined
        ? { type: 'signed', signedTransaction: outcome.signedTransaction }
        : { type: 'notSent', reason: 'failed' };
  }
}

function fromFailure(reason: YieldSigningFailure): YieldNotSentReason {
  switch (reason) {
    case 'pin-locked':
      return 'pinLocked';
    case 'incorrect-pin':
      return 'incorrectPin';
    case 'challenge-invalid':
    case 'insecure-pin':
    case 'biometrics-unavailable':
    case 'network':
    case 'unknown':
      return 'failed';
  }
}
