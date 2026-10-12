import type { AppError } from '@/core/errors/app-error';
import type { Result } from '@/core/result/result';
import type { SendOutcome } from '../entity/send-outcome';
import type { TransferSigningFailure, TransferSigningOutcome } from '../port/transfer-signing-port';

export function resolveSendOutcome(result: Result<TransferSigningOutcome, AppError>): SendOutcome {
  if (!result.ok) return { type: 'notSent', reason: 'failed' };

  const outcome = result.value;

  switch (outcome.type) {
    case 'cancelled':
      return { type: 'cancelled' };
    case 'failed':
      return fromFailure(outcome.reason);
    case 'settled':
      switch (outcome.status) {
        case 'complete':
          return outcome.resultType === 'transaction' ? { type: 'sent' } : { type: 'unconfirmed' };
        case 'pending':
        case 'in-progress':
        case 'unknown':
          return { type: 'processing' };
        case 'failed':
          return { type: 'notSent', reason: 'failed' };
        case 'expired':
          return { type: 'notSent', reason: 'expired' };
      }
  }
}

function fromFailure(reason: TransferSigningFailure): SendOutcome {
  switch (reason) {
    case 'challenge-invalid':
    case 'insecure-pin':
    case 'biometrics-unavailable':
      return { type: 'notSent', reason: 'failed' };
    case 'pin-locked':
      return { type: 'notSent', reason: 'pinLocked' };
    case 'incorrect-pin':
      return { type: 'notSent', reason: 'incorrectPin' };
    case 'network':
    case 'unknown':
      return { type: 'unconfirmed' };
  }
}
