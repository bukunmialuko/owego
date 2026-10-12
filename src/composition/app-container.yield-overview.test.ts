import { http, HttpResponse } from 'msw';
import { ok } from '@/core/result/result';
import { server, withMockServer } from '@/test/msw/server';
import { testAppConfig } from '@/test/test-config';
import { createComposedContainer } from './app-container';

withMockServer();

it('reads the yield overview, signed in', async () => {
  const authorizations: (string | null)[] = [];
  server.use(
    http.get(`${testAppConfig.apiBaseUrl}/yield/`, ({ request }) => {
      authorizations.push(request.headers.get('authorization'));

      return HttpResponse.json({
        error: false,
        data: {
          summary: {
            total_staked_usdc: 150.8547,
            total_deposited_usdc: 150,
            total_profit_usdc: 0.8547,
            total_profit_percent: 0.57,
            vault_count: 1,
          },
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
      });
    }),
    http.post(`${testAppConfig.apiBaseUrl}/user/push/token`, () =>
      HttpResponse.json({ data: null, status_code: 200, msg: '' }),
    ),
  );
  const container = createComposedContainer(testAppConfig);
  await container.cradle.tokenStore.write({ access: 'owego-access', refresh: 'owego-refresh' });
  await container.cradle.registerPushTokenUseCase.execute();

  const overview = await container.cradle.yieldOverviewRepository.getOverview();

  expect(authorizations).toEqual(['Bearer owego-access']);
  expect(overview).toEqual(
    ok({
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
    }),
  );
});
