import { offline, unknownError } from '@/core/errors/app-error';
import { err, ok } from '@/core/result/result';
import type { TransferSigningFailure, TransferSigningStatus } from '../port/transfer-signing-port';
import { resolveSendOutcome } from './resolve-send-outcome-usecase';

function settled(
  status: TransferSigningStatus,
  resultType: 'transaction' | 'other' = 'transaction',
) {
  return ok({ type: 'settled' as const, status, resultType });
}

function failed(reason: TransferSigningFailure) {
  return ok({ type: 'failed' as const, reason });
}

describe('resolveSendOutcome', () => {
  it('reads a completed transfer as sent', () => {
    expect(resolveSendOutcome(settled('complete'))).toEqual({ type: 'sent' });
  });

  it.each<TransferSigningStatus>(['pending', 'in-progress', 'unknown'])(
    'reads a %s transfer as processing',
    (status) => {
      expect(resolveSendOutcome(settled(status))).toEqual({ type: 'processing' });
    },
  );

  it('reads a completion that is not a transfer as unconfirmed, never as sent', () => {
    expect(resolveSendOutcome(settled('complete', 'other'))).toEqual({ type: 'unconfirmed' });
  });

  it('reads a failed transfer as not sent', () => {
    expect(resolveSendOutcome(settled('failed'))).toEqual({ type: 'notSent', reason: 'failed' });
  });

  it('reads an expired challenge as not sent, expired', () => {
    expect(resolveSendOutcome(settled('expired'))).toEqual({
      type: 'notSent',
      reason: 'expired',
    });
  });

  it('reads a closed PIN sheet as cancelled', () => {
    expect(resolveSendOutcome(ok({ type: 'cancelled' }))).toEqual({ type: 'cancelled' });
  });

  it.each<TransferSigningFailure>(['challenge-invalid', 'insecure-pin', 'biometrics-unavailable'])(
    'reads a %s failure as not sent',
    (reason) => {
      expect(resolveSendOutcome(failed(reason))).toEqual({ type: 'notSent', reason: 'failed' });
    },
  );

  it('reads a wrong PIN as not sent, incorrect pin', () => {
    expect(resolveSendOutcome(failed('incorrect-pin'))).toEqual({
      type: 'notSent',
      reason: 'incorrectPin',
    });
  });

  it('reads a locked PIN as not sent, pin locked', () => {
    expect(resolveSendOutcome(failed('pin-locked'))).toEqual({
      type: 'notSent',
      reason: 'pinLocked',
    });
  });

  it.each<TransferSigningFailure>(['network', 'unknown'])(
    'reads a %s failure as unconfirmed',
    (reason) => {
      expect(resolveSendOutcome(failed(reason))).toEqual({ type: 'unconfirmed' });
    },
  );

  it.each([unknownError('Circle SDK initialisation failed.'), offline()])(
    'reads a signer that never ran as not sent',
    (error) => {
      expect(resolveSendOutcome(err(error))).toEqual({ type: 'notSent', reason: 'failed' });
    },
  );
});
