import { cancelled, unknownError, type AppError } from '@/core/errors/app-error';
import { err, ok, type Result } from '@/core/result/result';
import type { SignatureStatus } from '../entity/external-deposit';
import type { SolanaNetworkRepository } from '../repository/solana-network-repository';
import { createAwaitDepositConfirmationUseCase } from './await-deposit-confirmation-usecase';

type Reply = Result<SignatureStatus, AppError>;

const landed = (commitment: 'processed' | 'confirmed' | 'finalized', failed = false): Reply =>
  ok({ type: 'landed', commitment, failed });

function setUp(replies: Reply[], { onSleep }: { onSleep?: (ms: number) => number } = {}) {
  let clock = 0;
  const sleeps: number[] = [];
  const polled: string[] = [];

  const solanaNetworkRepository: SolanaNetworkRepository = {
    getRecentBlockhash: async () => err(unknownError('unused')),
    getTokenBalance: async () => ok(0n),
    getSignatureStatus: async (signature) => {
      polled.push(signature);
      return replies.length > 1 ? (replies.shift() as Reply) : (replies[0] as Reply);
    },
  };

  const useCase = createAwaitDepositConfirmationUseCase({
    solanaNetworkRepository,
    now: () => clock,
    sleep: async (ms) => {
      sleeps.push(ms);
      clock += onSleep === undefined ? ms : onSleep(ms);
    },
  });

  return { useCase, sleeps, polled };
}

describe('awaitDepositConfirmation', () => {
  it.each(['confirmed', 'finalized'] as const)(
    'reports a deposit %s without an error as confirmed',
    async (commitment) => {
      const { useCase, polled } = setUp([landed(commitment)]);

      expect(await useCase.execute('sig')).toEqual(ok('confirmed'));
      expect(polled).toEqual(['sig']);
    },
  );

  it('reports a deposit that landed with an error as failed', async () => {
    const { useCase } = setUp([landed('confirmed', true)]);

    expect(await useCase.execute('sig')).toEqual(ok('failed'));
  });

  it('keeps waiting through an unknown signature, a processed one and a failed read', async () => {
    const { useCase, polled } = setUp([
      ok({ type: 'unknown' }),
      landed('processed'),
      err(unknownError('rate limited')),
      landed('processed', true),
      landed('confirmed'),
    ]);

    expect(await useCase.execute('sig')).toEqual(ok('confirmed'));
    expect(polled).toHaveLength(5);
  });

  it('asks every two seconds', async () => {
    const { useCase, sleeps } = setUp([ok({ type: 'unknown' }), landed('confirmed')]);

    await useCase.execute('sig');

    expect(sleeps).toEqual([2000]);
  });

  it('gives up as pending after thirty seconds', async () => {
    const { useCase, polled } = setUp([ok({ type: 'unknown' })]);

    expect(await useCase.execute('sig')).toEqual(ok('pending'));
    expect(polled).toHaveLength(16);
  });

  it('measures the deadline in wall-clock time, so a long background pause still ends it', async () => {
    const { useCase, polled } = setUp([ok({ type: 'unknown' })], { onSleep: () => 60_000 });

    expect(await useCase.execute('sig')).toEqual(ok('pending'));
    expect(polled).toHaveLength(2);
  });

  it('stops when the page that asked is gone', async () => {
    const controller = new AbortController();
    controller.abort();
    const { useCase, polled } = setUp([ok({ type: 'unknown' })]);

    expect(await useCase.execute('sig', controller.signal)).toEqual(err(cancelled()));
    expect(polled).toEqual([]);
  });
});
