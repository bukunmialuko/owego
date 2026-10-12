import { unknownError } from '@/core/errors/app-error';
import { err, ok } from '@/core/result/result';
import type {
  YieldSigningFailure,
  YieldSigningOutcome,
  YieldSigningStatus,
} from '../port/yield-signing-port';
import { resolveYieldSigning } from './resolve-yield-signing-usecase';

function settled(
  status: YieldSigningStatus,
  resultType: 'signature' | 'transaction' | 'other' = 'signature',
  signedTransaction: string | null = 'c2lnbmVk',
) {
  return ok<YieldSigningOutcome>({
    type: 'settled',
    status,
    resultType,
    ...(signedTransaction === null ? {} : { signedTransaction }),
  });
}

describe('resolveYieldSigning', () => {
  it('hands on a completed signature', () => {
    expect(resolveYieldSigning(settled('complete'))).toEqual({
      type: 'signed',
      signedTransaction: 'c2lnbmVk',
    });
  });

  it('reads a cancelled sheet as cancelled', () => {
    expect(resolveYieldSigning(ok({ type: 'cancelled' }))).toEqual({ type: 'cancelled' });
  });

  it.each<[YieldSigningFailure, string]>([
    ['pin-locked', 'pinLocked'],
    ['incorrect-pin', 'incorrectPin'],
    ['challenge-invalid', 'failed'],
    ['insecure-pin', 'failed'],
    ['biometrics-unavailable', 'failed'],
    ['network', 'failed'],
    ['unknown', 'failed'],
  ])('reads a %s failure as not sent, %s', (reason, notSent) => {
    expect(resolveYieldSigning(ok({ type: 'failed', reason }))).toEqual({
      type: 'notSent',
      reason: notSent,
    });
  });

  it('reads a signer that never ran as not sent', () => {
    expect(resolveYieldSigning(err(unknownError('init failed')))).toEqual({
      type: 'notSent',
      reason: 'failed',
    });
  });

  it('reads a signing timeout as not sent, expired', () => {
    expect(resolveYieldSigning('timedOut')).toEqual({ type: 'notSent', reason: 'expired' });
  });

  it.each<YieldSigningStatus>(['pending', 'in-progress', 'unknown', 'failed'])(
    'reads a %s signature as not sent',
    (status) => {
      expect(resolveYieldSigning(settled(status))).toEqual({ type: 'notSent', reason: 'failed' });
    },
  );

  it('reads an expired signature as not sent, expired', () => {
    expect(resolveYieldSigning(settled('expired'))).toEqual({ type: 'notSent', reason: 'expired' });
  });

  it('reads a completed signature with no transaction as not sent', () => {
    expect(resolveYieldSigning(settled('complete', 'signature', null))).toEqual({
      type: 'notSent',
      reason: 'failed',
    });
  });

  it.each(['transaction', 'other'] as const)(
    'reads a completed %s result as unconfirmed, never broadcasting it',
    (resultType) => {
      expect(resolveYieldSigning(settled('complete', resultType))).toEqual({ type: 'unconfirmed' });
    },
  );

  it.each(['failed', 'expired'] as const)(
    'reads a %s non-signature result as not sent',
    (status) => {
      expect(resolveYieldSigning(settled(status, 'transaction'))).toMatchObject({
        type: 'notSent',
      });
    },
  );
});
