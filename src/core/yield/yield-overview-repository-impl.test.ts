import { http, HttpResponse } from 'msw';
import { ErrorCode } from '@/core/errors/app-error';
import { createHttpClient } from '@/core/network/http-client';
import { server, withMockServer } from '@/test/msw/server';
import { createYieldOverviewRepositoryImpl } from './yield-overview-repository-impl';

const BASE_URL = 'https://api.test';
const OVERVIEW_URL = `${BASE_URL}/yield/`;

withMockServer();

function repository() {
  return createYieldOverviewRepositoryImpl(createHttpClient({ baseUrl: BASE_URL }));
}

const SUMMARY = {
  total_staked_usdc: 150.8547,
  total_deposited_usdc: 150,
  total_profit_usdc: 0.8547,
  total_profit_percent: 0.57,
};

describe('createYieldOverviewRepositoryImpl', () => {
  it('reports the yield overview', async () => {
    server.use(
      http.get(OVERVIEW_URL, () =>
        HttpResponse.json({
          error: false,
          data: {
            summary: { ...SUMMARY, vault_count: 1 },
            products: [
              {
                vault_address: 'vault-usdc',
                token: 'USDC',
                token_id: 'usdc-mint',
                total_rate: 4.1,
                staked_usdc: 150.8547,
                deposited_usdc: 150,
                profit_usdc: 0.8547,
                profit_percent: 0.57,
              },
            ],
          },
        }),
      ),
    );

    expect(await repository().getOverview()).toEqual({
      ok: true,
      value: {
        valueMinor: 15_085,
        currency: 'USD',
        change: { percent: 0.57, amountMinor: 85 },
        positions: [
          {
            id: 'vault-usdc',
            tokenSymbol: 'USDC',
            tokenMint: 'usdc-mint',
            apyPercent: 4.1,
            contributedMinor: 15_000,
            valueMinor: 15_085,
            currency: 'USD',
            change: { percent: 0.57, amountMinor: 85 },
          },
        ],
      },
    });
  });

  it('reports each vault a funded account holds, USDT alongside USDC', async () => {
    server.use(
      http.get(OVERVIEW_URL, () =>
        HttpResponse.json({
          error: false,
          data: {
            summary: { ...SUMMARY, vault_count: 2 },
            products: [
              {
                vault_address: '9BEcn9aPEmhSPbPQeFGjidRiEKki46fVQDyPpSQXPA2D',
                vault_symbol: 'jlUSDC',
                token: 'USDC',
                token_id: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
                decimals: 6,
                shares: '94052500',
                staked_usdc: 100.2547,
                deposited_usdc: 100.0,
                profit_usdc: 0.2547,
                profit_percent: 0.25,
                supply_rate: 3.76,
                rewards_rate: 0.34,
                total_rate: 4.1,
              },
              {
                vault_address: 'Cmn4v2wipYV41dkakDvCgFJpxhtaaKt11NyWV8pjSE8A',
                vault_symbol: 'jlUSDT',
                token: 'USDT',
                token_id: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
                decimals: 6,
                shares: '47500000',
                staked_usdc: 50.6,
                deposited_usdc: 50.0,
                profit_usdc: 0.6,
                profit_percent: 1.2,
                supply_rate: 3.77,
                rewards_rate: 0,
                total_rate: 3.77,
              },
            ],
          },
        }),
      ),
    );

    expect(await repository().getOverview()).toEqual({
      ok: true,
      value: {
        valueMinor: 15_085,
        currency: 'USD',
        change: { percent: 0.57, amountMinor: 85 },
        positions: [
          {
            id: '9BEcn9aPEmhSPbPQeFGjidRiEKki46fVQDyPpSQXPA2D',
            tokenSymbol: 'USDC',
            tokenMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
            apyPercent: 4.1,
            contributedMinor: 10_000,
            valueMinor: 10_025,
            currency: 'USD',
            change: { percent: 0.25, amountMinor: 25 },
          },
          {
            id: 'Cmn4v2wipYV41dkakDvCgFJpxhtaaKt11NyWV8pjSE8A',
            tokenSymbol: 'USDT',
            tokenMint: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
            apyPercent: 3.77,
            contributedMinor: 5_000,
            valueMinor: 5_060,
            currency: 'USD',
            change: { percent: 1.2, amountMinor: 60 },
          },
        ],
      },
    });
  });

  it('refuses an overview that carries no summary rather than reporting zero', async () => {
    server.use(http.get(OVERVIEW_URL, () => HttpResponse.json({ error: false, data: {} })));

    const result = await repository().getOverview();

    expect(result.ok ? undefined : result.error.code).toBe(ErrorCode.Unknown);
  });

  it('refuses a total it cannot read as a number', async () => {
    server.use(
      http.get(OVERVIEW_URL, () =>
        HttpResponse.json({ data: { summary: { ...SUMMARY, total_staked_usdc: '150.85' } } }),
      ),
    );

    const result = await repository().getOverview();

    expect(result.ok ? undefined : result.error.code).toBe(ErrorCode.InvalidInput);
  });

  it('passes a failed request on as an error', async () => {
    server.use(http.get(OVERVIEW_URL, () => HttpResponse.json({ error: true }, { status: 400 })));

    expect((await repository().getOverview()).ok).toBe(false);
  });
});
