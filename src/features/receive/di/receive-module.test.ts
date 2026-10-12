import { http, HttpResponse } from 'msw';
import { transact } from '@solana-mobile/mobile-wallet-adapter-protocol';
import { createComposedContainer } from '@/composition/app-container';
import { server, withMockServer } from '@/test/msw/server';
import { testAppConfig } from '@/test/test-config';

withMockServer();

describe('receive module', () => {
  it('never sends the owego bearer to the Solana RPC host, even while signed in', async () => {
    const backendAuthorizations: (string | null)[] = [];
    const authorizations: (string | null)[] = [];
    server.use(
      http.post(`${testAppConfig.apiBaseUrl}/user/push/token`, ({ request }) => {
        backendAuthorizations.push(request.headers.get('authorization'));
        return HttpResponse.json({ data: null, status_code: 200, msg: '' });
      }),
      http.post(testAppConfig.solanaRpcUrl, ({ request }) => {
        authorizations.push(request.headers.get('authorization'));
        return HttpResponse.json({
          jsonrpc: '2.0',
          id: 1,
          result: {
            context: { slot: 1 },
            value: {
              blockhash: 'EkSnNWid2cvwEVnVx9aBqawnmiCNiDgp3gUdkDPTKN1N',
              lastValidBlockHeight: 2,
            },
          },
        });
      }),
    );
    const container = createComposedContainer(testAppConfig);
    await container.cradle.tokenStore.write({ access: 'owego-access', refresh: 'owego-refresh' });
    await container.cradle.registerPushTokenUseCase.execute();

    const blockhash = await container.cradle.solanaNetworkRepository.getRecentBlockhash();

    expect(blockhash.ok).toBe(true);
    expect(backendAuthorizations).toEqual(['Bearer owego-access']);
    expect(authorizations).toEqual([null]);
  });

  it('builds the deposit use cases from the composed container', () => {
    const container = createComposedContainer(testAppConfig);

    expect(container.cradle.submitExternalDepositUseCase).toBeDefined();
    expect(container.cradle.awaitDepositConfirmationUseCase).toBeDefined();
  });

  it('hands out a wallet that answers unsupported off Android', async () => {
    const container = createComposedContainer(testAppConfig);

    expect(await container.cradle.externalWalletPort.connect()).toEqual({
      ok: true,
      value: { type: 'failed', reason: 'unsupported' },
    });
  });

  it('never reaches a real wallet in preview mode', async () => {
    const container = createComposedContainer({ ...testAppConfig, usePreviewData: true });

    const connected = await container.cradle.externalWalletPort.connect();

    expect(connected).toEqual(expect.objectContaining({ ok: true }));
    expect(transact).not.toHaveBeenCalled();
  });
});
