import { http, HttpResponse } from 'msw';
import { ErrorCode } from '@/core/errors/app-error';
import { createHttpClient } from '@/core/network/http-client';
import { server, withMockServer } from '@/test/msw/server';
import { createYieldRemoteDataSource } from './yield-remote-datasource';

const BASE_URL = 'https://api.test';
const MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

withMockServer();

function dataSource(timeouts?: Parameters<typeof createYieldRemoteDataSource>[1]) {
  return createYieldRemoteDataSource(createHttpClient({ baseUrl: BASE_URL }), timeouts);
}

describe('getOptions', () => {
  it('reads the vaults on offer, grouped by token', async () => {
    server.use(
      http.get(`${BASE_URL}/yield/options`, () =>
        HttpResponse.json({
          data: [
            {
              address: MINT,
              balance: '10',
              symbol: 'USDC',
              vaults: [{ address: 'v', stakeable: true }],
            },
          ],
        }),
      ),
    );

    expect(await dataSource().getOptions()).toEqual({
      ok: true,
      value: [
        {
          address: MINT,
          symbol: 'USDC',
          vaults: [{ address: 'v', stakeable: true }],
        },
      ],
    });
  });

  it('refuses a rate it cannot read as a number', async () => {
    server.use(
      http.get(`${BASE_URL}/yield/options`, () =>
        HttpResponse.json({ data: [{ symbol: 'USDC', vaults: [{ totalRate: '4.1' }] }] }),
      ),
    );

    const result = await dataSource().getOptions();

    expect(result.ok ? undefined : result.error.code).toBe(ErrorCode.InvalidInput);
  });
});

describe('quotes', () => {
  it.each([
    ['deposit', '/yield/deposit/quote'],
    ['withdrawal', '/yield/withdraw/quote'],
  ] as const)('asks for a %s quote in cents', async (kind, path) => {
    let asked: URL | undefined;
    server.use(
      http.get(`${BASE_URL}${path}`, ({ request }) => {
        asked = new URL(request.url);

        return HttpResponse.json({ data: {} });
      }),
    );

    const result =
      kind === 'deposit'
        ? await dataSource().getDepositQuote(137)
        : await dataSource().getWithdrawalQuote(137);

    expect(result.ok).toBe(true);
    expect(asked?.searchParams.get('amount')).toBe('137');
  });

  it('refuses to ask about an amount that is not whole cents', async () => {
    await expect(dataSource().getDepositQuote(1.5)).rejects.toThrow(RangeError);
  });
});

describe('initiate', () => {
  it.each([
    ['deposit', '/yield/deposit', '/yield/withdraw'],
    ['withdrawal', '/yield/withdraw', '/yield/deposit'],
  ] as const)(
    'posts a %s to its own endpoint, with exactly the move asked for',
    async (kind, path, other) => {
      const bodies: unknown[] = [];
      let wrongEndpoint = false;
      server.use(
        http.post(`${BASE_URL}${path}`, async ({ request }) => {
          bodies.push(await request.json());

          return HttpResponse.json({
            data: { challenge_id: 'c', user_token: 'u', encryption_key: 'k', transaction_id: 't' },
          });
        }),
        http.post(`${BASE_URL}${other}`, () => {
          wrongEndpoint = true;

          return HttpResponse.json({});
        }),
      );

      const result = await dataSource().initiate(kind, {
        amount: 1_500,
        token: 'USDC',
        token_id: MINT,
      });

      expect(result.ok).toBe(true);
      expect(bodies).toEqual([{ amount: 1_500, token: 'USDC', token_id: MINT }]);
      expect(wrongEndpoint).toBe(false);
    },
  );
});

describe('broadcast', () => {
  it('posts the signed transaction under its transaction id', async () => {
    const bodies: unknown[] = [];
    server.use(
      http.post(`${BASE_URL}/yield/broadcast`, async ({ request }) => {
        bodies.push(await request.json());

        return HttpResponse.json({ data: { status: 'success' } });
      }),
    );

    await expect(
      dataSource().broadcast({ signed_transaction: 'c2lnbmVk', transaction_id: 't' }),
    ).resolves.toEqual({ ok: true, value: { status: 'success' } });
    expect(bodies).toEqual([{ signed_transaction: 'c2lnbmVk', transaction_id: 't' }]);
  });

  it('sends a broadcast once, even when the server fails', async () => {
    let hits = 0;
    server.use(
      http.post(`${BASE_URL}/yield/broadcast`, () => {
        hits += 1;

        return HttpResponse.json({ error: true }, { status: 502 });
      }),
    );

    const result = await dataSource().broadcast({ signed_transaction: 's', transaction_id: 't' });

    expect(result.ok).toBe(false);
    expect(hits).toBe(1);
  });

  it('gives up on a broadcast that never answers within its bound', async () => {
    server.use(http.post(`${BASE_URL}/yield/broadcast`, () => new Promise(() => undefined)));

    const result = await dataSource({ broadcastTimeoutMs: 20 }).broadcast({
      signed_transaction: 's',
      transaction_id: 't',
    });

    expect(result.ok).toBe(false);
  });
});
