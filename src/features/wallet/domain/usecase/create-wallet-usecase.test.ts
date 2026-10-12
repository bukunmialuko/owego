import { offline, unknownError } from '@/core/errors/app-error';
import { err, ok } from '@/core/result/result';
import type { WalletChallenge } from '../entity/wallet-entity';
import type { CircleChallengeOutcome, CircleWalletPort } from '../port/circle-wallet-port';
import type { WalletRepository } from '../repository/wallet-repository';
import { createCreateWalletUseCase } from './create-wallet-usecase';

function challengeNumbered(n: number): WalletChallenge {
  return { challengeId: `chal-${n}`, userToken: `token-${n}`, encryptionKey: `key-${n}` };
}

function build(outcomes: (CircleChallengeOutcome | 'error')[]) {
  let minted = 0;
  const createChallenge = jest.fn(() => {
    minted += 1;
    return Promise.resolve(ok(challengeNumbered(minted)));
  });

  let executed = 0;
  const executeChallenge = jest.fn(() => {
    const outcome = outcomes[executed] ?? outcomes[outcomes.length - 1];
    executed += 1;

    return Promise.resolve(
      outcome === 'error'
        ? err(unknownError('sdk could not run'))
        : ok(outcome as CircleChallengeOutcome),
    );
  });

  const walletRepository = {
    createChallenge,
    getWallets: jest.fn(),
  } as unknown as WalletRepository;
  const circleWalletPort = { executeChallenge } as CircleWalletPort;

  return {
    useCase: createCreateWalletUseCase({ walletRepository, circleWalletPort }),
    createChallenge,
    executeChallenge,
  };
}

const settled = (status: CircleChallengeOutcome extends never ? never : string) =>
  ({ type: 'settled', status, resultType: 'initialize' }) as CircleChallengeOutcome;

describe('CreateWalletUseCase', () => {
  it('mints a challenge and hands it to the sdk', async () => {
    const { useCase, createChallenge, executeChallenge } = build([settled('complete')]);

    await useCase.execute();

    expect(createChallenge).toHaveBeenCalledTimes(1);
    expect(executeChallenge).toHaveBeenCalledWith(challengeNumbered(1));
  });

  it.each(['complete', 'pending', 'in-progress'])(
    'advances to provisioning on %s',
    async (status) => {
      const { useCase } = build([settled(status)]);

      await expect(useCase.execute()).resolves.toEqual(ok({ type: 'provisioning' }));
    },
  );

  it('advances on unknown, and marks it unconfirmed', async () => {
    const { useCase } = build([settled('unknown')]);

    await expect(useCase.execute()).resolves.toEqual(ok({ type: 'provisioning-unconfirmed' }));
  });

  it.each(['failed', 'expired'])('reports %s as incomplete without retrying', async (status) => {
    const { useCase, createChallenge } = build([settled(status)]);

    await expect(useCase.execute()).resolves.toEqual(ok({ type: 'setup-incomplete' }));
    expect(createChallenge).toHaveBeenCalledTimes(1);
  });

  it('returns a cancellation unchanged', async () => {
    const { useCase, createChallenge } = build([{ type: 'cancelled' }]);

    await expect(useCase.execute()).resolves.toEqual(ok({ type: 'cancelled' }));
    expect(createChallenge).toHaveBeenCalledTimes(1);
  });

  it.each(['pin-locked', 'insecure-pin', 'network', 'biometrics-unavailable', 'unknown'] as const)(
    'passes a %s failure straight through',
    async (reason) => {
      const { useCase, createChallenge } = build([{ type: 'failed', reason, message: 'nope' }]);

      await expect(useCase.execute()).resolves.toEqual(
        ok({ type: 'failed', reason, message: 'nope' }),
      );
      expect(createChallenge).toHaveBeenCalledTimes(1);
    },
  );
});

describe('CreateWalletUseCase — the single retry', () => {
  const staleThenFine: (CircleChallengeOutcome | 'error')[] = [
    { type: 'failed', reason: 'challenge-invalid', message: 'stale' },
    { type: 'settled', status: 'complete', resultType: 'initialize' },
  ];

  it('mints a fresh challenge and retries once when the triple was stale', async () => {
    const { useCase, createChallenge, executeChallenge } = build(staleThenFine);

    await expect(useCase.execute()).resolves.toEqual(ok({ type: 'provisioning' }));
    expect(createChallenge).toHaveBeenCalledTimes(2);
    expect(executeChallenge).toHaveBeenCalledTimes(2);
  });

  it('retries with different credentials, never the spent ones', async () => {
    const { useCase, executeChallenge } = build(staleThenFine);

    await useCase.execute();

    expect(executeChallenge).toHaveBeenNthCalledWith(1, challengeNumbered(1));
    expect(executeChallenge).toHaveBeenNthCalledWith(2, challengeNumbered(2));
  });

  it('gives up after exactly one retry rather than looping', async () => {
    const stale: CircleChallengeOutcome = {
      type: 'failed',
      reason: 'challenge-invalid',
      message: 'stale',
    };
    const { useCase, createChallenge, executeChallenge } = build([stale, stale, stale]);

    await expect(useCase.execute()).resolves.toEqual(ok({ type: 'challenge-unavailable' }));
    expect(createChallenge).toHaveBeenCalledTimes(2);
    expect(executeChallenge).toHaveBeenCalledTimes(2);
  });
});

describe('CreateWalletUseCase — failures it must not dress up', () => {
  it('passes an sdk error through unwrapped and un-retried', async () => {
    const { useCase, createChallenge } = build(['error']);

    const result = await useCase.execute();

    expect(result.ok).toBe(false);
    expect(createChallenge).toHaveBeenCalledTimes(1);
  });

  it('reports a challenge that could not be minted', async () => {
    const walletRepository = {
      createChallenge: jest.fn().mockResolvedValue(err(offline())),
      getWallets: jest.fn(),
    } as unknown as WalletRepository;
    const executeChallenge = jest.fn();
    const useCase = createCreateWalletUseCase({
      walletRepository,
      circleWalletPort: { executeChallenge },
    });

    await expect(useCase.execute()).resolves.toEqual(ok({ type: 'challenge-unavailable' }));
    expect(executeChallenge).not.toHaveBeenCalled();
  });
});
