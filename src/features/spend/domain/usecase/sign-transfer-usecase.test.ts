import { unknownError, type AppError } from '@/core/errors/app-error';
import { err, ok, type Result } from '@/core/result/result';
import type { TransferChallenge } from '../entity/transfer-challenge';
import type { TransferSigningOutcome, TransferSigningPort } from '../port/transfer-signing-port';
import { signTransfer } from './sign-transfer-usecase';

const CHALLENGE: TransferChallenge = {
  challengeId: 'challenge-1',
  userToken: 'user-token-1',
  encryptionKey: 'encryption-key-1',
};

function signerAnswering(answer: Result<TransferSigningOutcome, AppError>) {
  const signed: TransferChallenge[] = [];
  const port: TransferSigningPort = {
    sign: (challenge) => {
      signed.push(challenge);

      return Promise.resolve(answer);
    },
  };

  return { port, signed };
}

describe('signTransfer', () => {
  it('signs exactly the challenge it was given', async () => {
    const { port, signed } = signerAnswering(
      ok({ type: 'settled', status: 'complete', resultType: 'transaction' }),
    );

    await signTransfer(port, CHALLENGE, 1_000);

    expect(signed).toEqual([CHALLENGE]);
  });

  it("reads Circle's answer as what it means for the payment", async () => {
    const { port } = signerAnswering(
      ok({ type: 'settled', status: 'complete', resultType: 'transaction' }),
    );

    expect(await signTransfer(port, CHALLENGE, 1_000)).toEqual({ type: 'sent' });
  });

  it('calls a signer that could not run not sent', async () => {
    const { port } = signerAnswering(err(unknownError('no native module')));

    expect(await signTransfer(port, CHALLENGE, 1_000)).toEqual({
      type: 'notSent',
      reason: 'failed',
    });
  });

  it('calls a signature that never answers unconfirmed once the bound has passed', async () => {
    jest.useFakeTimers();
    try {
      const port: TransferSigningPort = { sign: () => new Promise(() => undefined) };

      const pending = signTransfer(port, CHALLENGE, 1_000);
      await jest.advanceTimersByTimeAsync(1_000);

      expect(await pending).toEqual({ type: 'unconfirmed' });
    } finally {
      jest.useRealTimers();
    }
  });
});
