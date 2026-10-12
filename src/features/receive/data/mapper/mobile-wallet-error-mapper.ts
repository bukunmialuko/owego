import type { DepositSubmission } from '../../domain/entity/external-deposit';
import type { ConnectFailure } from '../../domain/entity/external-wallet';
import type { WalletErrorCode } from '../model/mobile-wallet-model';

const WALLET_NOT_FOUND = 'ERROR_WALLET_NOT_FOUND';
const CHOOSER_DISMISSED = 'Session not established: Local association cancelled by user';
const NEVER_ANSWERED = 'Timed out waiting for local association to be ready';
const NO_RESPONSE = 'Timed out waiting for response';

const AUTHORIZATION_FAILED = -1;
const INVALID_PAYLOADS = -2;
const NOT_SIGNED = -3;
const NOT_SUBMITTED = -4;
const TOO_MANY_PAYLOADS = -5;

export function connectFailureFor(code: WalletErrorCode): ConnectFailure | undefined {
  switch (code) {
    case WALLET_NOT_FOUND:
      return 'noWallet';
    case CHOOSER_DISMISSED:
    case AUTHORIZATION_FAILED:
      return 'cancelled';
    case NEVER_ANSWERED:
    case NO_RESPONSE:
      return 'unreachable';
    default:
      return undefined;
  }
}

export type DispatchPhase = 'beforeDispatch' | 'afterDispatch';

export function depositOutcomeForError(
  code: WalletErrorCode | undefined,
  phase: DispatchPhase,
): DepositSubmission | undefined {
  return phase === 'beforeDispatch' ? beforeDispatch(code) : afterDispatch(code);
}

function beforeDispatch(code: WalletErrorCode | undefined): DepositSubmission | undefined {
  switch (code) {
    case WALLET_NOT_FOUND:
      return { type: 'notSent', reason: 'noWallet' };
    case CHOOSER_DISMISSED:
      return { type: 'notSent', reason: 'declined' };
    case AUTHORIZATION_FAILED:
      return { type: 'notSent', reason: 'authorizationExpired' };
    case NEVER_ANSWERED:
    case NO_RESPONSE:
      return { type: 'notSent', reason: 'unreachable' };
    case undefined:
    default:
      return undefined;
  }
}

function afterDispatch(code: WalletErrorCode | undefined): DepositSubmission {
  switch (code) {
    case NOT_SIGNED:
      return { type: 'notSent', reason: 'declined' };
    case NOT_SUBMITTED:
      return { type: 'notSent', reason: 'notSubmitted' };
    case INVALID_PAYLOADS:
    case TOO_MANY_PAYLOADS:
      return { type: 'notSent', reason: 'invalidRequest' };
    case AUTHORIZATION_FAILED:
      return { type: 'notSent', reason: 'authorizationExpired' };
    case undefined:
    default:
      return { type: 'unconfirmed' };
  }
}
