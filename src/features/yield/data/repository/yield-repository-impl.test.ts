import { serverError } from '@/core/errors/app-error';
import { err, ok } from '@/core/result/result';
import type { YieldRemoteDataSource } from '../datasource/yield-remote-datasource';
import { createYieldRepositoryImpl } from './yield-repository-impl';

const MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

function remote(overrides: Partial<YieldRemoteDataSource> = {}): YieldRemoteDataSource {
  return {
    getOptions: () => Promise.resolve(ok([])),
    getDepositQuote: () =>
      Promise.resolve(
        ok({ stake_amount_usdc: 15, estimated_gas_usdc: 0.25, total_debit_usdc: 15.25 }),
      ),
    getWithdrawalQuote: () =>
      Promise.resolve(
        ok({ withdraw_amount_usdc: 15, estimated_gas_usdc: 0.25, net_received_usdc: 14.75 }),
      ),
    initiate: () =>
      Promise.resolve(
        ok({ challenge_id: 'c', user_token: 'u', encryption_key: 'k', transaction_id: 't' }),
      ),
    broadcast: () => Promise.resolve(ok({ status: 'success' })),
    ...overrides,
  };
}

describe('createYieldRepositoryImpl', () => {
  it('offers every vault as a product', async () => {
    const repository = createYieldRepositoryImpl({
      remote: remote({
        getOptions: () =>
          Promise.resolve(
            ok([
              {
                address: MINT,
                symbol: 'USDC',
                vaults: [{ address: 'v', totalRate: 4.1, stakeable: true }],
              },
            ]),
          ),
      }),
    });

    await expect(repository.getProducts()).resolves.toEqual(
      ok([
        {
          id: 'v',
          tokenSymbol: 'USDC',
          tokenMint: MINT,
          apyPercent: 4.1,
          provider: 'jupiter',
          isStakeable: true,
        },
      ]),
    );
  });

  it.each([
    ['deposit', 1_525],
    ['withdrawal', 1_475],
  ] as const)('prices a %s', async (kind, totalMinor) => {
    const quote = await createYieldRepositoryImpl({ remote: remote() }).quote({
      kind,
      amountMinor: 1_500,
    });

    expect(quote).toEqual(
      ok({ kind, amountMinor: 1_500, feeMinor: 25, totalMinor, currency: 'USD' }),
    );
  });

  it('refuses a quote it cannot read', async () => {
    const repository = createYieldRepositoryImpl({
      remote: remote({
        getDepositQuote: () =>
          Promise.resolve(
            ok({
              stake_amount_usdc: 15,
              estimated_gas_usdc: undefined,
              total_debit_usdc: undefined,
            }),
          ),
      }),
    });

    const quote = await repository.quote({ kind: 'deposit', amountMinor: 1_500 });

    expect(quote.ok).toBe(false);
  });

  it('builds a move with its amount, token and mint, and reads the challenge back', async () => {
    const bodies: unknown[] = [];
    const repository = createYieldRepositoryImpl({
      remote: remote({
        initiate: (kind, body) => {
          bodies.push({ kind, body });

          return Promise.resolve(
            ok({ challenge_id: 'c', user_token: 'u', encryption_key: 'k', transaction_id: 't' }),
          );
        },
      }),
    });

    const initiation = await repository.initiate({
      kind: 'withdrawal',
      amountMinor: 1_500,
      tokenSymbol: 'USDC',
      tokenMint: MINT,
    });

    expect(bodies).toEqual([
      { kind: 'withdrawal', body: { amount: 1_500, token: 'USDC', token_id: MINT } },
    ]);
    expect(initiation).toEqual(
      ok({
        challenge: { challengeId: 'c', userToken: 'u', encryptionKey: 'k' },
        transactionId: 't',
      }),
    );
  });

  it('refuses an initiation missing any part of its challenge', async () => {
    const repository = createYieldRepositoryImpl({
      remote: remote({
        initiate: () =>
          Promise.resolve(
            ok({ challenge_id: 'c', user_token: '', encryption_key: 'k', transaction_id: 't' }),
          ),
      }),
    });

    const initiation = await repository.initiate({
      kind: 'deposit',
      amountMinor: 1_500,
      tokenSymbol: 'USDC',
      tokenMint: MINT,
    });

    expect(initiation.ok).toBe(false);
  });

  it('broadcasts under the move’s transaction id and reads how it settled', async () => {
    const bodies: unknown[] = [];
    const repository = createYieldRepositoryImpl({
      remote: remote({
        broadcast: (body) => {
          bodies.push(body);

          return Promise.resolve(ok({ status: 'success' }));
        },
      }),
    });

    await expect(
      repository.broadcast({ signedTransaction: 'c2lnbmVk', transactionId: 't' }),
    ).resolves.toEqual(ok('succeeded'));
    expect(bodies).toEqual([{ signed_transaction: 'c2lnbmVk', transaction_id: 't' }]);
  });

  it('passes a failure on untouched', async () => {
    const failure = serverError(503);
    const repository = createYieldRepositoryImpl({
      remote: remote({ getOptions: () => Promise.resolve(err(failure)) }),
    });

    await expect(repository.getProducts()).resolves.toEqual(err(failure));
  });
});
