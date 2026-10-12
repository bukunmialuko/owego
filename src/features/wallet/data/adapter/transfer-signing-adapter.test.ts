import { unknownError, type AppError } from '@/core/errors/app-error';
import { err, ok, type Result } from '@/core/result/result';
import type { WalletChallenge } from '../../domain/entity/wallet-entity';
import type {
  CircleChallengeOutcome,
  CircleExecuteStatus,
  CircleFailureReason,
  CircleResultType,
  CircleWalletPort,
} from '../../domain/port/circle-wallet-port';
import { createTransferSigningAdapter } from './transfer-signing-adapter';

const CHALLENGE = { challengeId: 'chal_1', userToken: 'utok_1', encryptionKey: 'key_1' };

function adapterAnswering(result: Result<CircleChallengeOutcome, AppError>) {
  const executed: WalletChallenge[] = [];
  const circleWalletPort: CircleWalletPort = {
    executeChallenge: (challenge) => {
      executed.push(challenge);
      return Promise.resolve(result);
    },
  };

  return { adapter: createTransferSigningAdapter(circleWalletPort), executed };
}

function settled(status: CircleExecuteStatus, resultType: CircleResultType = 'create-transaction') {
  return ok<CircleChallengeOutcome>({ type: 'settled', status, resultType });
}

describe('transfer signing adapter', () => {
  it('never hands spend a signed transaction', async () => {
    const { adapter } = adapterAnswering(
      ok<CircleChallengeOutcome>({
        type: 'settled',
        status: 'complete',
        resultType: 'sign-transaction',
        signedTransaction: 'c2lnbmVk',
      }),
    );

    await expect(adapter.sign(CHALLENGE)).resolves.toEqual(
      ok({ type: 'settled', status: 'complete', resultType: 'other' }),
    );
  });

  it('hands Circle the challenge field for field, once', async () => {
    const { adapter, executed } = adapterAnswering(settled('complete'));

    await adapter.sign(CHALLENGE);

    expect(executed).toEqual([CHALLENGE]);
  });

  it.each<CircleExecuteStatus>([
    'unknown',
    'pending',
    'in-progress',
    'complete',
    'failed',
    'expired',
  ])('passes a %s status through unchanged', async (status) => {
    const { adapter } = adapterAnswering(settled(status));

    await expect(adapter.sign(CHALLENGE)).resolves.toEqual(
      ok({ type: 'settled', status, resultType: 'transaction' }),
    );
  });

  it.each<CircleResultType>(['other', 'initialize', 'create-wallet', 'set-pin'])(
    'reports a %s result as other, not as a transaction',
    async (resultType) => {
      const { adapter } = adapterAnswering(settled('complete', resultType));

      await expect(adapter.sign(CHALLENGE)).resolves.toEqual(
        ok({ type: 'settled', status: 'complete', resultType: 'other' }),
      );
    },
  );

  it('passes a closed PIN sheet through as cancelled', async () => {
    const { adapter } = adapterAnswering(ok({ type: 'cancelled' }));

    await expect(adapter.sign(CHALLENGE)).resolves.toEqual(ok({ type: 'cancelled' }));
  });

  it.each<CircleFailureReason>([
    'challenge-invalid',
    'pin-locked',
    'incorrect-pin',
    'insecure-pin',
    'biometrics-unavailable',
    'network',
    'unknown',
  ])('passes a %s failure through without its message', async (reason) => {
    const { adapter } = adapterAnswering(ok({ type: 'failed', reason, message: 'raw sdk text' }));

    await expect(adapter.sign(CHALLENGE)).resolves.toEqual(ok({ type: 'failed', reason }));
  });

  it('passes an SDK that could not run through as an error', async () => {
    const failure = unknownError('Circle SDK initialisation failed.');
    const { adapter } = adapterAnswering(err(failure));

    await expect(adapter.sign(CHALLENGE)).resolves.toEqual(err(failure));
  });
});
