import {
  ErrorCode,
  rateLimited,
  serverError,
  unknownError,
  type AppError,
} from '@/core/errors/app-error';
import { err, ok, type Result } from '@/core/result/result';
import { unparseableResponse } from '@/test/unparseable-response';
import type { YieldTarget } from '../entity/yield-entity';
import type {
  SignedYieldMove,
  YieldBroadcastStatus,
  YieldInitiation,
  YieldMoveRequest,
} from '../entity/yield-move';
import type { YieldQuote } from '../entity/yield-quote';
import type { YieldSigningOutcome, YieldSigningPort } from '../port/yield-signing-port';
import type { YieldRepository } from '../repository/yield-repository';
import { createPrepareYieldMoveUseCase } from './prepare-yield-move-usecase';

const MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const TARGET: YieldTarget = {
  vaultId: 'vault-usdc',
  tokenSymbol: 'USDC',
  tokenMint: MINT,
  provider: 'jupiter',
};
const DEPOSIT: YieldQuote = {
  kind: 'deposit',
  amountMinor: 1_500,
  feeMinor: 25,
  totalMinor: 1_525,
  currency: 'USD',
};
const WITHDRAWAL: YieldQuote = {
  kind: 'withdrawal',
  amountMinor: 1_500,
  feeMinor: 25,
  totalMinor: 1_475,
  currency: 'USD',
};

function initiation(n: number, echo?: YieldInitiation['echo']): YieldInitiation {
  return {
    challenge: {
      challengeId: `challenge-${String(n)}`,
      userToken: `token-${String(n)}`,
      encryptionKey: `key-${String(n)}`,
    },
    transactionId: `transaction-${String(n)}`,
    ...(echo === undefined ? {} : { echo }),
  };
}

function signature(bytes: string): Result<YieldSigningOutcome, AppError> {
  return ok({
    type: 'settled',
    status: 'complete',
    resultType: 'signature',
    signedTransaction: bytes,
  });
}

type Script = {
  initiate?: ((n: number) => Promise<Result<YieldInitiation, AppError>>)[];
  sign?: ((challengeId: string) => Promise<Result<YieldSigningOutcome, AppError>>)[];
  broadcast?: () => Promise<Result<YieldBroadcastStatus, AppError>>;
};

function harness(script: Script = {}) {
  const initiated: YieldMoveRequest[] = [];
  const signed: string[] = [];
  const broadcasts: SignedYieldMove[] = [];

  const yieldRepository: YieldRepository = {
    getProducts: () => Promise.resolve(ok([])),
    quote: () => Promise.reject(new Error('not used')),
    initiate: (request) => {
      initiated.push(request);
      const n = initiated.length;
      const step = script.initiate?.[n - 1];

      return step === undefined ? Promise.resolve(ok(initiation(n))) : step(n);
    },
    broadcast: (move) => {
      broadcasts.push(move);

      return script.broadcast?.() ?? Promise.resolve(ok('succeeded'));
    },
  };
  const yieldSigningPort: YieldSigningPort = {
    sign: (challenge) => {
      signed.push(challenge.challengeId);
      const step = script.sign?.[signed.length - 1];

      return step === undefined
        ? Promise.resolve(signature(`signed-${challenge.challengeId}`))
        : step(challenge.challengeId);
    },
  };

  const useCase = createPrepareYieldMoveUseCase({ yieldRepository, yieldSigningPort });

  function prepared(quote: YieldQuote = DEPOSIT) {
    const result = useCase.prepare({ target: TARGET, quote });
    if (!result.ok) throw new Error('expected a prepared move');

    return result.value;
  }

  return { useCase, prepared, initiated, signed, broadcasts };
}

describe('prepare a yield move', () => {
  it('builds, signs and broadcasts exactly the move that was confirmed', async () => {
    const { prepared, initiated, signed, broadcasts } = harness();

    await expect(prepared().confirm()).resolves.toEqual({ type: 'succeeded' });

    expect(initiated).toEqual([
      { kind: 'deposit', amountMinor: 1_500, tokenSymbol: 'USDC', tokenMint: MINT },
    ]);
    expect(signed).toEqual(['challenge-1']);
    expect(broadcasts).toEqual([
      { signedTransaction: 'signed-challenge-1', transactionId: 'transaction-1' },
    ]);
  });

  it('builds a withdrawal as a withdrawal', async () => {
    const { prepared, initiated } = harness();

    await prepared(WITHDRAWAL).confirm();

    expect(initiated).toEqual([
      { kind: 'withdrawal', amountMinor: 1_500, tokenSymbol: 'USDC', tokenMint: MINT },
    ]);
  });

  it('builds afresh after a cancel, and pairs the new signature with the new transaction', async () => {
    const { prepared, initiated, broadcasts } = harness({
      sign: [() => Promise.resolve(ok({ type: 'cancelled' }))],
    });
    const move = prepared();

    await expect(move.confirm()).resolves.toEqual({ type: 'cancelled' });
    await expect(move.confirm()).resolves.toEqual({ type: 'succeeded' });

    expect(initiated).toHaveLength(2);
    expect(broadcasts).toEqual([
      { signedTransaction: 'signed-challenge-2', transactionId: 'transaction-2' },
    ]);
  });

  it('lets a move that failed to sign be confirmed again', async () => {
    const { prepared, broadcasts } = harness({
      sign: [() => Promise.resolve(ok({ type: 'failed', reason: 'incorrect-pin' }))],
    });
    const move = prepared();

    await expect(move.confirm()).resolves.toEqual({ type: 'notSent', reason: 'incorrectPin' });
    await expect(move.confirm()).resolves.toEqual({ type: 'succeeded' });
    expect(broadcasts).toHaveLength(1);
  });

  it('refuses a second confirm while the first is still signing', async () => {
    let finish: (value: Result<YieldSigningOutcome, AppError>) => void = () => undefined;
    const { prepared, signed } = harness({
      sign: [
        () =>
          new Promise((resolve) => {
            finish = resolve;
          }),
      ],
    });
    const move = prepared();

    const first = move.confirm();
    await expect(move.confirm()).resolves.toEqual({ type: 'notSent', reason: 'invalidRequest' });
    await Promise.resolve();
    finish(signature('late'));

    await expect(first).resolves.toEqual({ type: 'succeeded' });
    expect(signed).toEqual(['challenge-1']);
  });

  it.each<[string, NonNullable<Script['broadcast']>]>([
    ['succeeded', () => Promise.resolve(ok('succeeded'))],
    ['failed on chain', () => Promise.resolve(ok('failed'))],
    ['unanswered', () => Promise.resolve(err(serverError(502)))],
  ])('never confirms again once broadcast (%s)', async (_case, broadcast) => {
    const { prepared, broadcasts } = harness({ broadcast });
    const move = prepared();

    await move.confirm();
    await expect(move.confirm()).resolves.toEqual({ type: 'notSent', reason: 'invalidRequest' });
    expect(broadcasts).toHaveLength(1);
  });

  it('abandons a signature that took too long, and never broadcasts it', async () => {
    jest.useFakeTimers();
    const { useCase, broadcasts } = harness({ sign: [() => new Promise(() => undefined)] });
    const prepared = useCase.prepare({ target: TARGET, quote: DEPOSIT });
    if (!prepared.ok) throw new Error('expected a prepared move');

    const answer = prepared.value.confirm();
    await jest.advanceTimersByTimeAsync(3 * 60_000);

    await expect(answer).resolves.toEqual({ type: 'notSent', reason: 'expired' });
    expect(broadcasts).toEqual([]);
    jest.useRealTimers();
  });

  it('reads a result that is not a signature as unconfirmed, broadcasting nothing', async () => {
    const { prepared, broadcasts } = harness({
      sign: [
        () => Promise.resolve(ok({ type: 'settled', status: 'complete', resultType: 'other' })),
      ],
    });
    const move = prepared();

    await expect(move.confirm()).resolves.toEqual({ type: 'unconfirmed' });
    await expect(move.confirm()).resolves.toEqual({ type: 'notSent', reason: 'invalidRequest' });
    expect(broadcasts).toEqual([]);
  });

  it('reads a refusal to build the move as rejected', async () => {
    const { prepared } = harness({
      initiate: [() => Promise.resolve(err({ ...serverError(400), code: ErrorCode.InvalidInput }))],
    });

    await expect(prepared().confirm()).resolves.toEqual({ type: 'notSent', reason: 'rejected' });
  });

  it('reads a rate limit while building it as rate limited, and lets it be tried again later', async () => {
    const { prepared, signed } = harness({
      initiate: [() => Promise.resolve(err(rateLimited(60)))],
    });
    const move = prepared();

    await expect(move.confirm()).resolves.toEqual({ type: 'notSent', reason: 'rateLimited' });
    expect(signed).toEqual([]);
    await expect(move.confirm()).resolves.toEqual({ type: 'succeeded' });
  });

  it.each([
    ['a server error', serverError(503)],
    ['an answer the app could not read', unparseableResponse()],
  ])('reads %s while building it as failed, and lets it be tried again', async (_case, failure) => {
    const { prepared } = harness({ initiate: [() => Promise.resolve(err(failure))] });
    const move = prepared();

    await expect(move.confirm()).resolves.toEqual({ type: 'notSent', reason: 'failed' });
    await expect(move.confirm()).resolves.toEqual({ type: 'succeeded' });
  });

  it.each([
    ['a different amount', { amountMinor: 1_400 }],
    ['a higher fee', { feeMinor: 30 }],
    ['a larger debit', { totalMinor: 1_530 }],
  ])('refuses to sign a move built with %s than was confirmed', async (_case, echo) => {
    const { prepared, signed } = harness({
      initiate: [() => Promise.resolve(ok(initiation(1, echo)))],
    });

    await expect(prepared().confirm()).resolves.toEqual({
      type: 'notSent',
      reason: 'quoteChanged',
    });
    expect(signed).toEqual([]);
  });

  it('signs a move whose echoed figures match what was confirmed', async () => {
    const { prepared } = harness({
      initiate: [
        () =>
          Promise.resolve(
            ok(initiation(1, { amountMinor: 1_500, feeMinor: 25, totalMinor: 1_525 })),
          ),
      ],
    });

    await expect(prepared().confirm()).resolves.toEqual({ type: 'succeeded' });
  });

  it('reads a throw before the broadcast as not sent, and lets it be tried again', async () => {
    const { prepared } = harness({ initiate: [() => Promise.reject(new Error('boom'))] });
    const move = prepared();

    await expect(move.confirm()).resolves.toEqual({ type: 'notSent', reason: 'failed' });
    await expect(move.confirm()).resolves.toEqual({ type: 'succeeded' });
  });

  it('reads a throw during the broadcast as unconfirmed, and never confirms again', async () => {
    const { prepared } = harness({ broadcast: () => Promise.reject(new Error('boom')) });
    const move = prepared();

    await expect(move.confirm()).resolves.toEqual({ type: 'unconfirmed' });
    await expect(move.confirm()).resolves.toEqual({ type: 'notSent', reason: 'invalidRequest' });
  });

  it('says when it starts broadcasting, and broadcasts even if the listener throws', async () => {
    const steps: string[] = [];
    const { prepared, broadcasts } = harness();

    await prepared().confirm({
      onBroadcasting: () => {
        steps.push('broadcasting');
        throw new Error('listener bug');
      },
    });

    expect(steps).toEqual(['broadcasting']);
    expect(broadcasts).toHaveLength(1);
  });

  it.each<[string, YieldTarget, YieldQuote]>([
    ['a token other than USDC', { ...TARGET, tokenSymbol: 'USDT' }, DEPOSIT],
    ['a vault with no mint', { ...TARGET, tokenMint: '' }, DEPOSIT],
    ['an amount that is not whole cents', TARGET, { ...DEPOSIT, amountMinor: 10.5 }],
    ['nothing at all', TARGET, { ...DEPOSIT, amountMinor: 0 }],
  ])('refuses to prepare %s', (_case, target, quote) => {
    const { useCase } = harness();

    expect(useCase.prepare({ target, quote }).ok).toBe(false);
  });

  it('refuses a signer that never ran as not sent', async () => {
    const { prepared, broadcasts } = harness({
      sign: [() => Promise.resolve(err(unknownError('no sdk')))],
    });

    await expect(prepared().confirm()).resolves.toEqual({ type: 'notSent', reason: 'failed' });
    expect(broadcasts).toEqual([]);
  });
});
