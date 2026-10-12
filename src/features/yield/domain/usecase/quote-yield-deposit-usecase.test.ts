import { ErrorCode, serverError, type AppError } from '@/core/errors/app-error';
import { err, ok, type Result } from '@/core/result/result';
import { unparseableResponse } from '@/test/unparseable-response';
import type { YieldProduct, YieldTarget } from '../entity/yield-entity';
import type { YieldQuote } from '../entity/yield-quote';
import type { YieldRepository } from '../repository/yield-repository';
import type { LoadYieldProductsUseCase } from './load-yield-products-usecase';
import { createQuoteYieldDepositUseCase } from './quote-yield-deposit-usecase';

const TARGET: YieldTarget = {
  vaultId: 'vault-usdc',
  tokenSymbol: 'USDC',
  tokenMint: 'usdc-mint',
  provider: 'jupiter',
};

function product(walletBalanceMinor: number | undefined): YieldProduct {
  return {
    id: 'vault-usdc',
    tokenSymbol: 'USDC',
    tokenMint: 'usdc-mint',
    provider: 'jupiter',
    isStakeable: true,
    ...(walletBalanceMinor === undefined ? {} : { walletBalanceMinor }),
  };
}

const INVALID_INPUT: AppError = { ...serverError(400), code: ErrorCode.InvalidInput };

function depositQuote(amountMinor: number, feeMinor: number): YieldQuote {
  return {
    kind: 'deposit',
    amountMinor,
    feeMinor,
    totalMinor: amountMinor + feeMinor,
    currency: 'USD',
  };
}

function walletHolding(balanceMinor: number | undefined): LoadYieldProductsUseCase {
  return { execute: () => Promise.resolve(ok([product(balanceMinor)])) };
}

function backend({
  balanceMinor,
  fee,
  refuses = () => false,
}: {
  balanceMinor: number | undefined;
  fee: (amountMinor: number) => number;
  refuses?: (amountMinor: number) => boolean;
}) {
  const quoted: number[] = [];
  const repository: YieldRepository = {
    getProducts: () => Promise.reject(new Error('the balance is the wallet’s, not the options’')),
    quote: ({ amountMinor }): Promise<Result<YieldQuote, AppError>> => {
      quoted.push(amountMinor);

      return Promise.resolve(
        refuses(amountMinor) ? err(INVALID_INPUT) : ok(depositQuote(amountMinor, fee(amountMinor))),
      );
    },
    initiate: () => Promise.reject(new Error('not used')),
    broadcast: () => Promise.reject(new Error('not used')),
  };

  return {
    useCase: createQuoteYieldDepositUseCase({
      yieldRepository: repository,
      loadYieldProducts: walletHolding(balanceMinor),
    }),
    quoted,
  };
}

describe('quote a yield deposit', () => {
  it('quotes an amount whose fee fits the balance as it is', async () => {
    const { useCase } = backend({ balanceMinor: 100_000, fee: () => 25 });

    await expect(useCase.execute({ target: TARGET, amountMinor: 1_500 })).resolves.toEqual(
      ok({ type: 'quoted', quote: depositQuote(1_500, 25) }),
    );
  });

  it('quotes an amount that fits exactly', async () => {
    const { useCase } = backend({ balanceMinor: 100_000, fee: () => 5_000 });

    await expect(useCase.execute({ target: TARGET, amountMinor: 95_000 })).resolves.toEqual(
      ok({ type: 'quoted', quote: depositQuote(95_000, 5_000) }),
    );
  });

  it('reduces an amount by the fee so both fit the balance, and re-quotes it', async () => {
    const { useCase, quoted } = backend({ balanceMinor: 100_000, fee: () => 5_000 });

    await expect(useCase.execute({ target: TARGET, amountMinor: 100_000 })).resolves.toEqual(
      ok({ type: 'adjusted', quote: depositQuote(95_000, 5_000), requestedMinor: 100_000 }),
    );
    expect(quoted).toEqual([100_000, 95_000]);
  });

  it('fits again when the fee moves with the amount', async () => {
    const { useCase } = backend({
      balanceMinor: 100_000,
      fee: (amount) => (amount === 100_000 ? 5_000 : amount === 95_000 ? 5_100 : 5_100),
    });

    await expect(useCase.execute({ target: TARGET, amountMinor: 100_000 })).resolves.toEqual(
      ok({ type: 'adjusted', quote: depositQuote(94_900, 5_100), requestedMinor: 100_000 }),
    );
  });

  it('passes on a refusal the balance does not explain, rather than raising the amount', async () => {
    const { useCase, quoted } = backend({
      balanceMinor: 100_000,
      fee: () => 25,
      refuses: (amount) => amount === 50_000,
    });

    await expect(useCase.execute({ target: TARGET, amountMinor: 50_000 })).resolves.toEqual(
      err(INVALID_INPUT),
    );
    expect(quoted).toEqual([50_000, 100]);
  });

  it('says so when the balance cannot even cover the fee', async () => {
    const { useCase } = backend({ balanceMinor: 20, fee: () => 25 });

    await expect(useCase.execute({ target: TARGET, amountMinor: 20 })).resolves.toEqual(
      ok({ type: 'feeExceedsBalance', feeMinor: 25 }),
    );
  });

  it('refuses more than the wallet holds without asking for a quote', async () => {
    const { useCase, quoted } = backend({ balanceMinor: 1_000, fee: () => 25 });

    await expect(useCase.execute({ target: TARGET, amountMinor: 1_001 })).resolves.toEqual(
      ok({ type: 'exceedsBalance' }),
    );
    expect(quoted).toEqual([]);
  });

  it('will not fit against a balance it could not read', async () => {
    const { useCase, quoted } = backend({ balanceMinor: undefined, fee: () => 25 });

    await expect(useCase.execute({ target: TARGET, amountMinor: 1_000 })).resolves.toEqual(
      ok({ type: 'unknownBalance' }),
    );
    expect(quoted).toEqual([]);
  });

  it('gives up on a fee that never settles inside the balance', async () => {
    let fee = 5_000;
    const { useCase } = backend({
      balanceMinor: 100_000,
      fee: () => {
        fee += 100;

        return fee;
      },
    });

    await expect(useCase.execute({ target: TARGET, amountMinor: 100_000 })).resolves.toEqual(
      ok({ type: 'noFit' }),
    );
  });

  it('learns the fee from a small quote when the backend refuses an amount at the balance', async () => {
    const { useCase, quoted } = backend({
      balanceMinor: 100_000,
      fee: () => 5_000,
      refuses: (amount) => amount === 100_000,
    });

    await expect(useCase.execute({ target: TARGET, amountMinor: 100_000 })).resolves.toEqual(
      ok({ type: 'adjusted', quote: depositQuote(95_000, 5_000), requestedMinor: 100_000 }),
    );
    expect(quoted).toEqual([100_000, 100, 95_000]);
  });

  it.each([
    ['a server error', serverError(503)],
    ['a quote the app could not read', unparseableResponse()],
  ])('passes on %s without probing the fee', async (_case, failure) => {
    const quoted: number[] = [];
    const repository: YieldRepository = {
      getProducts: () => Promise.reject(new Error('not used')),
      quote: ({ amountMinor }) => {
        quoted.push(amountMinor);
        return Promise.resolve(err(failure));
      },
      initiate: () => Promise.reject(new Error('not used')),
      broadcast: () => Promise.reject(new Error('not used')),
    };

    await expect(
      createQuoteYieldDepositUseCase({
        yieldRepository: repository,
        loadYieldProducts: walletHolding(100_000),
      }).execute({
        target: TARGET,
        amountMinor: 100_000,
      }),
    ).resolves.toEqual(err(failure));
    expect(quoted).toEqual([100_000]);
  });

  it('refuses an amount that is not a whole number of cents', async () => {
    const { useCase, quoted } = backend({ balanceMinor: 100_000, fee: () => 25 });

    const result = await useCase.execute({ target: TARGET, amountMinor: 10.5 });

    expect(result.ok).toBe(false);
    expect(quoted).toEqual([]);
  });
});
