import { ErrorCode, serverError, type AppError } from '@/core/errors/app-error';
import { err, ok, type Result } from '@/core/result/result';
import { unparseableResponse } from '@/test/unparseable-response';
import type { YieldOverviewRepository } from '@/core/yield/yield-overview';
import type { YieldTarget } from '../entity/yield-entity';
import type { YieldQuote } from '../entity/yield-quote';
import type { YieldRepository } from '../repository/yield-repository';
import { createQuoteYieldWithdrawalUseCase } from './quote-yield-withdrawal-usecase';

const TARGET: YieldTarget = {
  vaultId: 'vault-usdc',
  tokenSymbol: 'USDC',
  tokenMint: 'usdc-mint',
  provider: 'jupiter',
};

function withdrawalQuote(amountMinor: number, feeMinor: number): YieldQuote {
  return {
    kind: 'withdrawal',
    amountMinor,
    feeMinor,
    totalMinor: amountMinor - feeMinor,
    currency: 'USD',
  };
}

function build({
  positionMinor = 513_698,
  answer = (amountMinor: number): Result<YieldQuote, AppError> =>
    ok(withdrawalQuote(amountMinor, 25)),
}: {
  positionMinor?: number;
  answer?: (amountMinor: number) => Result<YieldQuote, AppError>;
} = {}) {
  const quoted: { kind: string; amountMinor: number }[] = [];
  const yieldRepository: YieldRepository = {
    getProducts: () => Promise.resolve(ok([])),
    quote: (request) => {
      quoted.push(request);

      return Promise.resolve(answer(request.amountMinor));
    },
    initiate: () => Promise.reject(new Error('not used')),
    broadcast: () => Promise.reject(new Error('not used')),
  };
  const yieldOverviewRepository: YieldOverviewRepository = {
    getOverview: () =>
      Promise.resolve(
        ok({
          valueMinor: positionMinor,
          currency: 'USD',
          positions: [
            {
              id: 'vault-usdc',
              tokenSymbol: 'USDC',
              tokenMint: 'usdc-mint',
              valueMinor: positionMinor,
              currency: 'USD',
            },
          ],
        }),
      ),
  };

  return {
    useCase: createQuoteYieldWithdrawalUseCase({ yieldRepository, yieldOverviewRepository }),
    quoted,
  };
}

describe('quote a yield withdrawal', () => {
  it('quotes what reaches the wallet once the fee is taken', async () => {
    const { useCase, quoted } = build();

    await expect(useCase.execute({ target: TARGET, amountMinor: 1_500 })).resolves.toEqual(
      ok({ type: 'quoted', quote: withdrawalQuote(1_500, 25) }),
    );
    expect(quoted).toEqual([{ kind: 'withdrawal', amountMinor: 1_500 }]);
  });

  it('refuses more than the position holds without asking for a quote', async () => {
    const { useCase, quoted } = build({ positionMinor: 1_000 });

    await expect(useCase.execute({ target: TARGET, amountMinor: 1_001 })).resolves.toEqual(
      ok({ type: 'exceedsPosition' }),
    );
    expect(quoted).toEqual([]);
  });

  it.each([25, 20])(
    'refuses a withdrawal of %p cents that the fee would swallow',
    async (amountMinor) => {
      const { useCase } = build();

      await expect(useCase.execute({ target: TARGET, amountMinor })).resolves.toEqual(
        ok({ type: 'notAboveFee', feeMinor: 25 }),
      );
    },
  );

  it('reads a backend refusal as refused', async () => {
    const { useCase } = build({
      answer: () => err({ ...serverError(400), code: ErrorCode.InvalidInput }),
    });

    await expect(useCase.execute({ target: TARGET, amountMinor: 1_500 })).resolves.toEqual(
      ok({ type: 'refused' }),
    );
  });

  it.each([
    ['a server error', serverError(503)],
    ['a quote the app could not read', unparseableResponse()],
  ])('passes on %s rather than calling it a refusal', async (_case, failure) => {
    const { useCase } = build({ answer: () => err(failure) });

    await expect(useCase.execute({ target: TARGET, amountMinor: 1_500 })).resolves.toEqual(
      err(failure),
    );
  });

  it('refuses a position it can no longer find', async () => {
    const { useCase } = build();

    await expect(
      useCase.execute({ target: { ...TARGET, vaultId: 'gone' }, amountMinor: 1_500 }),
    ).resolves.toEqual(ok({ type: 'exceedsPosition' }));
  });
});
