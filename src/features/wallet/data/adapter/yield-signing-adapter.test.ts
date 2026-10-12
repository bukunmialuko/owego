import { unknownError, type AppError } from '@/core/errors/app-error';
import { err, ok, type Result } from '@/core/result/result';
import type { WalletChallenge } from '../../domain/entity/wallet-entity';
import type {
  CircleChallengeOutcome,
  CircleResultType,
  CircleWalletPort,
} from '../../domain/port/circle-wallet-port';
import { createPreviewYieldSigningAdapter } from './preview-yield-signing-adapter';
import { createYieldSigningAdapter } from './yield-signing-adapter';

const CHALLENGE = { challengeId: 'chal_1', userToken: 'utok_1', encryptionKey: 'key_1' };

function adapterAnswering(result: Result<CircleChallengeOutcome, AppError>) {
  const executed: WalletChallenge[] = [];
  const circleWalletPort: CircleWalletPort = {
    executeChallenge: (challenge) => {
      executed.push(challenge);
      return Promise.resolve(result);
    },
  };

  return { adapter: createYieldSigningAdapter(circleWalletPort), executed };
}

describe('yield signing adapter', () => {
  it('hands Circle the challenge field for field, once', async () => {
    const { adapter, executed } = adapterAnswering(ok({ type: 'cancelled' }));

    await adapter.sign(CHALLENGE);

    expect(executed).toEqual([CHALLENGE]);
  });

  it('hands on the transaction Circle signed', async () => {
    const { adapter } = adapterAnswering(
      ok({
        type: 'settled',
        status: 'complete',
        resultType: 'sign-transaction',
        signedTransaction: 'c2lnbmVk',
      }),
    );

    await expect(adapter.sign(CHALLENGE)).resolves.toEqual(
      ok({
        type: 'settled',
        status: 'complete',
        resultType: 'signature',
        signedTransaction: 'c2lnbmVk',
      }),
    );
  });

  it.each<[CircleResultType, string]>([
    ['create-transaction', 'transaction'],
    ['other', 'other'],
    ['initialize', 'other'],
  ])('reports a %s result as %s', async (resultType, expected) => {
    const { adapter } = adapterAnswering(ok({ type: 'settled', status: 'complete', resultType }));

    await expect(adapter.sign(CHALLENGE)).resolves.toEqual(
      ok({ type: 'settled', status: 'complete', resultType: expected }),
    );
  });

  it('passes a failure through without its message', async () => {
    const { adapter } = adapterAnswering(
      ok({ type: 'failed', reason: 'incorrect-pin', message: 'raw sdk text' }),
    );

    await expect(adapter.sign(CHALLENGE)).resolves.toEqual(
      ok({ type: 'failed', reason: 'incorrect-pin' }),
    );
  });

  it('passes a cancellation and an sdk that could not run through', async () => {
    const failure = unknownError('Circle SDK initialisation failed.');

    await expect(
      adapterAnswering(ok({ type: 'cancelled' })).adapter.sign(CHALLENGE),
    ).resolves.toEqual(ok({ type: 'cancelled' }));
    await expect(adapterAnswering(err(failure)).adapter.sign(CHALLENGE)).resolves.toEqual(
      err(failure),
    );
  });
});

describe('preview yield signing adapter', () => {
  it('signs without Circle', async () => {
    await expect(createPreviewYieldSigningAdapter().sign(CHALLENGE)).resolves.toEqual(
      ok({
        type: 'settled',
        status: 'complete',
        resultType: 'signature',
        signedTransaction: 'preview-signed-transaction',
      }),
    );
  });
});
